"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import { detalleOpciones, mxn } from "@/lib/format";
import type { Opciones } from "@/lib/types";
import { btn, btnSec, card, input, td, th } from "@/lib/ui";
import { Aviso, TablaWrap } from "./Kit";

export type ItemEtiqueta = { varianteId: string; nombre: string; marca: string | null; opciones: Opciones; precio: number; codigo: string; copias: number };

type Busqueda = { id: string; nombre: string; marca: string | null; variantes: { id: string; opciones: Opciones; precio: number; codigo_barras: string; stock: number }[] };

export function GeneradorEtiquetas({ inicial }: { inicial: ItemEtiqueta[] }) {
  const supabase = createClient();
  const [cola, setCola] = useState<ItemEtiqueta[]>(inicial);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Busqueda[]>([]);
  const [inicio, setInicio] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    const { data, error: eq } = await supabase
      .from("productos")
      .select("id, nombre, marca, variantes(id, opciones, precio, codigo_barras, stock)")
      .ilike("nombre", `%${q.replace(/[%_]/g, "")}%`)
      .eq("activo", true)
      .limit(15);
    if (eq) return setError(mensajeError(eq));
    setResultados((data ?? []) as unknown as Busqueda[]);
  }

  function agregar(p: Busqueda) {
    setCola((c) => {
      const nuevos = p.variantes
        .filter((v) => !c.some((x) => x.varianteId === v.id))
        .map((v) => ({ varianteId: v.id, nombre: p.nombre, marca: p.marca, opciones: v.opciones, precio: Number(v.precio), codigo: v.codigo_barras, copias: Math.max(1, v.stock) }));
      return [...c, ...nuevos];
    });
  }

  async function generar() {
    setError(null);
    const lista = cola.filter((i) => i.copias > 0);
    if (lista.length === 0) return setError("Agrega productos a la lista");
    setGenerando(true);
    try {
      const { generarPdfEtiquetas } = await import("@/lib/etiquetasPdf");
      const etiquetas = lista.flatMap((i) =>
        Array.from({ length: i.copias }, () => ({
          nombre: `${i.nombre}${i.marca ? ` ${i.marca}` : ""}`,
          detalle: detalleOpciones(i.opciones),
          precio: mxn(i.precio),
          codigo: i.codigo,
        }))
      );
      generarPdfEtiquetas(etiquetas, Number(inicio) || 1).save("etiquetas.pdf");
    } catch (e) {
      setError(mensajeError(e));
    }
    setGenerando(false);
  }

  const total = cola.reduce((s, i) => s + i.copias, 0);

  return (
    <div className="space-y-4 max-w-3xl">
      <form onSubmit={buscar} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto para etiquetar..." className={input} />
        <button className={btn}>Buscar</button>
      </form>
      {resultados.length > 0 && (
        <ul className={`${card} divide-y`}>
          {resultados.map((p) => (
            <li key={p.id} className="p-3 flex items-center justify-between gap-2">
              <span>{p.nombre}{p.marca ? ` · ${p.marca}` : ""} <span className="text-neutral-500 text-sm">({p.variantes.length} variantes)</span></span>
              <button className={btnSec} onClick={() => agregar(p)}>Agregar todas</button>
            </li>
          ))}
        </ul>
      )}

      <TablaWrap>
        <thead><tr><th className={th}>Producto</th><th className={th}>Variante</th><th className={th}>Código</th><th className={th}>Copias</th><th className={th}></th></tr></thead>
        <tbody className="divide-y">
          {cola.length === 0 && <tr><td className={td} colSpan={5}>La lista está vacía.</td></tr>}
          {cola.map((i) => (
            <tr key={i.varianteId}>
              <td className={td}>{i.nombre}</td><td className={td}>{detalleOpciones(i.opciones)}</td><td className={`${td} font-mono`}>{i.codigo}</td>
              <td className={td}>
                <input type="number" min="0" value={i.copias} onChange={(e) => setCola((c) => c.map((x) => (x.varianteId === i.varianteId ? { ...x, copias: Math.max(0, parseInt(e.target.value, 10) || 0) } : x)))} className="w-20 border border-neutral-300 rounded-lg px-2 py-1 text-base" />
              </td>
              <td className={td}><button className="text-neutral-400 cursor-pointer" onClick={() => setCola((c) => c.filter((x) => x.varianteId !== i.varianteId))} aria-label="Quitar">✕</button></td>
            </tr>
          ))}
        </tbody>
      </TablaWrap>

      <div className="flex gap-3 items-end flex-wrap">
        <label className="text-sm text-neutral-600">Empezar en la etiqueta (1–30)
          <input type="number" min="1" max="30" value={inicio} onChange={(e) => setInicio(e.target.value)} className={`${input} w-32`} />
        </label>
        <button className={btn} disabled={generando} onClick={generar}>{generando ? "Generando..." : `Generar PDF (${total} etiquetas)`}</button>
      </div>
      <p className="text-xs text-neutral-500">Hoja Carta, 3 × 10 etiquetas (formato Avery 5160). “Empezar en” sirve para reutilizar una hoja usada a medias. Al imprimir, elige tamaño real (100%), sin ajustar a la página.</p>
      {error && <Aviso>{error}</Aviso>}
    </div>
  );
}
