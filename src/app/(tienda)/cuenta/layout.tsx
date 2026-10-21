import Link from "next/link";
import { requireCuenta } from "@/lib/auth";
import { BotonSalir } from "@/components/BotonSalir";
import { t } from "@/lib/ui";
import { Titulo } from "@/components/tienda/Titulo";

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await requireCuenta("/cuenta");
  const enlace = "border-b-2 border-transparent pb-2 text-xs uppercase tracking-[0.2em] hover:border-oro";
  return (
    <div className={`${t.contenedor} py-12`}>
      <Titulo sub={perfil.nombre}>Mi cuenta</Titulo>
      <nav className="mb-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2" aria-label="Mi cuenta">
        <Link href="/cuenta" className={enlace}>Mis datos</Link>
        <Link href="/cuenta/direcciones" className={enlace}>Direcciones</Link>
        <Link href="/cuenta/pedidos" className={enlace}>Mis pedidos</Link>
        <BotonSalir />
      </nav>
      {children}
    </div>
  );
}
