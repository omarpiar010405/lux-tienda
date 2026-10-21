import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { agruparCatalogo, ordenarPorIds, type FilaCatalogo, type ProductoPublico } from "@/lib/catalogo";
import { etiquetaSeccion } from "@/lib/format";
import { normalizar } from "@/lib/importar";
import { t } from "@/lib/ui";
import { TarjetaProducto } from "@/components/tienda/TarjetaProducto";
import { Titulo } from "@/components/tienda/Titulo";

export const metadata = { title: "Tienda" };

type SP = { q?: string; categoria?: string; seccion?: string; orden?: string };
const ORDENES = [
  { v: "populares", t: "Populares" },
  { v: "precio-asc", t: "Menor precio" },
  { v: "precio-desc", t: "Mayor precio" },
  { v: "nombre", t: "A–Z" },
];

function ordenar(ps: ProductoPublico[], orden: string, ranking: string[]): ProductoPublico[] {
  if (orden === "precio-asc") return [...ps].sort((a, b) => a.precioMin - b.precioMin);
  if (orden === "precio-desc") return [...ps].sort((a, b) => b.precioMin - a.precioMin);
  if (orden === "nombre") return [...ps].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return ordenarPorIds(ps, ranking);
}

export default async function Tienda({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const orden = ORDENES.some((o) => o.v === sp.orden) ? sp.orden! : "populares";
  const supabase = await createClient();
  const [{ data }, { data: pop }] = await Promise.all([
    supabase.from("catalogo_publico").select("*"),
    supabase.rpc("productos_populares", { p_limit: 500 }),
  ]);
  const todos = agruparCatalogo((data ?? []) as FilaCatalogo[]);
  const ranking = ((pop ?? []) as { producto_id: string }[]).map((x) => x.producto_id);
  const top = new Set(ranking.slice(0, 8));

  const q = normalizar(sp.q);
  const filtrados = todos.filter(
    (p) =>
      (!sp.categoria || p.categoria === sp.categoria) &&
      (!sp.seccion || p.seccion === sp.seccion) &&
      (!q || normalizar(`${p.nombre} ${p.marca ?? ""} ${p.categoria}`).includes(q))
  );
  const productos = ordenar(filtrados, orden, ranking);

  const categorias = [...new Set(todos.map((p) => p.categoria))].sort((a, b) => a.localeCompare(b, "es"));
  const secciones = [...new Set(todos.map((p) => p.seccion))].filter((s) => s !== "na");

  const href = (cambios: Partial<SP>) => {
    const p = new URLSearchParams();
    const m: SP = { ...sp, ...cambios };
    (Object.keys(m) as (keyof SP)[]).forEach((k) => m[k] && p.set(k, m[k]!));
    const s = p.toString();
    return s ? `/tienda?${s}` : "/tienda";
  };
  const chip = (activo: boolean) =>
    `whitespace-nowrap border px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors ${activo ? "border-negro bg-negro text-marfil" : "border-neutral-300 bg-white hover:border-oro"}`;

  return (
    <div className={`${t.contenedor} py-12`}>
      <Titulo sub={`${productos.length} ${productos.length === 1 ? "producto" : "productos"}`}>
        {sp.categoria ?? (sp.seccion ? etiquetaSeccion(sp.seccion) : "Toda la tienda")}
      </Titulo>

      <form action="/tienda" className="mx-auto mb-6 flex max-w-xl gap-2" role="search">
        <label htmlFor="buscar" className="sr-only">Buscar productos</label>
        <input id="buscar" name="q" defaultValue={sp.q} placeholder="Buscar productos..." className={t.input} />
        {sp.categoria && <input type="hidden" name="categoria" value={sp.categoria} />}
        {sp.seccion && <input type="hidden" name="seccion" value={sp.seccion} />}
        {sp.orden && <input type="hidden" name="orden" value={sp.orden} />}
        <button className={t.btnNegro}>Buscar</button>
      </form>

      <nav className="mb-4 flex gap-2 overflow-x-auto pb-2 md:justify-center" aria-label="Filtros">
        <Link href={href({ categoria: undefined, seccion: undefined })} className={chip(!sp.categoria && !sp.seccion)}>Todo</Link>
        {secciones.map((s) => (
          <Link key={s} href={href({ seccion: sp.seccion === s ? undefined : s })} className={chip(sp.seccion === s)}>{etiquetaSeccion(s)}</Link>
        ))}
        {categorias.map((c) => (
          <Link key={c} href={href({ categoria: sp.categoria === c ? undefined : c })} className={chip(sp.categoria === c)}>{c}</Link>
        ))}
      </nav>

      <div className="mb-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs uppercase tracking-[0.15em] text-neutral-500">
        <span>Ordenar:</span>
        {ORDENES.map((o) => (
          <Link key={o.v} href={href({ orden: o.v })} className={orden === o.v ? "border-b border-oro pb-0.5 text-negro" : "hover:text-negro"}>{o.t}</Link>
        ))}
      </div>

      {productos.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-2xl">No encontramos productos</p>
          <p className="mt-2 text-neutral-600">Prueba con otra búsqueda o quita los filtros.</p>
          <Link href="/tienda" className={`${t.btnLinea} mt-6`}>Ver todo</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
          {productos.map((p) => <TarjetaProducto key={p.id} p={p} popular={top.has(p.id)} />)}
        </div>
      )}
    </div>
  );
}
