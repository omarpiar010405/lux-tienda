"use client";

import Link from "next/link";
import { mensajePedidoWhatsApp, urlWhatsApp } from "@/lib/catalogo";
import { MAX_POR_LINEA } from "@/lib/carrito";
import { mxn } from "@/lib/format";
import { MARCA } from "@/lib/marca";
import { t } from "@/lib/ui";
import { useCarrito } from "./CarritoContext";
import { IconoWhatsApp } from "./Iconos";
import { problemaLinea, useDetalles } from "./useDetalles";

export function CarritoVista() {
  const { lineas, listo, cambiar, quitar, vaciar } = useCarrito();
  const { detalles, cargando } = useDetalles(lineas, listo);

  if (!listo || cargando) return <p className="py-20 text-center text-neutral-500" role="status">Cargando tu carrito…</p>;

  if (detalles!.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-3xl">Tu carrito está vacío</p>
        <p className="mt-3 text-neutral-600">Descubre nuestras prendas y fragancias.</p>
        <Link href="/tienda" className={`${t.btnNegro} mt-8`}>Ir a la tienda</Link>
      </div>
    );
  }

  const filas = detalles!;
  const conProblema = filas.filter((d) => problemaLinea(d));
  const validas = filas.filter((d) => !problemaLinea(d));
  const subtotal = validas.reduce((s, d) => s + d.precio * d.cantidad, 0);
  const piezas = validas.reduce((s, d) => s + d.cantidad, 0);

  function ajustar() {
    for (const d of conProblema) {
      if (!d.existe || d.stock <= 0) quitar(d.varianteId);
      else cambiar(d.varianteId, d.stock, d.stock);
    }
  }

  const wa = MARCA.whatsapp && validas.length > 0
    ? urlWhatsApp(MARCA.whatsapp, mensajePedidoWhatsApp(validas.map((d) => ({ nombre: d.nombre, detalle: d.detalle, cantidad: d.cantidad, precio: d.precio }))))
    : null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div>
        {conProblema.length > 0 && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <span>Algunos productos cambiaron de disponibilidad.</span>
            <button className="underline underline-offset-4 cursor-pointer" onClick={ajustar}>Ajustar mi carrito</button>
          </div>
        )}

        <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
          {filas.map((d) => {
            const problema = problemaLinea(d);
            const tope = Math.max(1, Math.min(d.stock, MAX_POR_LINEA));
            return (
              <li key={d.varianteId} className="flex gap-4 py-5">
                <div className="h-28 w-24 shrink-0 overflow-hidden bg-carbon">
                  {d.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.foto} alt="" className="h-full w-full object-cover" />
                  ) : <div className="flex h-full items-center justify-center text-oro/40 font-display">LUX</div>}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      {d.productoId ? <Link href={`/producto/${d.productoId}`} className="font-display text-lg leading-snug hover:text-oro-oscuro">{d.nombre}</Link> : <p className="font-display text-lg">{d.nombre}</p>}
                      {d.marca && <p className="text-[0.65rem] uppercase tracking-[0.25em] text-oro-oscuro">{d.marca}</p>}
                      {d.detalle && <p className="mt-1 text-sm text-neutral-600">{d.detalle}</p>}
                    </div>
                    <p className="whitespace-nowrap text-sm">{d.existe ? mxn(d.precio * d.cantidad) : ""}</p>
                  </div>
                  {problema && <p className="mt-1 text-sm text-red-700">{problema}</p>}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    {d.existe && d.stock > 0 ? (
                      <div className="flex items-center border border-neutral-300 bg-white">
                        <button className="h-9 w-9 cursor-pointer" onClick={() => cambiar(d.varianteId, d.cantidad - 1, tope)} aria-label={`Menos ${d.nombre}`}>−</button>
                        <span className="w-8 text-center text-sm" aria-live="polite">{d.cantidad}</span>
                        <button className="h-9 w-9 cursor-pointer disabled:opacity-40" disabled={d.cantidad >= tope} onClick={() => cambiar(d.varianteId, d.cantidad + 1, tope)} aria-label={`Más ${d.nombre}`}>+</button>
                      </div>
                    ) : <span />}
                    <button className="text-xs uppercase tracking-[0.15em] text-neutral-500 underline underline-offset-4 hover:text-negro cursor-pointer" onClick={() => quitar(d.varianteId)}>Quitar</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <button className="mt-4 text-xs uppercase tracking-[0.15em] text-neutral-500 underline underline-offset-4 cursor-pointer" onClick={vaciar}>Vaciar carrito</button>
      </div>

      <aside className="h-fit border border-neutral-200 bg-white p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-2xl">Resumen</h2>
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between"><dt>{piezas} {piezas === 1 ? "artículo" : "artículos"}</dt><dd>{mxn(subtotal)}</dd></div>
          <div className="flex justify-between text-neutral-500"><dt>Envío</dt><dd>Se confirma por WhatsApp</dd></div>
        </dl>
        <div className="mt-4 flex justify-between border-t border-neutral-200 pt-4 text-lg"><span>Total</span><span className="font-display text-2xl">{mxn(subtotal)}</span></div>
        <p className="mt-1 text-xs text-neutral-500">Precios con IVA incluido.</p>

        {conProblema.length > 0 ? (
          <button disabled className={`${t.btnNegro} mt-6 w-full !px-3 !tracking-[0.12em]`}>Ajusta tu carrito para continuar</button>
        ) : (
          <Link href="/checkout" className={`${t.btnOro} mt-6 w-full`}>Finalizar pedido</Link>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={`${t.btnLinea} mt-3 w-full gap-2 !px-3 !tracking-[0.12em]`}>
            <IconoWhatsApp /> Pedir todo por WhatsApp
          </a>
        )}
        <p className="mt-4 text-xs text-neutral-500">Para finalizar el pedido necesitas una cuenta; así guardamos tus datos de entrega. También puedes enviarlo por WhatsApp sin cuenta.</p>
      </aside>
    </div>
  );
}
