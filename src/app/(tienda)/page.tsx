import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { agruparCatalogo, categoriasDisponibles, ordenarPorIds, type FilaCatalogo } from "@/lib/catalogo";
import { MARCA } from "@/lib/marca";
import { t } from "@/lib/ui";
import { TarjetaProducto } from "@/components/tienda/TarjetaProducto";
import { Titulo } from "@/components/tienda/Titulo";

export default async function Inicio() {
  const supabase = await createClient();
  const [{ data }, { data: pop }] = await Promise.all([
    supabase.from("catalogo_publico").select("*"),
    supabase.rpc("productos_populares", { p_limit: 8 }),
  ]);

  const todos = agruparCatalogo((data ?? []) as FilaCatalogo[]);
  const ids = ((pop ?? []) as { producto_id: string }[]).map((x) => x.producto_id);
  const ordenados = ordenarPorIds(todos, ids);
  const populares = (ids.length ? ordenados.filter((p) => ids.includes(p.id)) : ordenados.filter((p) => p.disponible)).slice(0, 8);
  const categorias = categoriasDisponibles(ordenados);

  return (
    <>
      {/* Portada */}
      <section className="relative overflow-hidden bg-negro text-marfil">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(200,162,74,0.22),transparent_62%)]" />
        <div className="pointer-events-none absolute inset-x-6 inset-y-6 border border-oro/30 md:inset-x-12 md:inset-y-10" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center md:py-36">
          <p className="mb-6 text-[0.7rem] uppercase tracking-[0.6em] text-oro">{MARCA.nombre} {MARCA.subtitulo}</p>
          <h1 className="font-display text-5xl leading-[1.05] text-balance md:text-7xl">{MARCA.portadaTitulo}</h1>
          <div className="my-7 flex items-center gap-3" aria-hidden>
            <span className="h-px w-14 bg-oro" /><span className="h-1.5 w-1.5 rotate-45 bg-oro" /><span className="h-px w-14 bg-oro" />
          </div>
          <p className="max-w-xl text-base text-marfil/75 md:text-lg">{MARCA.portadaTexto}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/tienda" className={t.btnOro}>Ver la tienda</Link>
            {populares.length > 0 && <a href="#populares" className={t.btnLineaClaro}>Los más populares</a>}
          </div>
        </div>
      </section>

      {/* Categorías */}
      {categorias.length > 0 && (
        <section className={`${t.contenedor} py-16 md:py-20`} aria-labelledby="h-categorias">
          <div id="h-categorias"><Titulo sub="Encuentra lo que buscas">Compra por categoría</Titulo></div>
          <ul className="flex flex-wrap justify-center gap-3 md:gap-5">
            {categorias.map((c) => (
              <li key={c.nombre} className="w-[calc(50%-0.375rem)] md:w-[calc(25%-0.9375rem)]">
                <Link href={`/tienda?categoria=${encodeURIComponent(c.nombre)}`} className="group relative block aspect-square overflow-hidden bg-carbon md:aspect-[4/5]">
                  {c.foto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.foto} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/20 to-transparent" />
                  <div className="absolute inset-3 border border-oro/0 transition-colors group-hover:border-oro/70" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                    <h3 className="font-display text-xl text-oro md:text-2xl">{c.nombre}</h3>
                    <p className="mt-1 text-[0.65rem] uppercase tracking-[0.25em] text-marfil/70">{c.productos} {c.productos === 1 ? "producto" : "productos"}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Populares */}
      {populares.length > 0 && (
        <section id="populares" className="bg-white py-16 md:py-20" aria-labelledby="h-populares">
          <div className={t.contenedor}>
            <div id="h-populares"><Titulo sub="Lo que más eligen nuestras clientas">Los más populares</Titulo></div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
              {populares.map((p) => <TarjetaProducto key={p.id} p={p} popular />)}
            </div>
            <div className="mt-12 text-center"><Link href="/tienda" className={t.btnLinea}>Ver toda la tienda</Link></div>
          </div>
        </section>
      )}

      {todos.length === 0 && (
        <section className={`${t.contenedor} py-24 text-center`}>
          <p className="font-display text-3xl">Muy pronto</p>
          <p className="mt-3 text-neutral-600">Estamos preparando nuestro catálogo.</p>
        </section>
      )}

      {/* Cómo comprar */}
      <section className="bg-negro py-16 text-marfil md:py-20" aria-labelledby="h-como">
        <div className={t.contenedor}>
          <div id="h-como"><Titulo tono="oscuro">Cómo comprar</Titulo></div>
          <ol className="grid gap-10 md:grid-cols-3">
            {[
              ["Elige tus favoritos", "Explora el catálogo y selecciona talla o presentación."],
              ["Arma tu carrito", "Agrega varios productos y revisa tu pedido antes de enviarlo."],
              ["Confirmamos contigo", "Te contactamos por WhatsApp para el pago y la entrega."],
            ].map(([titulo, texto], i) => (
              <li key={titulo} className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-oro font-display text-2xl text-oro">{i + 1}</span>
                <h3 className="mt-5 font-display text-xl">{titulo}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-marfil/70">{texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
