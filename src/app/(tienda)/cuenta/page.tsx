import { requireCuenta } from "@/lib/auth";
import type { Cliente } from "@/lib/types";
import { CambiarPassword } from "@/components/tienda/CambiarPassword";
import { FormularioDatos } from "@/components/tienda/FormularioDatos";

export const metadata = { title: "Mis datos" };

export default async function MisDatos() {
  const { supabase, user } = await requireCuenta("/cuenta");
  const { data } = await supabase.from("clientes").select("id, nombre, apellidos, email, telefono, acepta_novedades").eq("id", user.id).maybeSingle();
  const cliente = (data as Cliente | null) ?? { id: user.id, nombre: "", apellidos: null, email: user.email ?? null, telefono: null, acepta_novedades: false };
  return (
    <div className="flex flex-col items-center gap-8">
      <FormularioDatos cliente={cliente} />
      <CambiarPassword />
    </div>
  );
}
