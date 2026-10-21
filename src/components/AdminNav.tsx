"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BotonSalir } from "./BotonSalir";
import { IconoCerrar, IconoMenu } from "./tienda/Iconos";
import { Logo } from "./tienda/Logo";

const ICONOS: Record<string, string> = {
  resumen: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  pedidos: "M5 8h14l-1 12H6L5 8ZM9 8V6a3 3 0 0 1 6 0v2",
  ventas: "M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6",
  pos: "M4 9h16v10H4zM7 9V5h10v4M8 14h.01M12 14h.01M16 14h.01",
  productos: "M3 12l9-9h8v8l-9 9-8-8ZM16 8h.01",
  categorias: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  compras: "M3 7l9-4 9 4v10l-9 4-9-4V7ZM3 7l9 4 9-4M12 11v10",
  proveedores: "M4 21V8l8-5 8 5v13M9 21v-6h6v6",
  etiquetas: "M4 5v14M7 5v14M11 5v14M14 5v14M18 5v14M20 5v14",
  importar: "M12 16V4M7 9l5-5 5 5M4 20h16",
  gastos: "M3 7h16a2 2 0 0 1 2 2v10H3V7ZM3 7l2-3h12M16 14h.01",
  clientes: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20c0-3 3-5 6-5s6 2 6 5M17 11a3 3 0 1 0 0-6M21 20c0-2-1.5-3.5-4-4",
  personal: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3ZM9 12l2 2 4-4",
  tienda: "M4 9l1-5h14l1 5M4 9h16v11H4zM9 20v-6h6v6",
  cuenta: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-6 8-6s8 2 8 6",
};

function Icono({ nombre }: { nombre: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONOS[nombre]} />
    </svg>
  );
}

type Enlace = { href: string; texto: string; icono: string; badge?: number; externo?: boolean };

export function AdminNav({ nuevos, nombre, children }: { nuevos: number; nombre: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  useEffect(() => setAbierto(false), [pathname]);

  const grupos: { titulo: string | null; enlaces: Enlace[] }[] = [
    { titulo: null, enlaces: [{ href: "/admin", texto: "Resumen", icono: "resumen" }] },
    {
      titulo: "Ventas",
      enlaces: [
        { href: "/admin/pedidos", texto: "Pedidos de la tienda", icono: "pedidos", badge: nuevos },
        { href: "/admin/ventas", texto: "Ventas", icono: "ventas" },
        { href: "/pos", texto: "Punto de venta", icono: "pos", externo: true },
      ],
    },
    {
      titulo: "Catálogo",
      enlaces: [
        { href: "/admin/productos", texto: "Productos", icono: "productos" },
        { href: "/admin/categorias", texto: "Categorías", icono: "categorias" },
        { href: "/admin/compras", texto: "Compras", icono: "compras" },
        { href: "/admin/proveedores", texto: "Proveedores", icono: "proveedores" },
        { href: "/admin/etiquetas", texto: "Etiquetas", icono: "etiquetas" },
        { href: "/admin/importar", texto: "Importar", icono: "importar" },
      ],
    },
    { titulo: "Finanzas", enlaces: [{ href: "/admin/gastos", texto: "Gastos", icono: "gastos" }] },
    {
      titulo: "Personas",
      enlaces: [
        { href: "/admin/clientes", texto: "Clientes", icono: "clientes" },
        { href: "/admin/usuarios", texto: "Personal", icono: "personal" },
      ],
    },
  ];

  const activo = (e: Enlace) => !e.externo && (e.href === "/admin" ? pathname === "/admin" : pathname === e.href || pathname.startsWith(e.href + "/"));

  return (
    <div className="min-h-screen md:flex">
      {/* Barra superior en celular */}
      <div className="no-imprimir sticky top-0 z-30 flex items-center justify-between bg-negro px-4 py-3 text-marfil md:hidden">
        <Logo tono="oro" tamano="sm" />
        <button onClick={() => setAbierto(true)} className="p-2 cursor-pointer" aria-label="Abrir menú del panel" aria-expanded={abierto}><IconoMenu /></button>
      </div>

      {abierto && <div className="no-imprimir fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setAbierto(false)} aria-hidden />}

      <aside
        className={`no-imprimir fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-negro text-marfil transition-transform duration-200 md:sticky md:inset-y-auto md:top-0 md:h-screen md:w-64 md:shrink-0 md:translate-x-0 ${abierto ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Navegación del panel"
      >
        <div className="flex items-center justify-between border-b border-marfil/10 px-5 py-4">
          <div>
            <Logo tono="oro" tamano="sm" />
            <p className="mt-2 text-[0.6rem] uppercase tracking-[0.3em] text-marfil/40">Panel del dueño</p>
          </div>
          <button onClick={() => setAbierto(false)} className="p-2 md:hidden cursor-pointer" aria-label="Cerrar menú del panel"><IconoCerrar /></button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {grupos.map((g, i) => (
            <div key={g.titulo ?? i} className="mb-2">
              {g.titulo && <p className="px-5 pb-1 pt-2 text-[0.65rem] [@media(max-height:900px)]:pt-1 uppercase tracking-[0.3em] text-oro/80">{g.titulo}</p>}
              <ul>
                {g.enlaces.map((e) => (
                  <li key={e.href}>
                    <Link
                      href={e.href}
                      aria-current={activo(e) ? "page" : undefined}
                      className={`flex items-center gap-3 border-l-2 px-5 py-2 text-sm transition-colors [@media(max-height:900px)]:py-1.5 ${activo(e) ? "border-oro bg-white/10 text-oro" : "border-transparent text-marfil/80 hover:bg-white/5 hover:text-marfil"}`}
                    >
                      <Icono nombre={e.icono} />
                      <span className="flex-1">{e.texto}</span>
                      {!!e.badge && <span className="rounded-full bg-oro px-1.5 text-xs font-semibold text-negro" aria-label={`${e.badge} nuevos`}>{e.badge}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-marfil/10 py-2">
          <Link href="/tienda" className="flex items-center gap-3 px-5 py-1.5 text-sm text-marfil/70 hover:text-oro"><Icono nombre="tienda" />Ver tienda</Link>
          <Link href="/cuenta" className="flex items-center gap-3 px-5 py-1.5 text-sm text-marfil/70 hover:text-oro"><Icono nombre="cuenta" />Mi cuenta</Link>
          <div className="flex items-center justify-between gap-2 px-5 pt-1.5">
            <span className="truncate text-xs text-marfil/50" title={nombre}>{nombre}</span>
            <BotonSalir claro />
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
