import type { ComprobanteVista } from "@/lib/comprobantesServidor";
import { pesoLegible } from "@/lib/pagos";

/** Miniaturas (imágenes) o enlaces (PDF) a los comprobantes. Los enlaces son temporales. */
export function ListaComprobantes({ items }: { items: ComprobanteVista[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-3">
      {items.map((c) => {
        const esImagen = c.mime.startsWith("image/") && c.mime !== "image/heic" && c.mime !== "image/heif";
        return (
          <li key={c.id} className="w-28 text-center text-xs">
            {c.url ? (
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="block border border-neutral-200 bg-white hover:border-oro">
                {esImagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.url} alt={`Comprobante ${c.nombre}`} className="h-28 w-28 object-cover" />
                ) : (
                  <span className="flex h-28 w-28 items-center justify-center bg-neutral-50 font-medium">{c.mime === "application/pdf" ? "PDF" : "HEIC"}</span>
                )}
              </a>
            ) : (
              <span className="flex h-28 w-28 items-center justify-center border border-neutral-200 bg-neutral-50 text-neutral-500">No disponible</span>
            )}
            <p className="mt-1 truncate" title={c.nombre}>{c.nombre}</p>
            <p className="text-neutral-500">{pesoLegible(c.tamano)}</p>
          </li>
        );
      })}
    </ul>
  );
}
