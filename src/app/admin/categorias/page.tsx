import { requireDueno } from "@/lib/auth";
import { CategoriasAdmin, type CategoriaFila } from "@/components/CategoriasAdmin";

export const metadata = { title: "Categorías" };

export default async function Categorias() {
  const { supabase } = await requireDueno();
  const { data } = await supabase.from("categorias").select("id, nombre, opciones, productos(count)").order("nombre");
  const filas: CategoriaFila[] = ((data ?? []) as unknown as { id: string; nombre: string; opciones: string[]; productos: { count: number }[] }[]).map((c) => ({
    id: c.id, nombre: c.nombre, opciones: c.opciones, productos: c.productos?.[0]?.count ?? 0,
  }));
  return (
    <>
      <h1 className="text-xl font-semibold">Categorías</h1>
      <CategoriasAdmin categorias={filas} />
    </>
  );
}
