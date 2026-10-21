import { t } from "@/lib/ui";
import { CarritoVista } from "@/components/tienda/CarritoVista";
import { Titulo } from "@/components/tienda/Titulo";

export const metadata = { title: "Carrito" };

export default function CarritoPage() {
  return (
    <div className={`${t.contenedor} py-12`}>
      <Titulo>Tu carrito</Titulo>
      <CarritoVista />
    </div>
  );
}
