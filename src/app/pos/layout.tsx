import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { BotonSalir } from "@/components/BotonSalir";
import { MARCA } from "@/lib/marca";
import { Logo } from "@/components/tienda/Logo";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await requireStaff();
  return (
    <div className="min-h-screen">
      <header className="no-imprimir sticky top-0 z-10 bg-negro text-marfil">
        <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-3">
          <Logo tono="oro" tamano="sm" />
          <nav className="flex flex-1 gap-5 overflow-x-auto text-sm font-medium" aria-label="Punto de venta">
            <Link href="/pos" className="whitespace-nowrap hover:text-oro">Vender</Link>
            <Link href="/pos/ventas" className="whitespace-nowrap hover:text-oro">Ventas de hoy</Link>
            {MARCA.usarCaja && <Link href="/pos/caja" className="whitespace-nowrap hover:text-oro">Caja</Link>}
            <Link href="/cuenta" className="whitespace-nowrap hover:text-oro">Mi cuenta</Link>
            {perfil.rol === "dueno" && <Link href="/admin" className="whitespace-nowrap hover:text-oro">Panel</Link>}
          </nav>
          <span className="hidden text-sm text-marfil/60 sm:inline">{perfil.nombre}</span>
          <BotonSalir claro />
        </div>
      </header>
      <div className="mx-auto max-w-6xl p-4">{children}</div>
    </div>
  );
}
