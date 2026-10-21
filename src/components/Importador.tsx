"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import { descargarTexto } from "@/lib/csv";
import { redondear } from "@/lib/calculos";
import { fechaCorta, mxn } from "@/lib/format";
import {
  agruparCompras, buscarProducto, claveVariante, normalizar, opcionesDe, plantillaCSV, resolverVariante,
  validarCompras, validarVentas, type FilaCompra, type FilaVenta, type ProductoCatalogo,
} from "@/lib/importar";
import type { Categoria } from "@/lib/types";
import { btn, btnSec, card, td, th } from "@/lib/ui";
import { Aviso, TablaWrap } from "./Kit";

type Tipo = "compras" | "ventas";
type FilaVentaR = FilaVenta & { varianteId: string | null };

export function Importador({ categorias, productos }: { categorias: Categoria[]; productos: ProductoCatalogo[] }) {
  const [tipo, setTipo] = useState<Tipo>("compras");
  const [crudo, setCrudo] = useState<Record<string, string>[] | null>(null);
  const [archivo, setArchivo] = useState("");
  const [soloValidas, setSoloValidas] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [progreso, setProgreso] = useState<{ hecho: number; total: number } | null>(null);
  const [terminado, setTerminado] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const compras: FilaCompra[] = useMemo(() => (crudo && tipo === "compras" ? validarCompras(crudo, categorias) : []), [crudo, tipo, categorias]);
  const ventas: FilaVentaR[] = useMemo(() => {
    if (!crudo || tipo !== "ventas") return [];
    return validarVentas(crudo).map((f) => {
      if (f.errores.length > 0) return { ...f, varianteId: null };
      const r = resolverVariante(f, productos);
      return { ...f, varianteId: r.varianteId, errores: r.error ? [r.error] : [] };
    });
  }, [crudo, tipo, productos]);

  const filas = tipo === "compras" ? compras : ventas;
  const conError = filas.filter((f) => f.errores.length > 0).length;
  const validas = filas.length - conError;

  function cargar(file: File | undefined) {
    setLog([]); setTerminado(false); setProgreso(null); setErrorGlobal(null);
    if (!file) return;
    setArchivo(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => normalizar(h).replace(/\s+/g, "_"),
      complete: (r) => {
        if (r.data.length === 0) return setErrorGlobal("El archivo no tiene filas.");
        setCrudo(r.data);
      },
      error: (e) => setErrorGlobal(e.message),
    });
  }

  async function importarCompras() {
    const supabase = createClient();
    const grupos = agruparCompras(compras);
    setProgreso({ hecho: 0, total: grupos.length });
    const lineas: string[] = [];
    const existentes = [...productos];

    for (let i = 0; i < grupos.length; i++) {
      const g = grupos[i];
      try {
        let productoId = buscarProducto(g, existentes)?.id ?? null;

        if (!productoId) {
          const vistas = new Map<string, FilaCompra>();
          g.filas.forEach((f) => vistas.set(claveVariante(g.categoria, opcionesDe(g.categoria, f.valores)), f));
          const { data, error } = await supabase.rpc("crear_producto_con_compra", {
            p_categoria: g.categoria.id,
            p_nombre: g.nombre,
            p_precio: g.filas[0].precio,
            p_variantes: [...vistas.values()].map((f) => ({ opciones: opcionesDe(g.categoria, f.valores), cantidad: 0, precio: f.precio, codigo_barras: f.codigo })),
            p_marca: g.marca,
            p_seccion: g.seccion,
          });
          if (error) throw error;
          productoId = data as string;
          existentes.push({ id: productoId, nombre: g.nombre, marca: g.marca || null, categoria: g.categoria, variantes: [] });
        }

        const { data: vars, error: eV } = await supabase.from("variantes").select("id, opciones").eq("producto_id", productoId);
        if (eV) throw eV;
        const mapa = new Map<string, string>((vars ?? []).map((v) => [claveVariante(g.categoria, v.opciones), v.id]));

        const porLote = new Map<string, { fecha: string; proveedor: string; items: { variante_id: string; cantidad: number; costo_unitario: number; precio_venta: number }[] }>();
        for (const f of g.filas) {
          const opciones = opcionesDe(g.categoria, f.valores);
          const clave = claveVariante(g.categoria, opciones);
          let varId = mapa.get(clave);
          if (!varId) {
            const fila: Record<string, unknown> = { producto_id: productoId, opciones, precio: f.precio };
            if (f.codigo) fila.codigo_barras = f.codigo;
            const { data, error } = await supabase.from("variantes").insert(fila).select("id").single();
            if (error) throw error;
            varId = data.id as string;
            mapa.set(clave, varId);
          }
          const k = `${f.fecha}|${normalizar(f.proveedor)}`;
          const lote = porLote.get(k) ?? { fecha: f.fecha, proveedor: f.proveedor, items: [] };
          lote.items.push({ variante_id: varId, cantidad: f.piezas, costo_unitario: f.costo, precio_venta: f.precio });
          porLote.set(k, lote);
        }

        for (const l of porLote.values()) {
          const { error } = await supabase.rpc("registrar_compra", { p_fecha: l.fecha, p_proveedor: l.proveedor, p_notas: "Importación CSV", p_items: l.items });
          if (error) throw error;
        }
        lineas.push(`✔ ${g.nombre}${g.marca ? ` (${g.marca})` : ""}: ${g.filas.length} filas`);
      } catch (e) {
        lineas.push(`✖ ${g.nombre}: ${mensajeError(e)}`);
      }
      setProgreso({ hecho: i + 1, total: grupos.length });
      setLog([...lineas]);
    }
  }

  async function importarVentas() {
    const supabase = createClient();
    const lista = ventas.filter((v) => v.errores.length === 0 && v.varianteId);
    setProgreso({ hecho: 0, total: lista.length });
    const lineas: string[] = [];
    for (let i = 0; i < lista.length; i++) {
      const f = lista[i];
      const item: Record<string, unknown> = { variante_id: f.varianteId, cantidad: f.piezas, precio_unitario: f.precio };
      if (f.costo != null) item.costo_unitario = f.costo;
      const { error } = await supabase.rpc("registrar_venta", {
        p_canal: f.canal,
        p_items: [item],
        p_pagos: [{ metodo: f.metodo, monto: redondear(f.piezas * f.precio) }],
        p_cliente: null,
        p_notas: "Importación CSV",
        p_fecha: `${f.fecha}T12:00:00-06:00`,
      });
      lineas.push(error ? `✖ Fila ${f.linea} (${f.nombre}): ${mensajeError(error)}` : `✔ Fila ${f.linea}: ${f.nombre}`);
      setProgreso({ hecho: i + 1, total: lista.length });
      setLog([...lineas]);
    }
  }

  async function importar() {
    if (conError > 0 && !soloValidas) return;
    const aviso = tipo === "compras"
      ? "Importar suma piezas al inventario. Si ya importaste este archivo, se duplicarían. ¿Continuar?"
      : "Cada fila crea una venta histórica y descuenta inventario. Si ya la importaste, se duplicaría. ¿Continuar?";
    if (!confirm(aviso)) return;
    setTerminado(false); setLog([]);
    if (tipo === "compras") await importarCompras(); else await importarVentas();
    setTerminado(true);
  }

  const pestana = (t: Tipo) => (tipo === t ? btn : btnSec);
  const cambiarTipo = (t: Tipo) => { setTipo(t); setCrudo(null); setArchivo(""); setLog([]); setProgreso(null); setTerminado(false); setErrorGlobal(null); };
  const importando = progreso != null && !terminado;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className={pestana("compras")} onClick={() => cambiarTipo("compras")}>Compras / inventario</button>
        <button className={pestana("ventas")} onClick={() => cambiarTipo("ventas")}>Ventas históricas</button>
      </div>

      <div className={`${card} p-4 space-y-2 text-sm`}>
        <p className="font-medium">Cómo importar</p>
        <ol className="list-decimal pl-5 space-y-1 text-neutral-700">
          <li>Descarga la plantilla y copia ahí los datos de tu Excel (una fila por talla o variante). No modifiques tu archivo original.</li>
          <li>En Excel o Google Sheets: Archivo → Descargar/Guardar como → CSV.</li>
          <li>Sube el CSV, revisa la vista previa (las filas con error se marcan) y confirma.</li>
          {tipo === "ventas" && <li>Importa primero las compras: las ventas necesitan que el producto y su talla ya existan.</li>}
        </ol>
        <button className={btnSec} onClick={() => descargarTexto(`plantilla_${tipo}.csv`, plantillaCSV(tipo))}>Descargar plantilla de {tipo}</button>
      </div>

      <input type="file" accept=".csv,text/csv" onChange={(e) => cargar(e.target.files?.[0])} />
      {errorGlobal && <Aviso>{errorGlobal}</Aviso>}

      {crudo && (
        <>
          <p className="text-sm">
            <b>{archivo}</b>: {filas.length} filas · <span className="text-emerald-700">{validas} válidas</span> · <span className={conError ? "text-red-600" : ""}>{conError} con error</span>
          </p>

          <div className="max-h-96 overflow-y-auto">
            <TablaWrap>
              <thead className="sticky top-0 bg-white"><tr><th className={th}>Fila</th><th className={th}>Estado</th><th className={th}>Fecha</th><th className={th}>Producto</th><th className={th}>Variante</th><th className={th}>Pzs</th>{tipo === "compras" && <th className={th}>Costo</th>}<th className={th}>Precio</th></tr></thead>
              <tbody className="divide-y">
                {filas.slice(0, 300).map((f) => (
                  <tr key={f.linea} className={f.errores.length ? "bg-red-50" : ""}>
                    <td className={td}>{f.linea}</td>
                    <td className={`${td} whitespace-normal text-xs`}>{f.errores.length ? <span className="text-red-700">{f.errores.join(" · ")}</span> : <span className="text-emerald-700">OK</span>}</td>
                    <td className={td}>{f.fecha ? fechaCorta(f.fecha) : "—"}</td>
                    <td className={td}>{f.nombre}{f.marca ? ` · ${f.marca}` : ""}</td>
                    <td className={td}>{f.valores.join(" / ")}</td>
                    <td className={td}>{f.piezas}</td>
                    {tipo === "compras" && <td className={td}>{mxn((f as FilaCompra).costo)}</td>}
                    <td className={td}>{mxn(f.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </TablaWrap>
          </div>
          {filas.length > 300 && <p className="text-xs text-neutral-500">Se muestran las primeras 300 filas; se importan todas las válidas.</p>}

          {conError > 0 && (
            <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={soloValidas} onChange={(e) => setSoloValidas(e.target.checked)} /> Importar solo las {validas} filas válidas (corregiré las demás después)</label>
          )}
          <button className={btn} disabled={importando || validas === 0 || (conError > 0 && !soloValidas)} onClick={importar}>
            {importando ? `Importando ${progreso!.hecho}/${progreso!.total}...` : `Importar ${validas} filas`}
          </button>
        </>
      )}

      {log.length > 0 && (
        <div className={`${card} p-3 text-sm space-y-1 max-h-64 overflow-y-auto`}>
          {terminado && <Aviso tipo="ok">Terminó la importación. Revisa el resultado abajo.</Aviso>}
          {log.map((l, i) => <p key={i} className={l.startsWith("✖") ? "text-red-700" : "text-neutral-700"}>{l}</p>)}
        </div>
      )}
    </div>
  );
}
