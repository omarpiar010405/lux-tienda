import { requireDueno } from "@/lib/auth";
import { Importador } from "@/components/Importador";
import type { ProductoCatalogo } from "@/lib/importar";
import type { Categoria, Opciones } from "@/lib/types";

export const metadata = { title: "Importar" };

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

export default async function Importar() {
  const { supabase } = await requireDueno();
  const [{ data: cats }, { data: prods }] = await Promise.all([
    supabase.from("categorias").select("id, nombre, opciones").order("nombre"),
    supabase.from("productos").select("id, nombre, marca, categorias(id, nombre, opciones), variantes(id, opciones)").limit(5000),
  ]);

  type Crudo = { id: string; nombre: string; marca: string | null; categorias: Uno<Categoria>; variantes: { id: string; opciones: Opciones }[] };
  const productos: ProductoCatalogo[] = ((prods ?? []) as unknown as Crudo[]).flatMap((p) => {
    const categoria = uno(p.categorias);
    return categoria ? [{ id: p.id, nombre: p.nombre, marca: p.marca, categoria, variantes: p.variantes }] : [];
  });

  return (
    <>
      <h1 className="text-xl font-semibold">Importar desde Excel (CSV)</h1>
      <Importador categorias={(cats ?? []) as Categoria[]} productos={productos} />
    </>
  );
}
