"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import { costoPromedio } from "@/lib/calculos";
import { detalleOpciones, etiquetaOpcion, hoyMX, mxn } from "@/lib/format";
import type { Opciones } from "@/lib/types";
import { btn, btnSec, card, input } from "@/lib/ui";
import { Aviso } from "./Kit";

type V = { id: string; opciones: Opciones; stock: number; precio: number; costo: number | null };
type Fila = { piezas: string; costo: string; precio: string };
type Nueva = { valores: string[]; piezas: string; costo: string; precio: string };

export function FormularioCompra({
  producto, variantes, proveedores,
}: {
  producto: { id: string; nombre: string; marca: string | null; ejes: string[] };
  variantes: V[];
  proveedores: string[];
}) {
  const router = useRouter();
  const [fecha, setFecha] = useState(hoyMX());
  const [proveedor, setProveedor] = useState("");
  const [notas, setNotas] = useState("");
  const [filas, setFilas] = useState<Record<string, Fila>>(
    Object.fromEntries(variantes.map((v) => [v.id, { piezas: "", costo: "", precio: String(v.precio) }]))
  );
  const [nuevas, setNuevas] = useState<Nueva[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const editar = (id: string, c: Partial<Fila>) => setFilas((f) => ({ ...f, [id]: { ...f[id], ...c } }));
  const editarNueva = (i: number, c: Partial<Nueva>) => setNuevas((n) => n.map((x, j) => (j === i ? { ...x, ...c } : x)));

  const inversion =
    variantes.reduce((s, v) => s + (parseInt(filas[v.id].piezas, 10) || 0) * (Number(filas[v.id].costo) || 0), 0) +
    nuevas.reduce((s, n) => s + (parseInt(n.piezas, 10) || 0) * (Number(n.costo) || 0), 0);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();

    const items: { variante_id: string; cantidad: number; costo_unitario: number; precio_venta: number }[] = [];
    for (const v of variantes) {
      const f = filas[v.id];
      const cant = parseInt(f.piezas, 10) || 0;
      if (cant <= 0) continue;
      if (f.costo === "" || Number(f.costo) < 0) return setError(`Falta el costo de ${detalleOpciones(v.opciones) || "la variante"}`);
      items.push({ variante_id: v.id, cantidad: cant, costo_unitario: Number(f.costo), precio_venta: Number(f.precio) || v.precio });
    }

    setGuardando(true);
    try {
      for (const n of nuevas) {
        const cant = parseInt(n.piezas, 10) || 0;
        if (n.valores.some((x) => !x.trim())) throw new Error("Llena todos los datos de las variantes nuevas");
        if (cant <= 0 || n.costo === "" || !(Number(n.precio) > 0)) throw new Error("Las variantes nuevas necesitan piezas, costo y precio");
        const { data, error: eV } = await supabase
          .from("variantes")
          .insert({ producto_id: producto.id, opciones: Object.fromEntries(producto.ejes.map((k, j) => [k, n.valores[j].trim()])), precio: Number(n.precio) })
          .select("id")
          .single();
        if (eV) throw eV;
        items.push({ variante_id: data.id, cantidad: cant, costo_unitario: Number(n.costo), precio_venta: Number(n.precio) });
      }
      if (items.length === 0) throw new Error("Escribe las piezas de al menos una variante");

      const { error: eC } = await supabase.rpc("registrar_compra", { p_fecha: fecha, p_proveedor: proveedor, p_notas: notas, p_items: items });
      if (eC) throw eC;
      router.push(`/admin/productos/${producto.id}`);
      router.refresh();
    } catch (err) {
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  const peq = "border border-neutral-300 rounded-lg px-3 py-2 bg-white text-base";

  return (
    <form onSubmit={guardar} className="space-y-4 max-w-3xl">
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm text-neutral-600">Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={input} /></label>
        <label className="text-sm text-neutral-600">Proveedor
          <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} list="lista-proveedores" className={input} />
          <datalist id="lista-proveedores">{proveedores.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
        <label className="text-sm text-neutral-600">Notas<input value={notas} onChange={(e) => setNotas(e.target.value)} className={input} /></label>
      </div>

      <div className="space-y-2">
        {variantes.map((v) => {
          const f = filas[v.id];
          const cant = parseInt(f.piezas, 10) || 0;
          const nuevo = cant > 0 && f.costo !== "" ? costoPromedio(v.stock, v.costo, cant, Number(f.costo)) : null;
          return (
            <div key={v.id} className={`${card} p-3 space-y-2`}>
              <div className="flex justify-between gap-2 flex-wrap">
                <p className="font-medium">{detalleOpciones(v.opciones) || "Única"}</p>
                <p className="text-sm text-neutral-500">Hay {v.stock} pzas · costo prom. {v.costo != null ? mxn(v.costo) : "—"}</p>
              </div>
              <div className="flex gap-2 flex-wrap items-end">
                <label className="text-xs text-neutral-500">Piezas<input type="number" inputMode="numeric" min="0" value={f.piezas} onChange={(e) => editar(v.id, { piezas: e.target.value })} className={`${peq} w-24 block`} /></label>
                <label className="text-xs text-neutral-500">Costo c/u<input type="number" inputMode="decimal" min="0" step="0.01" value={f.costo} onChange={(e) => editar(v.id, { costo: e.target.value })} className={`${peq} w-28 block`} /></label>
                <label className="text-xs text-neutral-500">Precio venta<input type="number" inputMode="decimal" min="0" step="0.01" value={f.precio} onChange={(e) => editar(v.id, { precio: e.target.value })} className={`${peq} w-28 block`} /></label>
                {nuevo != null && <p className="text-sm text-neutral-600 pb-2">Nuevo costo promedio: <b>{mxn(nuevo)}</b></p>}
              </div>
            </div>
          );
        })}

        {nuevas.map((n, i) => (
          <div key={i} className={`${card} p-3 flex gap-2 flex-wrap items-end`}>
            {producto.ejes.map((k, j) => (
              <label key={k} className="text-xs text-neutral-500">{etiquetaOpcion(k)}
                <input value={n.valores[j]} onChange={(e) => editarNueva(i, { valores: n.valores.map((x, y) => (y === j ? e.target.value : x)) })} className={`${peq} w-28 block`} />
              </label>
            ))}
            <label className="text-xs text-neutral-500">Piezas<input type="number" inputMode="numeric" min="0" value={n.piezas} onChange={(e) => editarNueva(i, { piezas: e.target.value })} className={`${peq} w-24 block`} /></label>
            <label className="text-xs text-neutral-500">Costo c/u<input type="number" inputMode="decimal" min="0" step="0.01" value={n.costo} onChange={(e) => editarNueva(i, { costo: e.target.value })} className={`${peq} w-28 block`} /></label>
            <label className="text-xs text-neutral-500">Precio venta<input type="number" inputMode="decimal" min="0" step="0.01" value={n.precio} onChange={(e) => editarNueva(i, { precio: e.target.value })} className={`${peq} w-28 block`} /></label>
            <button type="button" className="text-neutral-400 pb-2 cursor-pointer" onClick={() => setNuevas((x) => x.filter((_, j) => j !== i))} aria-label="Quitar">✕</button>
          </div>
        ))}
        <button type="button" className="text-sm underline cursor-pointer" onClick={() => setNuevas((n) => [...n, { valores: producto.ejes.map(() => ""), piezas: "", costo: "", precio: String(variantes[0]?.precio ?? "") }])}>
          + Variante que no existe todavía
        </button>
      </div>

      <p className="text-sm text-neutral-600">Inversión de esta compra: <b>{mxn(inversion)}</b></p>
      {error && <Aviso>{error}</Aviso>}
      <div className="flex gap-2">
        <button disabled={guardando} className={`${btn} py-3`}>{guardando ? "Guardando..." : "Registrar compra"}</button>
        <button type="button" className={btnSec} onClick={() => router.back()}>Cancelar</button>
      </div>
    </form>
  );
}
