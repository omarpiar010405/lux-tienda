import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { MARCA } from "@/lib/marca";
import { AbrirCaja } from "@/components/AbrirCaja";
import { CierreCaja } from "@/components/CierreCaja";
import { Seccion, TablaWrap } from "@/components/Kit";
import { fechaHora, mxn } from "@/lib/format";
import type { ResumenCaja } from "@/lib/types";
import { td, th } from "@/lib/ui";

export const metadata = { title: "Caja" };

type Corte = { id: string; abierto_at: string; cerrado_at: string | null; fondo_inicial: number; efectivo_contado: number | null; notas: string | null };

export default async function CajaPage() {
  const { supabase } = await requireStaff();
  if (!MARCA.usarCaja) redirect("/pos"); // caja desactivada (ADR-017)
  const [{ data: actual }, { data: cortes }] = await Promise.all([
    supabase.rpc("resumen_caja"),
    supabase.from("cortes_caja").select("id, abierto_at, cerrado_at, fondo_inicial, efectivo_contado, notas").order("abierto_at", { ascending: false }).limit(10),
  ]);
  const lista = (cortes ?? []) as Corte[];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Caja</h1>
      {actual ? <CierreCaja resumen={actual as ResumenCaja} /> : <AbrirCaja />}

      <Seccion titulo="Últimos cortes">
        <TablaWrap>
          <thead><tr><th className={th}>Apertura</th><th className={th}>Cierre</th><th className={th}>Fondo</th><th className={th}>Contado</th><th className={th}>Notas</th></tr></thead>
          <tbody className="divide-y">
            {lista.length === 0 && <tr><td className={td} colSpan={5}>Aún no hay cortes.</td></tr>}
            {lista.map((c) => (
              <tr key={c.id}>
                <td className={td}>{fechaHora(c.abierto_at)}</td>
                <td className={td}>{c.cerrado_at ? fechaHora(c.cerrado_at) : <span className="text-emerald-700">Abierta</span>}</td>
                <td className={td}>{mxn(Number(c.fondo_inicial))}</td>
                <td className={td}>{c.efectivo_contado != null ? mxn(Number(c.efectivo_contado)) : "—"}</td>
                <td className={td}>{c.notas ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
      </Seccion>
    </div>
  );
}
