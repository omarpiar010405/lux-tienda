import Link from "next/link";
import type { ProductoPublico } from "@/lib/catalogo";
import { mxn } from "@/lib/format";
import { IconoEstrella } from "./Iconos";

export function TarjetaProducto({ p, popular = false }: { p: ProductoPublico; popular?: boolean }) {
  const foto = p.fotos[0];
  return (
    <Link href={`/producto/${p.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-carbon">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt={p.nombre} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-carbon to-negro">
            <span className="font-display text-4xl tracking-[0.3em] text-oro/40 pl-[0.3em]">LUX</span>
          </div>
        )}
        {!p.disponible && <span className="absolute left-3 top-3 bg-negro/85 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-marfil">Agotado</span>}
        {popular && p.disponible && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 bg-oro px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-negro">
            <IconoEstrella className="h-3 w-3" /> Popular
          </span>
        )}
      </div>
      <div className="pt-3 text-center">
        {p.marca && <p className="text-[0.65rem] uppercase tracking-[0.28em] text-oro-oscuro">{p.marca}</p>}
        <h3 className="font-display text-lg leading-snug text-negro group-hover:text-oro-oscuro transition-colors">{p.nombre}</h3>
        <p className="mt-0.5 text-sm text-neutral-700">{p.precioMin === p.precioMax ? mxn(p.precioMin) : `Desde ${mxn(p.precioMin)}`}</p>
      </div>
    </Link>
  );
}
