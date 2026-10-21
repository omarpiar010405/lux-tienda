import { requireDueno } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { perfil, supabase } = await requireDueno();
  const { count: nuevos } = await supabase.from("pedidos").select("id", { count: "exact", head: true }).eq("estado", "nuevo");
  return <AdminNav nuevos={nuevos ?? 0} nombre={perfil.nombre}>{children}</AdminNav>;
}
