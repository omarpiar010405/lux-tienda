import { requireDueno } from "@/lib/auth";
import { UsuariosAdmin, type Usuario } from "@/components/UsuariosAdmin";
import { Aviso } from "@/components/Kit";
import { AltaEmpleado } from "@/components/AltaEmpleado";

export const metadata = { title: "Usuarios" };

export default async function Usuarios() {
  const { supabase, user } = await requireDueno();
  const { data } = await supabase.from("profiles").select("id, nombre, rol, activo").in("rol", ["dueno", "vendedora"]).order("created_at");
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Personal</h1>
      </div>
      <AltaEmpleado />
      <Aviso tipo="info">Aquí está el personal con acceso. Usa <b>Alta de empleado</b> para crear una cuenta nueva. Si la persona ya se registró en la tienda, búscala en <b>Clientes</b> y pulsa “Dar acceso como vendedora”.</Aviso>
      <UsuariosAdmin usuarios={(data ?? []) as Usuario[]} yo={user.id} />
    </>
  );
}
