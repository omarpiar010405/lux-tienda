import { requireStaff } from "@/lib/auth";
import { Pos } from "@/components/Pos";
import { AbrirCaja } from "@/components/AbrirCaja";
import { MARCA } from "@/lib/marca";

export const metadata = { title: "Vender" };

export default async function PosPage() {
  const { supabase } = await requireStaff();
  // La caja está desactivada por ahora (ADR-017): se vende sin abrirla. Con NEXT_PUBLIC_USAR_CAJA=true vuelve a exigirse.
  if (MARCA.usarCaja) {
    const { data: caja } = await supabase.rpc("resumen_caja");
    if (!caja) return <AbrirCaja />;
  }
  return <Pos tienda={process.env.NEXT_PUBLIC_NOMBRE_TIENDA ?? "LUX"} />;
}
