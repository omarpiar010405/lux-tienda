import { requireDueno } from "@/lib/auth";
import { ProveedoresAdmin, type Proveedor } from "@/components/ProveedoresAdmin";

export const metadata = { title: "Proveedores" };

export default async function Proveedores() {
  const { supabase } = await requireDueno();
  const { data } = await supabase.from("proveedores").select("id, nombre, contacto, activo").order("nombre");
  return (
    <>
      <h1 className="text-xl font-semibold">Proveedores</h1>
      <ProveedoresAdmin proveedores={(data ?? []) as Proveedor[]} />
    </>
  );
}
