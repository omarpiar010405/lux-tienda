"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen } from "@/lib/imagen";
import { mensajeError } from "@/lib/errores";
import { SECCIONES, etiquetaOpcion, hoyMX, mxn } from "@/lib/format";
import { normalizar } from "@/lib/importar";
import type { Categoria, Seccion } from "@/lib/types";
import { btn, btnSec, input } from "@/lib/ui";
import { Aviso } from "./Kit";

type Fila = { valores: string[]; piezas: string; codigo: string };

export type Duplicado = { categoria_id: string; marca: string; seccion: Seccion; descripcion: string; precio: number; valores: string[][] };

const SUGERENCIAS_TALLA = ["CH", "M", "G", "XL", "XXL", "3XL", "Unitalla", "28", "30", "32", "34", "36", "38", "40"];

function filasPara(cat: Categoria | undefined, duplicado?: string[][]): Fila[] {
  const ejes = cat?.opciones.slice(0, 2) ?? [];
  if (duplicado && duplicado.length) return duplicado.map((v) => ({ valores: ejes.map((_, j) => v[j] ?? ""), piezas: "0", codigo: "" }));
  const primero = ejes[0];
  let base: string[] = [""];
  if (normalizar(cat?.nombre) === "pantalones") base = ["30", "32", "34"];
  else if (primero === "talla") base = ["CH", "M", "G"];
  else if (primero === "ml") base = ["100"];
  return base.map((v) => ({ valores: ejes.map((_, j) => (j === 0 ? v : "")), piezas: "0", codigo: "" }));
}

