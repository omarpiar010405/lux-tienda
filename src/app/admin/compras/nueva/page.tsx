import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { FormularioCompra } from "@/components/FormularioCompra";
import { TablaWrap } from "@/components/Kit";
import { btn, input, td } from "@/lib/ui";
import type { Opciones } from "@/lib/types";

export const metadata = { title: "Registrar compra" };

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

export default async function NuevaCompra({ searchParams }: { searchParams: Promise<{ producto?: string; q?: string }> }) {
  const { supabase } = await requireDueno();
  const sp = await searchParams;

  if (!sp.producto) {
    let q = supabase.from("productos").select("id, nombre, marca").eq("activo", true).order("nombre").limit(40);
    if (sp.q) q = q.ilike("nombre", `%${sp.q.replace(/[%_]/g, "")}%`);
    const { data } = await q;
    return (
      <>
        <h1 className="text-xl font-semibold">Registrar compra</h1>
        <p className="text-sm text-neutral-600">Elige el producto al que llegaron piezas. Si es un producto nuevo, <Link href="/admin/productos/nuevo" className="underline">créalo aquí</Link> (ya incluye su compra).</p>
        <form className="flex gap-2"><input name="q" defaultValue={sp.q} placeholder="Buscar producto..." className={`${input} max-w-sm`} /><button className={btn}>Buscar</button></form>
        <TablaWrap>
          <tbody className="divide-y">
            {(data ?? []).length === 0 && <tr><td className={td}>Sin resultados.</td></tr>}
            {(data ?? []).map((p) => (
              <tr key={p.id}><td className={td}><Link href={`/admin/compras/nueva?producto=${p.id}`} className="underline">{p.nombre}</Link>{p.marca ? <span className="text-neutral-500"> · {p.marca}</span> : null}</td></tr>
            ))}
          </tbody>
        </TablaWrap>
      </>
    );
  }

  const [{ data: prod }, { data: provs }] = await Promise.all([
    supabase.from("productos").select("id, nombre, marca, categorias(opciones), variantes(id, opciones, stock, precio, activo, costos_variante(costo_promedio))").eq("id", sp.producto).maybeSingle(),
    supabase.from("proveedores").select("nombre").eq("activo", true).order("nombre"),
  ]);
  if (!prod) return <p>Producto no encontrado.</p>;

  type Crudo = { id: string; nombre: string; marca: string | null; categorias: Uno<{ opciones: string[] }>; variantes: { id: string; opciones: Opciones; stock: number; precio: number; activo: boolean; costos_variante: Uno<{ costo_promedio: number }> }[] };
  const p = prod as unknown as Crudo;

  return (
    <>
      <h1 className="text-xl font-semibold">Compra de {p.nombre}</h1>
      <FormularioCompra
        producto={{ id: p.id, nombre: p.nombre, marca: p.marca, ejes: (uno(p.categorias)?.opciones ?? []).slice(0, 2) }}
        variantes={p.variantes.filter((v) => v.activo).map((v) => ({ id: v.id, opciones: v.opciones, stock: v.stock, precio: Number(v.precio), costo: uno(v.costos_variante) ? Number(uno(v.costos_variante)!.costo_promedio) : null }))}
        proveedores={(provs ?? []).map((x) => x.nombre)}
      />
    </>
  );
}
