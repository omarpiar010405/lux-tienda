"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import { obtenerTicket } from "@/lib/ticket";
import { totalCarrito, redondear } from "@/lib/calculos";
import { CANALES, METODOS, detalleOpciones, mxn } from "@/lib/format";
import type { Canal, ItemCarrito, MetodoPago, ResultadoBusqueda, TicketData } from "@/lib/types";
import { btn, btnSec, card, input } from "@/lib/ui";
import { Aviso } from "./Kit";
import { ScannerCamara } from "./ScannerCamara";
import { TicketView } from "./TicketView";

type PagoUI = { metodo: MetodoPago; monto: string };

export function Pos({ tienda }: { tienda: string }) {
  const supabase = useMemo(() => createClient(), []);
  const campo = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [canal, setCanal] = useState<Canal>("mostrador");
  const [cliente, setCliente] = useState("");
  const [pagos, setPagos] = useState<PagoUI[]>([{ metodo: "efectivo", monto: "" }]);
  const [recibido, setRecibido] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cobrando, setCobrando] = useState(false);
  const [camara, setCamara] = useState(false);
  const [ticket, setTicket] = useState<TicketData | null>(null);

  const total = totalCarrito(carrito);
  const unPago = pagos.length === 1;
  const pagosFinales = unPago ? [{ metodo: pagos[0].metodo, monto: total }] : pagos.map((p) => ({ metodo: p.metodo, monto: Number(p.monto) || 0 }));
  const pagado = redondear(pagosFinales.reduce((s, p) => s + p.monto, 0));
  const cambio = unPago && pagos[0].metodo === "efectivo" && Number(recibido) > 0 ? redondear(Number(recibido) - total) : null;

  const agregar = useCallback((r: ResultadoBusqueda) => {
    if (r.stock <= 0) return;
    setCarrito((c) => {
      const i = c.findIndex((x) => x.variante_id === r.variante_id);
      if (i >= 0) return c.map((x, j) => (j === i ? { ...x, cantidad: Math.min(x.stock, x.cantidad + 1) } : x));
      return [...c, { variante_id: r.variante_id, nombre: r.nombre, marca: r.marca, opciones: r.opciones, precio: Number(r.precio), stock: r.stock, cantidad: 1, descuento: 0 }];
    });
  }, []);

  async function buscar(texto: string): Promise<ResultadoBusqueda[]> {
    const { data, error: e } = await supabase.rpc("pos_buscar", { p_q: texto, p_limit: 20 });
    if (e) {
      setError(mensajeError(e));
      return [];
    }
    return ((data ?? []) as ResultadoBusqueda[]).map((r) => ({ ...r, precio: Number(r.precio) }));
  }

  // Búsqueda mientras se escribe
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const id = setTimeout(async () => {
      setResultados(await buscar(t));
      setBuscando(false);
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Un código de barras exacto (lector USB o cámara) se agrega solo
  async function procesarCodigo(codigo: string) {
    const t = codigo.trim();
    if (!t) return;
    setError(null);
    const r = await buscar(t);
    const exacto = r.find((x) => x.codigo_barras.toLowerCase() === t.toLowerCase());
    if (exacto) {
      if (exacto.stock <= 0) setError(`Sin existencias: ${exacto.nombre} ${detalleOpciones(exacto.opciones)}`);
      else agregar(exacto);
      setQ("");
      setResultados([]);
    } else {
      setResultados(r);
      if (r.length === 0) setError(`No se encontró: ${t}`);
    }
  }

  const cambiarItem = (id: string, cambios: Partial<ItemCarrito>) =>
    setCarrito((c) => c.map((x) => (x.variante_id === id ? { ...x, ...cambios } : x)));

  async function cobrar() {
    setError(null);
    if (carrito.length === 0) return setError("El carrito está vacío");
    if (pagado !== total) return setError(`Los pagos (${mxn(pagado)}) deben sumar el total (${mxn(total)})`);
    setCobrando(true);
    const { data, error: e } = await supabase.rpc("registrar_venta", {
      p_canal: canal,
      p_items: carrito.map((i) => ({ variante_id: i.variante_id, cantidad: i.cantidad, descuento: i.descuento })),
      p_pagos: pagosFinales.filter((p) => p.monto > 0),
      p_cliente: cliente.trim() || null,
      p_notas: null,
    });
    if (e) {
      setCobrando(false);
      return setError(mensajeError(e));
    }
    const t = await obtenerTicket(supabase, Number(data));
    setTicket(t);
    setCarrito([]);
    setCliente("");
    setPagos([{ metodo: "efectivo", monto: "" }]);
    setRecibido("");
    setQ("");
    setResultados([]);
    setCobrando(false);
  }

  function nuevaVenta() {
    setTicket(null);
    setTimeout(() => campo.current?.focus(), 50);
  }

  if (ticket) {
    return (
      <div className="max-w-md mx-auto space-y-3">
        <Aviso tipo="ok">Venta #{ticket.folio} registrada.</Aviso>
        <TicketView ticket={ticket} tienda={tienda} />
        <button className={`${btn} w-full py-3 no-imprimir`} onClick={nuevaVenta}>Nueva venta</button>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {camara && (
        <ScannerCamara
          onCodigo={(c) => {
            procesarCodigo(c);
          }}
          onCerrar={() => setCamara(false)}
        />
      )}

      {/* Búsqueda */}
      <section className="space-y-3">
        <div className="flex gap-2">
          <input
            ref={campo}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && procesarCodigo(q)}
            placeholder="Buscar o escanear código..."
            className={input}
            inputMode="search"
          />
          <button className={btnSec} onClick={() => setCamara(true)} aria-label="Escanear con la cámara">📷</button>
        </div>

        {error && <Aviso>{error}</Aviso>}
        {buscando && <p className="text-sm text-neutral-500">Buscando...</p>}

        <ul className="space-y-2">
          {resultados.map((r) => (
            <li key={r.variante_id}>
              <button
                disabled={r.stock <= 0}
                onClick={() => agregar(r)}
                className={`${card} w-full flex items-center gap-3 p-2 text-left disabled:opacity-50 cursor-pointer`}
              >
                {r.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.foto} alt="" className="w-14 h-14 rounded-lg object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-neutral-100" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.nombre}{r.marca ? ` · ${r.marca}` : ""}</p>
                  <p className="text-sm text-neutral-500">{detalleOpciones(r.opciones)} · {r.categoria}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{mxn(r.precio)}</p>
                  <p className={r.stock <= 0 ? "text-red-600" : "text-neutral-500"}>{r.stock <= 0 ? "Agotado" : `${r.stock} pzs`}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Carrito y cobro */}
      <section className={`${card} p-3 space-y-3 self-start`}>
        <h2 className="font-semibold">Venta actual</h2>
        {carrito.length === 0 && <p className="text-sm text-neutral-500">Agrega productos buscando arriba.</p>}

        <ul className="divide-y">
          {carrito.map((i) => (
            <li key={i.variante_id} className="py-2 space-y-1">
              <div className="flex justify-between gap-2">
                <p className="font-medium text-sm">{i.nombre} <span className="text-neutral-500 font-normal">{detalleOpciones(i.opciones)}</span></p>
                <button className="text-neutral-400 cursor-pointer" onClick={() => setCarrito((c) => c.filter((x) => x.variante_id !== i.variante_id))} aria-label="Quitar">✕</button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button className={btnSec} onClick={() => cambiarItem(i.variante_id, { cantidad: Math.max(1, i.cantidad - 1) })}>−</button>
                <span className="w-6 text-center">{i.cantidad}</span>
                <button className={btnSec} disabled={i.cantidad >= i.stock} onClick={() => cambiarItem(i.variante_id, { cantidad: Math.min(i.stock, i.cantidad + 1) })}>+</button>
                <span className="text-neutral-500">× {mxn(i.precio)}</span>
                <label className="ml-auto flex items-center gap-1 text-neutral-500">
                  Desc. $
                  <input
                    type="number" inputMode="decimal" min="0" value={i.descuento || ""}
                    onChange={(e) => cambiarItem(i.variante_id, { descuento: Math.max(0, Math.min(i.precio * i.cantidad, Number(e.target.value) || 0)) })}
                    className="w-20 border border-neutral-300 rounded-lg px-2 py-1 text-base"
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex justify-between text-lg font-semibold border-t pt-2">
          <span>Total</span><span>{mxn(total)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm text-neutral-600">Canal
            <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)} className={input}>
              {CANALES.map((c) => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
            </select>
          </label>
          <label className="text-sm text-neutral-600">Cliente (opcional)
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} className={input} />
          </label>
        </div>

        <div className="space-y-2">
          {pagos.map((p, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select value={p.metodo} onChange={(e) => setPagos((ps) => ps.map((x, j) => (j === idx ? { ...x, metodo: e.target.value as MetodoPago } : x)))} className={input}>
                {METODOS.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
              </select>
              {!unPago && (
                <>
                  <input type="number" inputMode="decimal" min="0" placeholder="Monto" value={p.monto} onChange={(e) => setPagos((ps) => ps.map((x, j) => (j === idx ? { ...x, monto: e.target.value } : x)))} className={input} />
                  <button className="text-neutral-400 cursor-pointer" onClick={() => setPagos((ps) => ps.filter((_, j) => j !== idx))} aria-label="Quitar pago">✕</button>
                </>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button className="text-sm underline cursor-pointer" onClick={() => setPagos((ps) => [...ps.map((x, j) => (j === 0 && ps.length === 1 ? { ...x, monto: String(total) } : x)), { metodo: "tarjeta", monto: "" }])}>
              Dividir pago
            </button>
            {unPago && pagos[0].metodo === "efectivo" && (
              <label className="text-sm text-neutral-600 flex items-center gap-2">Recibido
                <input type="number" inputMode="decimal" min="0" value={recibido} onChange={(e) => setRecibido(e.target.value)} className="w-28 border border-neutral-300 rounded-lg px-2 py-1 text-base" />
              </label>
            )}
          </div>
          {cambio != null && <p className={`text-sm ${cambio < 0 ? "text-red-600" : "text-emerald-700"}`}>{cambio < 0 ? `Faltan ${mxn(-cambio)}` : `Cambio: ${mxn(cambio)}`}</p>}
          {!unPago && pagado !== total && <p className="text-sm text-red-600">Pagos {mxn(pagado)} · faltan {mxn(total - pagado)}</p>}
        </div>

        <button className={`${btn} w-full py-3 text-base`} disabled={cobrando || carrito.length === 0} onClick={cobrar}>
          {cobrando ? "Registrando..." : `Cobrar ${mxn(total)}`}
        </button>
      </section>
    </div>
  );
}