export default function FormularioProducto({
  categorias, proveedores, duplicado,
}: { categorias: Categoria[]; proveedores: string[]; duplicado?: Duplicado }) {
  const router = useRouter();
  const inicial = categorias.find((c) => c.id === duplicado?.categoria_id) ?? categorias[0];

  const [categoriaId, setCategoriaId] = useState(inicial?.id ?? "");
  const [seccion, setSeccion] = useState<Seccion>(duplicado?.seccion ?? "na");
  const [marca, setMarca] = useState(duplicado?.marca ?? "");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState(duplicado?.descripcion ?? "");
  const [precio, setPrecio] = useState(duplicado ? String(duplicado.precio) : "");
  const [costo, setCosto] = useState("");
  const [fecha, setFecha] = useState(hoyMX());
  const [proveedor, setProveedor] = useState("");
  const [filas, setFilas] = useState<Fila[]>(filasPara(inicial, duplicado?.valores));
  const [manual, setManual] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const categoria = categorias.find((c) => c.id === categoriaId);
  const ejes = categoria?.opciones.slice(0, 2) ?? [];
  const piezasTotal = filas.reduce((s, f) => s + (parseInt(f.piezas, 10) || 0), 0);
  const inversion = piezasTotal * (Number(costo) || 0);

  function cambiarCategoria(id: string) {
    setCategoriaId(id);
    setFilas(filasPara(categorias.find((c) => c.id === id)));
  }
  const editar = (i: number, cambios: Partial<Fila>) => setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, ...cambios } : f)));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const precioNum = Number(precio);
    const costoNum = Number(costo);
    const variantes = filas.map((f) => ({
      opciones: Object.fromEntries(ejes.map((k, j) => [k, f.valores[j].trim()])),
      cantidad: Math.max(0, parseInt(f.piezas, 10) || 0),
      costo_unitario: costoNum,
      codigo_barras: f.codigo.trim(),
    }));

    if (!nombre.trim()) return setError("Escribe el nombre del producto");
    if (!(precioNum > 0)) return setError("Escribe un precio de venta válido");
    if (piezasTotal > 0 && !(costoNum >= 0 && costo !== "")) return setError("Escribe el costo de compra por pieza");
    if (variantes.some((v) => ejes.some((k) => !v.opciones[k]))) return setError(`Llena todas las filas (${ejes.map(etiquetaOpcion).join(" y ")})`);
    const claves = variantes.map((v) => ejes.map((k) => normalizar(v.opciones[k])).join("|"));
    if (new Set(claves).size !== claves.length) return setError("Hay variantes repetidas");

    setGuardando(true);
    const supabase = createClient();
    const subidas: string[] = [];
    try {
      const urls: string[] = [];
      for (const original of fotos) {
        const archivo = await comprimirImagen(original);
        const ext = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
        const ruta = `${crypto.randomUUID()}.${ext}`;
        const { error: eFoto } = await supabase.storage.from("productos").upload(ruta, archivo, { contentType: archivo.type });
        if (eFoto) throw eFoto;
        subidas.push(ruta);
        urls.push(supabase.storage.from("productos").getPublicUrl(ruta).data.publicUrl);
      }

      const { data, error: eRpc } = await supabase.rpc("crear_producto_con_compra", {
        p_categoria: categoriaId,
        p_nombre: nombre,
        p_precio: precioNum,
        p_variantes: variantes,
        p_descripcion: descripcion,
        p_marca: marca,
        p_seccion: seccion,
        p_fotos: urls,
        p_fecha: fecha || null,
        p_proveedor: proveedor,
      });
      if (eRpc) throw eRpc;
      router.push(`/admin/productos/${data}`);
      router.refresh();
    } catch (err) {
      if (subidas.length) await supabase.storage.from("productos").remove(subidas); // no dejar fotos huérfanas
      setError(mensajeError(err));
      setGuardando(false);
    }
  }

  const campo = "space-y-1 block text-sm text-neutral-600";

  return (
    <form onSubmit={guardar} className="space-y-5 max-w-2xl">
      {duplicado && <Aviso tipo="info">Copiaste otro producto: cambia el nombre y las fotos, y revisa piezas y costo.</Aviso>}

      <div className="grid sm:grid-cols-2 gap-3">
        <label className={campo}>Categoría
          <select value={categoriaId} onChange={(e) => cambiarCategoria(e.target.value)} className={input}>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        <label className={campo}>Sección
          <select value={seccion} onChange={(e) => setSeccion(e.target.value as Seccion)} className={input}>
            {SECCIONES.map((s) => <option key={s.valor} value={s.valor}>{s.etiqueta}</option>)}
          </select>
        </label>
        <label className={campo}>Nombre o diseño
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Playera Premium cuello redondo negra" className={input} />
        </label>
        <label className={campo}>Marca (opcional)
          <input value={marca} onChange={(e) => setMarca(e.target.value)} className={input} />
        </label>
        <label className={`${campo} sm:col-span-2`}>Descripción (opcional)
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} className={input} />
        </label>
        <label className={campo}>Precio de venta (MXN)
          <input type="number" inputMode="decimal" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} className={input} />
        </label>
        <label className={campo}>Costo de compra por pieza (MXN)
          <input type="number" inputMode="decimal" min="0" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} className={input} />
        </label>
        <label className={campo}>Fecha de compra
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={input} />
        </label>
        <label className={campo}>Proveedor (opcional)
          <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} list="lista-proveedores" className={input} />
          <datalist id="lista-proveedores">{proveedores.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-medium">Variantes y piezas</h2>
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} /> Escribir códigos de barras</label>
        </div>
        <datalist id="sugerencias-talla">{SUGERENCIAS_TALLA.map((t) => <option key={t} value={t} />)}</datalist>

        {filas.map((f, i) => (
          <div key={i} className="flex gap-2 items-center flex-wrap">
            {ejes.map((k, j) => (
              <input
                key={k}
                value={f.valores[j]}
                onChange={(e) => editar(i, { valores: f.valores.map((v, x) => (x === j ? e.target.value : v)) })}
                placeholder={etiquetaOpcion(k)}
                list={k === "talla" ? "sugerencias-talla" : undefined}
                className="w-28 border border-neutral-300 rounded-lg px-3 py-2 bg-white text-base"
              />
            ))}
            <input type="number" inputMode="numeric" min="0" value={f.piezas} onChange={(e) => editar(i, { piezas: e.target.value })} aria-label="Piezas" className="w-20 border border-neutral-300 rounded-lg px-3 py-2 bg-white text-base" />
            <span className="text-sm text-neutral-500">pzas</span>
            {manual && <input value={f.codigo} onChange={(e) => editar(i, { codigo: e.target.value })} placeholder="Código (vacío = automático)" className="flex-1 min-w-40 border border-neutral-300 rounded-lg px-3 py-2 bg-white text-base" />}
            {filas.length > 1 && <button type="button" onClick={() => setFilas((fs) => fs.filter((_, j) => j !== i))} className="text-neutral-400 px-2 cursor-pointer" aria-label="Quitar">✕</button>}
          </div>
        ))}
        <button type="button" onClick={() => setFilas((fs) => [...fs, { valores: ejes.map(() => ""), piezas: "0", codigo: "" }])} className="text-sm underline cursor-pointer">
          + Agregar variante
        </button>
        <p className="text-sm text-neutral-500">{piezasTotal} piezas · inversión {mxn(inversion)}</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Fotos</h2>
        <input type="file" accept="image/*" multiple onChange={(e) => setFotos(Array.from(e.target.files ?? []))} />
        <div className="flex gap-2 flex-wrap">
          {fotos.map((f, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={URL.createObjectURL(f)} alt="" className="w-20 h-20 rounded-lg object-cover" />
          ))}
        </div>
        <p className="text-xs text-neutral-500">Las fotos se reducen automáticamente antes de subirlas.</p>
      </section>

      {error && <Aviso>{error}</Aviso>}
      <div className="flex gap-2">
        <button disabled={guardando} className={`${btn} py-3 flex-1 sm:flex-none`}>{guardando ? "Guardando..." : "Guardar producto"}</button>
        <button type="button" className={btnSec} onClick={() => router.back()}>Cancelar</button>
      </div>
    </form>
  );
}
