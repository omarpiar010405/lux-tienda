import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { etiquetaCanal, fechaHora, hoyMX, mxn } from "@/lib/format";
import { TablaWrap } from "@/components/Kit";
import { td, th } from "@/lib/ui";

export const metadata = { title: "Ventas de hoy" };

type Fila = { folio: number; created_at: string; canal: string; total: number; estado: string };

export default async function VentasHoy() {
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("ventas")
    .select("folio, created_at, canal, total, estado")
    .gte("created_at", `${hoyMX()}T00:00:00-06:00`)
    .order("created_at", { ascending: false })
    .limit(100);
  const filas = (data ?? []) as Fila[];
  const total = filas.filter((f) => f.estado === "completada").reduce((s, f) => s + Number(f.total), 0);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Ventas de hoy · {mxn(total)}</h1>
      <TablaWrap>
        <thead><tr><th className={th}>Folio</th><th className={th}>Hora</th><th className={th}>Canal</th><th className={th}>Total</th></tr></thead>
        <tbody className="divide-y">
          {filas.length === 0 && <tr><td className={td} colSpan={4}>Todavía no hay ventas hoy.</td></tr>}
          {filas.map((f) => (
            <tr key={f.folio} className={f.estado === "cancelada" ? "text-neutral-400 line-through" : ""}>
              <td className={td}><Link href={`/pos/ventas/${f.folio}`} className="underline">#{f.folio}</Link></td>
              <td className={td}>{fechaHora(f.created_at)}</td><td className={td}>{etiquetaCanal(f.canal)}</td><td className={td}>{mxn(Number(f.total))}</td>
            </tr>
          ))}
        </tbody>
      </TablaWrap>
    </div>
  );
}
