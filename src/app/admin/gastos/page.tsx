import { requireDueno } from "@/lib/auth";
import { hoyMX, inicioMes, mxn } from "@/lib/format";
import { GastosAdmin, type Gasto } from "@/components/GastosAdmin";
import { ExportarCSV } from "@/components/ExportarCSV";
import { FiltroPeriodo, fechaValida } from "@/components/FiltroPeriodo";

export const metadata = { title: "Gastos" };

export default async function Gastos({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const { supabase } = await requireDueno();
  const sp = await searchParams;
  const hoy = hoyMX();
  const desde = fechaValida(sp.desde) ?? inicioMes(hoy);
  const hasta = fechaValida(sp.hasta) ?? hoy;

  const { data } = await supabase
    .from("gastos")
    .select("id, fecha, concepto, categoria, subtotal, iva, total, recurrente")
    .gte("fecha", desde).lte("fecha", hasta)
    .order("fecha", { ascending: false }).order("created_at", { ascending: false });
  const gastos = (data ?? []) as Gasto[];
  const suma = (k: "subtotal" | "iva" | "total") => gastos.reduce((s, g) => s + Number(g[k]), 0);

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-semibold">Gastos</h1>
        <ExportarCSV nombre={`gastos_${desde}_${hasta}`} filas={[["Fecha", "Concepto", "Categoría", "Subtotal", "IVA", "Total"], ...gastos.map((g) => [g.fecha, g.concepto, g.categoria, g.subtotal, g.iva, g.total])]} />
      </div>
      <FiltroPeriodo desde={desde} hasta={hasta} base="/admin/gastos" />
      <p className="text-sm text-neutral-600">Subtotal {mxn(suma("subtotal"))} + IVA {mxn(suma("iva"))} = <b>{mxn(suma("total"))}</b></p>
      <GastosAdmin gastos={gastos} />
    </>
  );
}
