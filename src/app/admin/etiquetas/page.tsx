import { requireDueno } from "@/lib/auth";
import { GeneradorEtiquetas, type ItemEtiqueta } from "@/components/GeneradorEtiquetas";
import type { Opciones } from "@/lib/types";

export const metadata = { title: "Etiquetas" };

export default async function Etiquetas({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  const { supabase } = await requireDueno();
  const sp = await searchParams;

  let inicial: ItemEtiqueta[] = [];
  if (sp.producto) {
    const { data } = await supabase
      .from("productos")
      .select("nombre, marca, variantes(id, opciones, precio, codigo_barras, stock, activo)")
      .eq("id", sp.producto)
      .maybeSingle();
    if (data) {
      const vs = (data.variantes ?? []) as { id: string; opciones: Opciones; precio: number; codigo_barras: string; stock: number; activo: boolean }[];
      inicial = vs.filter((v) => v.activo).map((v) => ({
        varianteId: v.id, nombre: data.nombre, marca: data.marca, opciones: v.opciones, precio: Number(v.precio), codigo: v.codigo_barras, copias: Math.max(1, v.stock),
      }));
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Etiquetas con código de barras</h1>
      <GeneradorEtiquetas inicial={inicial} />
    </>
  );
}
