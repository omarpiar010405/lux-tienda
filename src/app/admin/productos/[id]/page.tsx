import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDueno } from "@/lib/auth";
import { EditorProducto, type DatosEditor } from "@/components/EditorProducto";
import type { Opciones, Seccion } from "@/lib/types";
import { btnSec } from "@/lib/ui";

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

type Crudo = {
  id: string; nombre: string; descripcion: string | null; marca: string | null; seccion: Seccion; activo: boolean;
  categorias: Uno<{ id: string; nombre: string; opciones: string[] }>;
  variantes: { id: string; opciones: Opciones; precio: number; stock: number; codigo_barras: string; activo: boolean; costos_variante: Uno<{ costo_promedio: number }> }[];
  producto_fotos: { id: string; url: string; orden: number }[];
};

export default async function DetalleProducto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireDueno();
  const { data } = await supabase
    .from("productos")
    .select("id, nombre, descripcion, marca, seccion, activo, categorias(id, nombre, opciones), variantes(id, opciones, precio, stock, codigo_barras, activo, costos_variante(costo_promedio)), producto_fotos(id, url, orden)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const p = data as unknown as Crudo;
  const cat = uno(p.categorias);
  if (!cat) notFound();

  const datos: DatosEditor = {
    id: p.id, nombre: p.nombre, descripcion: p.descripcion ?? "", marca: p.marca ?? "", seccion: p.seccion, activo: p.activo,
    categoria: cat,
    fotos: [...p.producto_fotos].sort((a, b) => a.orden - b.orden),
    variantes: [...p.variantes]
      .sort((a, b) => JSON.stringify(a.opciones).localeCompare(JSON.stringify(b.opciones), "es", { numeric: true }))
      .map((v) => ({ id: v.id, opciones: v.opciones, precio: Number(v.precio), stock: v.stock, codigo: v.codigo_barras, activo: v.activo, costo: uno(v.costos_variante) ? Number(uno(v.costos_variante)!.costo_promedio) : null })),
  };

  return (
    <>
      <Link href="/admin/productos" className="text-sm underline text-neutral-600">← Productos</Link>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-semibold">{p.nombre}</h1>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/admin/compras/nueva?producto=${p.id}`} className={btnSec}>Registrar compra</Link>
          <Link href={`/admin/productos/nuevo?duplicar=${p.id}`} className={btnSec}>Duplicar</Link>
          <Link href={`/admin/etiquetas?producto=${p.id}`} className={btnSec}>Etiquetas</Link>
        </div>
      </div>
      <EditorProducto datos={datos} />
    </>
  );
}
