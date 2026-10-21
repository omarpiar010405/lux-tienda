import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { agruparCatalogo, type FilaCatalogo } from "@/lib/catalogo";
import { etiquetaSeccion } from "@/lib/format";
import { t } from "@/lib/ui";
import { PanelProducto } from "@/components/tienda/PanelProducto";
import { TarjetaProducto } from "@/components/tienda/TarjetaProducto";
import { Titulo } from "@/components/tienda/Titulo";

export default async function ProductoPublico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("catalogo_publico").select("*");
  const todos = agruparCatalogo((data ?? []) as FilaCatalogo[]);
  const p = todos.find((x) => x.id === id);
  if (!p) notFound();

  const relacionados = todos.filter((x) => x.id !== p.id && x.categoria === p.categoria && x.disponible).slice(0, 4);

  return (
    <div className={`${t.contenedor} py-8 md:py-12`}>
      <nav aria-label="Migas de pan" className="mb-6 text-xs uppercase tracking-[0.15em] text-neutral-500">
        <Link href="/tienda" className="hover:text-negro">Tienda</Link> ·{" "}
        <Link href={`/tienda?categoria=${encodeURIComponent(p.categoria)}`} className="hover:text-negro">{p.categoria}</Link>
        {p.seccion !== "na" && <> · {etiquetaSeccion(p.seccion)}</>}
      </nav>

      <PanelProducto p={p} />

      {relacionados.length > 0 && (
        <section className="mt-20" aria-labelledby="h-rel">
          <div id="h-rel"><Titulo>También te puede gustar</Titulo></div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
            {relacionados.map((r) => <TarjetaProducto key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
