import { requireCuenta } from "@/lib/auth";
import type { Cliente, Direccion } from "@/lib/types";
import { t } from "@/lib/ui";
import { Checkout } from "@/components/tienda/Checkout";
import { Titulo } from "@/components/tienda/Titulo";

export const metadata = { title: "Finalizar pedido" };

export default async function CheckoutPage() {
  const { supabase, user } = await requireCuenta("/checkout");
  const [{ data: cli }, { data: dirs }] = await Promise.all([
    supabase.from("clientes").select("id, nombre, apellidos, email, telefono, acepta_novedades").eq("id", user.id).maybeSingle(),
    supabase.from("direcciones").select("id, alias, nombre, apellidos, telefono, calle, interior, colonia, ciudad, estado, cp, referencias, es_principal").eq("cliente_id", user.id).order("es_principal", { ascending: false }).order("created_at"),
  ]);
  const cliente = (cli as Cliente | null) ?? { id: user.id, nombre: "", apellidos: null, email: user.email ?? null, telefono: null, acepta_novedades: false };
  return (
    <div className={`${t.contenedor} py-12`}>
      <Titulo>Finalizar pedido</Titulo>
      <Checkout cliente={cliente} direcciones={(dirs ?? []) as Direccion[]} />
    </div>
  );
}
