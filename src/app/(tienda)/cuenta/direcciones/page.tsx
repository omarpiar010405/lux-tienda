import { requireCuenta } from "@/lib/auth";
import type { Cliente, Direccion } from "@/lib/types";
import { DireccionesCuenta } from "@/components/tienda/DireccionesCuenta";

export const metadata = { title: "Mis direcciones" };

export default async function Direcciones() {
  const { supabase, user } = await requireCuenta("/cuenta/direcciones");
  const [{ data: dirs }, { data: cli }] = await Promise.all([
    supabase.from("direcciones").select("id, alias, nombre, apellidos, telefono, calle, interior, colonia, ciudad, estado, cp, referencias, es_principal").eq("cliente_id", user.id).order("es_principal", { ascending: false }).order("created_at"),
    supabase.from("clientes").select("nombre, apellidos, telefono").eq("id", user.id).maybeSingle(),
  ]);
  const c = cli as Pick<Cliente, "nombre" | "apellidos" | "telefono"> | null;
  return (
    <div className="mx-auto max-w-4xl">
      <DireccionesCuenta clienteId={user.id} direcciones={(dirs ?? []) as Direccion[]} nombreInicial={c?.nombre ?? ""} telefonoInicial={c?.telefono ?? ""} />
    </div>
  );
}
