import { getSesion } from "@/lib/auth";
import { CarritoProvider } from "@/components/tienda/CarritoContext";
import { HeaderTienda } from "@/components/tienda/HeaderTienda";
import { FooterTienda } from "@/components/tienda/FooterTienda";

export const dynamic = "force-dynamic";

export default async function TiendaLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await getSesion();
  return (
    <CarritoProvider>
      <div className="flex min-h-screen flex-col bg-marfil text-negro">
        <HeaderTienda sesion={perfil ? { nombre: perfil.nombre, rol: perfil.rol } : null} />
        <main className="flex-1">{children}</main>
        <FooterTienda />
      </div>
    </CarritoProvider>
  );
}
