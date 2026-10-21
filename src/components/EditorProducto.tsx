"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen } from "@/lib/imagen";
import { mensajeError } from "@/lib/errores";
import { SECCIONES, detalleOpciones, etiquetaOpcion, mxn } from "@/lib/format";
import type { Opciones, Seccion } from "@/lib/types";
import { btn, btnSec, card, input } from "@/lib/ui";
import { Aviso, Seccion as Bloque } from "./Kit";

type VarianteUI = { id: string; opciones: Opciones; precio: number; stock: number; codigo: string; activo: boolean; costo: number | null };
export type DatosEditor = {
  id: string; nombre: string; descripcion: string; marca: string; seccion: Seccion; activo: boolean;
  categoria: { id: string; nombre: string; opciones: string[] };
  fotos: { id: string; url: string; orden: number }[];
  variantes: VarianteUI[];
};

export function EditorProducto({ datos }: { datos: DatosEditor }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const aviso = (tipo: "ok" | "error", texto: string) => setMsg({ tipo, texto });
  const supabase = createClient();

  // ---- datos generales
  const [nombre, setNombre] = useState(datos.nombre);
  const [marca, setMarca] = useState(datos.marca);
  const [descripcion, setDescripcion] = useState(datos.descripcion);
  const [seccion, setSeccion] = useState<Seccion>(datos.seccion);
  const [activo, setActivo] = useState(datos.activo);

  async function guardarDatos() {
    if (!nombre.trim()) return aviso("error", "El nombre no puede quedar vacío");
    const { error } = await supabase.from("productos").update({ nombre: nombre.trim(), marca: marca.trim() || null, descripcion: descripcion.trim() || null, seccion, activo }).eq("id", datos.id);
    if (error) return aviso("error", mensajeError(error));
    aviso("ok", "Datos guardados");
    router.refresh();
  }

  // ---- fotos
  const [subiendo, setSubiendo] = useState(false);
  async function agregarFotos(files: FileList | null) {
    if (!files?.length) return;
    setSubiendo(true);
    try {
      let orden = Math.max(0, ...datos.fotos.map((f) => f.orden));
      for (const original of Array.from(files)) {
        const archivo = await comprimirImagen(original);
        const ext = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
        const ruta = `${crypto.randomUUID()}.${ext}`;
        const { error: e1 } = await supabase.storage.from("productos").upload(ruta, archivo, { contentType: archivo.type });
        if (e1) throw e1;
        const url = supabase.storage.from("productos").getPublicUrl(ruta).data.publicUrl;
        const { error: e2 } = await supabase.from("producto_fotos").insert({ producto_id: datos.id, url, orden: ++orden });
        if (e2) throw e2;
      }
      aviso("ok", "Fotos agregadas");
      router.refresh();
    } catch (e) {
      aviso("error", mensajeError(e));
    }
    setSubiendo(false);
  }

  async function quitarFoto(f: { id: string; url: string }) {
    if (!confirm("¿Quitar esta foto?")) return;
    const { error } = await supabase.from("producto_fotos").delete().eq("id", f.id);
    if (error) return aviso("error", mensajeError(error));
    const ruta = f.url.split("/productos/")[1];
    if (ruta) await supabase.storage.from("productos").remove([ruta]);
    router.refresh();
  }

  // ---- variantes
  const [nuevos, setNuevos] = useState<string[]>(datos.categoria.opciones.slice(0, 2).map(() => ""));
  const [nuevoPrecio, setNuevoPrecio] = useState(String(datos.variantes[0]?.precio ?? ""));

  async function agregarVariante() {
    const ejes = datos.categoria.opciones.slice(0, 2);
    if (nuevos.some((v) => !v.trim())) return aviso("error", `Llena ${ejes.map(etiquetaOpcion).join(" y ").toLowerCase()}`);
    if (!(Number(nuevoPrecio) > 0)) return aviso("error", "Precio inválido");
    const { error } = await supabase.from("variantes").insert({
      producto_id: datos.id,
      opciones: Object.fromEntries(ejes.map((k, j) => [k, nuevos[j].trim()])),
      precio: Number(nuevoPrecio),
    });
    if (error) return aviso("error", mensajeError(error));
    setNuevos(ejes.map(() => ""));
    aviso("ok", "Variante agregada. Registra una compra para darle existencias y costo.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}

      <section className={`${card} p-4 space-y-3`}>
        <h2 className="font-semibold">Datos</h2>
        <p className="text-sm text-neutral-500">Categoría: {datos.categoria.nombre} (no se puede cambiar: define los atributos de las variantes)</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm text-neutral-600">Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} /></label>
          <label className="text-sm text-neutral-600">Marca<input value={marca} onChange={(e) => setMarca(e.target.value)} className={input} /></label>
          <label className="text-sm text-neutral-600">Sección
            <select value={seccion} onChange={(e) => setSeccion(e.target.value as Seccion)} className={input}>
              {SECCIONES.map((s) => <option key={s.valor} value={s.valor}>{s.etiqueta}</option>)}
            </select>
          </label>
          <label className="text-sm flex items-center gap-2 pt-6"><input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Visible (en POS y catálogo)</label>
          <label className="text-sm text-neutral-600 sm:col-span-2">Descripción<textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} className={input} /></label>
        </div>
        <button className={btn} onClick={guardarDatos}>Guardar datos</button>
      </section>

      <Bloque titulo="Fotos">
        <div className="flex gap-3 flex-wrap">
          {datos.fotos.map((f) => (
            <div key={f.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" className="w-24 h-24 rounded-lg object-cover" />
              <button onClick={() => quitarFoto(f)} className="absolute -top-2 -right-2 bg-white border rounded-full w-6 h-6 text-xs cursor-pointer" aria-label="Quitar foto">✕</button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" multiple disabled={subiendo} onChange={(e) => agregarFotos(e.target.files)} />
        {subiendo && <p className="text-sm text-neutral-500">Subiendo...</p>}
      </Bloque>

      <Bloque titulo="Variantes">
        <div className="space-y-2">
          {datos.variantes.map((v) => (
            <FilaVariante key={v.id} v={v} avisar={aviso} />
          ))}
        </div>

        <div className={`${card} p-3 space-y-2`}>
          <p className="text-sm font-medium">Agregar variante nueva</p>
          <div className="flex gap-2 flex-wrap items-center">
            {datos.categoria.opciones.slice(0, 2).map((k, j) => (
              <input key={k} value={nuevos[j]} onChange={(e) => setNuevos((n) => n.map((x, i) => (i === j ? e.target.value : x)))} placeholder={etiquetaOpcion(k)} className="w-28 border border-neutral-300 rounded-lg px-3 py-2 bg-white text-base" />
            ))}
            <input type="number" inputMode="decimal" min="0" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} placeholder="Precio" className="w-28 border border-neutral-300 rounded-lg px-3 py-2 bg-white text-base" />
            <button className={btnSec} onClick={agregarVariante}>Agregar</button>
          </div>
        </div>
      </Bloque>
    </div>
  );
}

function FilaVariante({ v, avisar }: { v: VarianteUI; avisar: (t: "ok" | "error", m: string) => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [precio, setPrecio] = useState(String(v.precio));
  const [codigo, setCodigo] = useState(v.codigo);
  const [ajustando, setAjustando] = useState(false);
  const [real, setReal] = useState(String(v.stock));
  const [nota, setNota] = useState("");

  const cambio = Number(precio) !== v.precio || codigo.trim() !== v.codigo;

  async function guardar() {
    if (!(Number(precio) > 0)) return avisar("error", "Precio inválido");
    const { error } = await supabase.from("variantes").update({ precio: Number(precio), codigo_barras: codigo.trim() }).eq("id", v.id);
    if (error) return avisar("error", mensajeError(error));
    avisar("ok", "Variante guardada");
    router.refresh();
  }

  async function alternar() {
    const { error } = await supabase.from("variantes").update({ activo: !v.activo }).eq("id", v.id);
    if (error) return avisar("error", mensajeError(error));
    router.refresh();
  }

  async function ajustar() {
    const delta = (parseInt(real, 10) || 0) - v.stock;
    if (delta === 0) return setAjustando(false);
    if (!nota.trim()) return avisar("error", "Escribe el motivo del ajuste (ej. conteo físico, merma)");
    const { error } = await supabase.from("movimientos_inventario").insert({ variante_id: v.id, tipo: "ajuste", cantidad: delta, nota: nota.trim() });
    if (error) return avisar("error", mensajeError(error));
    setAjustando(false);
    setNota("");
    avisar("ok", `Existencias ajustadas (${delta > 0 ? "+" : ""}${delta})`);
    router.refresh();
  }

  return (
    <div className={`${card} p-3 space-y-2 ${v.activo ? "" : "opacity-60"}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-medium">{detalleOpciones(v.opciones) || "Única"}{!v.activo && " (oculta)"}</p>
        <p className="text-sm text-neutral-500">
          {v.stock} pzas · costo promedio {v.costo != null ? mxn(v.costo) : <span className="text-amber-600">sin costo</span>}
        </p>
      </div>
      <div className="flex gap-2 flex-wrap items-end">
        <label className="text-xs text-neutral-500">Precio
          <input type="number" inputMode="decimal" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-28 border border-neutral-300 rounded-lg px-3 py-2 bg-white text-base block" />
        </label>
        <label className="text-xs text-neutral-500 flex-1 min-w-44">Código de barras
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} className="w-full border border-neutral-300 rounded-lg px-3 py-2 bg-white text-base block font-mono" />
        </label>
        {cambio && <button className={btn} onClick={guardar}>Guardar</button>}
        <button className={btnSec} onClick={() => setAjustando((a) => !a)}>Ajustar existencias</button>
        <button className={btnSec} onClick={alternar}>{v.activo ? "Ocultar" : "Mostrar"}</button>
      </div>
      {ajustando && (
        <div className="flex gap-2 flex-wrap items-end bg-neutral-50 rounded-lg p-2">
          <label className="text-xs text-neutral-500">Existencia real
            <input type="number" inputMode="numeric" min="0" value={real} onChange={(e) => setReal(e.target.value)} className="w-24 border border-neutral-300 rounded-lg px-3 py-2 bg-white text-base block" />
          </label>
          <label className="text-xs text-neutral-500 flex-1 min-w-44">Motivo
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Conteo físico, merma, corrección..." className="w-full border border-neutral-300 rounded-lg px-3 py-2 bg-white text-base block" />
          </label>
          <button className={btn} onClick={ajustar}>Aplicar</button>
        </div>
      )}
    </div>
  );
}
