import { requireDueno } from "@/lib/auth";
import FormularioProducto, { type Duplicado } from "@/components/FormularioProducto";
import type { Categoria, Opciones, Seccion } from "@/lib/types";

export const metadata = { title: "Producto nuevo" };

export default async function NuevoProducto({ searchParams }: { searchParams: Promise<{ duplicar?: string }> }) {
  const { supabase } = await requireDueno();
  const sp = await searchParams;

  const [{ data: cats }, { data: provs }] = await Promise.all([
    supabase.from("categorias").select("id, nombre, opciones").order("nombre"),
    supabase.from("proveedores").select("nombre").eq("activo", true).order("nombre"),
  ]);
  const categorias = (cats ?? []) as Categoria[];

  let duplicado: Duplicado | undefined;
  if (sp.duplicar) {
    const { data } = await supabase
      .from("productos")
      .select("categoria_id, marca, seccion, descripcion, variantes(opciones, precio)")
      .eq("id", sp.duplicar)
      .maybeSingle();
    if (data) {
      const cat = categorias.find((c) => c.id === data.categoria_id);
      const vars = (data.variantes ?? []) as { opciones: Opciones; precio: number }[];
      duplicado = {
        categoria_id: data.categoria_id,
        marca: data.marca ?? "",
        seccion: data.seccion as Seccion,
        descripcion: data.descripcion ?? "",
        precio: Number(vars[0]?.precio ?? 0) || 0,
        valores: vars.map((v) => (cat?.opciones ?? []).slice(0, 2).map((k) => v.opciones[k] ?? "")),
      };
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">{duplicado ? "Duplicar producto" : "Producto nuevo"}</h1>
      <FormularioProducto categorias={categorias} proveedores={(provs ?? []).map((p) => p.nombre)} duplicado={duplicado} />
    </>
  );
}
