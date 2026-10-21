"use client";

import Link from "next/link";
import { useState } from "react";
import { MARCA } from "@/lib/marca";
import { useCarrito } from "./CarritoContext";
import { IconoBolsa, IconoCerrar, IconoLupa, IconoMenu, IconoUsuario } from "./Iconos";
import { Logo } from "./Logo";

const ENLACES = [
  { href: "/tienda", texto: "Tienda" },
  { href: "/tienda?seccion=mujer", texto: "Mujer" },
  { href: "/tienda?seccion=hombre", texto: "Hombre" },
  { href: "/tienda?categoria=Fragancias", texto: "Fragancias" },
];

export function HeaderTienda({ sesion }: { sesion: { nombre: string; rol: string } | null }) {
  const { piezas, aviso } = useCarrito();
  const [abierto, setAbierto] = useState(false);
  const cuentaHref = !sesion ? "/login" : sesion.rol === "dueno" ? "/admin" : sesion.rol === "vendedora" ? "/pos" : "/cuenta";
  const cuentaTexto = !sesion ? "Ingresar" : sesion.rol === "cliente" ? "Mi cuenta" : "Panel";

  return (
    <header className="sticky top-0 z-40 bg-negro text-marfil">
      {MARCA.anuncio && (
        <div className="bg-oro px-4 py-1.5 text-center text-[0.7rem] font-medium uppercase tracking-[0.25em] text-negro">{MARCA.anuncio}</div>
      )}
      <div className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4">
        <nav className="hidden gap-7 text-xs uppercase tracking-[0.2em] md:flex" aria-label="Principal">
          {ENLACES.map((e) => (
            <Link key={e.href} href={e.href} className="transition-colors hover:text-oro">{e.texto}</Link>
          ))}
        </nav>
        <button className="justify-self-start p-2 md:hidden" onClick={() => setAbierto(true)} aria-label="Abrir menú">
          <IconoMenu />
        </button>

        <div className="justify-self-center"><Logo tono="oro" /></div>

        <div className="flex items-center justify-self-end gap-1 sm:gap-3">
          <Link href="/tienda" className="p-2 transition-colors hover:text-oro" aria-label="Buscar"><IconoLupa /></Link>
          <Link href={cuentaHref} className="flex items-center gap-2 p-2 transition-colors hover:text-oro" aria-label={cuentaTexto}>
            <IconoUsuario />
            <span className="hidden text-xs uppercase tracking-[0.2em] lg:inline">{cuentaTexto}</span>
          </Link>
          <Link href="/carrito" className="relative p-2 transition-colors hover:text-oro" aria-label={`Carrito, ${piezas} artículos`}>
            <IconoBolsa />
            {piezas > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-oro px-1 text-[0.65rem] font-semibold text-negro">{piezas}</span>
            )}
          </Link>
        </div>
      </div>

      {aviso && (
        <div role="status" className="absolute right-4 top-full mt-2 flex items-center gap-3 border border-oro bg-negro px-4 py-3 text-sm shadow-xl">
          <span>{aviso}</span>
          <Link href="/carrito" className="text-oro underline underline-offset-4">Ver carrito</Link>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 bg-negro/95 md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="flex h-20 items-center justify-between px-4">
            <Logo tono="oro" enlace={false} />
            <button className="p-2" onClick={() => setAbierto(false)} aria-label="Cerrar menú"><IconoCerrar /></button>
          </div>
          <nav className="flex flex-col gap-1 px-6 pt-6">
            {[{ href: "/", texto: "Inicio" }, ...ENLACES, { href: cuentaHref, texto: cuentaTexto }, { href: "/carrito", texto: `Carrito (${piezas})` }].map((e) => (
              <Link key={e.href + e.texto} href={e.href} onClick={() => setAbierto(false)} className="border-b border-marfil/10 py-4 font-display text-2xl hover:text-oro">
                {e.texto}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
