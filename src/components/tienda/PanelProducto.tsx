"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProductoPublico } from "@/lib/catalogo";
import { mensajeWhatsApp, urlWhatsApp } from "@/lib/catalogo";
import { MAX_POR_LINEA } from "@/lib/carrito";
import { mxn } from "@/lib/format";
import { MARCA } from "@/lib/marca";
import { t } from "@/lib/ui";
import { useCarrito } from "./CarritoContext";
import { IconoWhatsApp } from "./Iconos";

export function PanelProducto({ p }: { p: ProductoPublico }) {
  const { agregar, lineas } = useCarrito();
  const disponibles = p.variantes.filter((v) => v.disponible);
  const [foto, setFoto] = useState(0);
  const [sel, setSel] = useState<string | null>(disponibles.length === 1 ? disponibles[0].id : null);
  const [cantidad, setCantidad] = useState(1);
  const [pedirVariante, setPedirVariante] = useState(false);

  const v = p.variantes.find((x) => x.id === sel) ?? null;
  const enCarrito = v ? (lineas.find((l) => l.varianteId === v.id)?.cantidad ?? 0) : 0;
  const maximo = v ? Math.max(1, Math.min(v.stock, MAX_POR_LINEA)) : 1;
  const precio = v ? mxn(v.precio) : p.precioMin === p.precioMax ? mxn(p.precioMin) : `${mxn(p.precioMin)} – ${mxn(p.precioMax)}`;

  function alAgregar() {
    if (!v) return setPedirVariante(true);
    setPedirVariante(false);
    agregar(v.id, cantidad, v.stock);
    setCantidad(1);
  }

  const wa = MARCA.whatsapp
    ? urlWhatsApp(MARCA.whatsapp, mensajeWhatsApp(p.nombre, v?.detalle ?? "", v?.precio ?? p.precioMin))
    : null;

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-14">
      {/* Galería */}
      <div>
        <div className="aspect-[4/5] overflow-hidden bg-carbon">
          {p.fotos[foto] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.fotos[foto]} alt={p.nombre} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-carbon to-negro">
              <span className="pl-[0.3em] font-display text-6xl tracking-[0.3em] text-oro/40">LUX</span>
            </div>
          )}
        </div>
        {p.fotos.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {p.fotos.map((f, i) => (
              <button key={f} onClick={() => setFoto(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === foto}
                className={`h-20 w-16 shrink-0 overflow-hidden border-2 cursor-pointer ${i === foto ? "border-oro" : "border-transparent opacity-70 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Compra */}
      <div className="md:py-4">
        {p.marca && <p className="text-xs uppercase tracking-[0.3em] text-oro-oscuro">{p.marca}</p>}
        <h1 className="mt-1 font-display text-4xl leading-tight">{p.nombre}</h1>
        <p className="mt-3 text-2xl">{precio}</p>
        {p.descripcion && <p className="mt-5 whitespace-pre-line leading-relaxed text-neutral-700">{p.descripcion}</p>}

        <div className="mt-7">
          <p className={t.etiqueta}>{p.variantes.length > 1 ? "Elige una opción" : "Presentación"}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Opciones">
            {p.variantes.map((x) => (
              <button key={x.id} type="button" disabled={!x.disponible} aria-pressed={x.id === sel}
                onClick={() => { setSel(x.id); setPedirVariante(false); setCantidad(1); }}
                className={`min-w-14 border px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                  x.id === sel ? "border-negro bg-negro text-marfil" : "border-neutral-300 bg-white hover:border-oro"
                } ${!x.disponible ? "cursor-not-allowed text-neutral-400 line-through opacity-50 hover:border-neutral-300" : ""}`}>
                {x.detalle || "Única"}
              </button>
            ))}
          </div>
          {pedirVariante && <p role="alert" className="mt-2 text-sm text-red-700">Elige una opción para continuar.</p>}
          {v && v.stock <= 2 && <p className="mt-2 text-sm text-oro-oscuro">¡Últimas {v.stock === 1 ? "pieza" : "piezas"}!</p>}
        </div>

        {disponibles.length === 0 ? (
          <p className="mt-8 border border-neutral-300 bg-white p-4 text-center text-sm uppercase tracking-[0.2em] text-neutral-600">Agotado por ahora</p>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center border border-neutral-300 bg-white">
                <button type="button" className="h-12 w-12 text-xl cursor-pointer disabled:opacity-40" disabled={cantidad <= 1} onClick={() => setCantidad((c) => c - 1)} aria-label="Menos">−</button>
                <span className="w-10 text-center" aria-live="polite">{cantidad}</span>
                <button type="button" className="h-12 w-12 text-xl cursor-pointer disabled:opacity-40" disabled={cantidad >= maximo} onClick={() => setCantidad((c) => c + 1)} aria-label="Más">+</button>
              </div>
              <button type="button" className={`${t.btnOro} h-12 flex-1`} onClick={alAgregar}>Agregar al carrito</button>
            </div>
            {enCarrito > 0 && (
              <p className="mt-2 text-sm text-neutral-600">Ya tienes {enCarrito} en tu carrito. <Link href="/carrito" className="underline underline-offset-4">Ver carrito</Link></p>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={`${t.btnLinea} mt-3 w-full gap-2`}>
                <IconoWhatsApp /> Preguntar por WhatsApp
              </a>
            )}
          </>
        )}

        <ul className="mt-8 space-y-2 border-t border-neutral-200 pt-6 text-sm text-neutral-600">
          {["Precio con IVA incluido.", "Confirmamos disponibilidad, pago y envío contigo por WhatsApp.", "Puedes agregar varios productos y hacer un solo pedido."].map((x) => (
            <li key={x} className="flex gap-3"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-oro" aria-hidden />{x}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
