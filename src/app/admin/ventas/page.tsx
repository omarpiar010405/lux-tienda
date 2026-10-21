import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { CANALES, etiquetaCanal, fechaHora, hoyMX, inicioMes, mxn } from "@/lib/format";
import { Aviso, Seccion, TablaWrap } from "@/components/Kit";
import { ExportarCSV } from "@/components/ExportarCSV";
import { FiltroPeriodo, fechaValida } from "@/components/FiltroPeriodo";
import { input, td, th } from "@/lib/ui";

export const metadata = { title: "Ventas" };

type Fila = { venta_id: string; folio: number; fecha: string; vendedora: string; canal: string; estado: string; piezas: number; total: number; costo: number; utilidad: number; metodos: string | null };

export default async function Ventas({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; canal?: string; vendedora?: string }> }) {
  const { supabase } = await requireDueno();
  const sp = await searchParams;
  const hoy = hoyMX();
  const desde = fechaValida(sp.desde) ?? inicioMes(hoy);
  const hasta = fechaValida(sp.hasta) ?? hoy;
  const canal = CANALES.some((c) => c.valor === sp.canal) ? sp.canal! : null;
  const vendedora = sp.vendedora && /^[0-9a-f-]{36}$/i.test(sp.vendedora) ? sp.vendedora : null;

  const [{ data, error }, { data: perfiles }] = await Promise.all([
    supabase.rpc("panel_ventas", { p_desde: desde, p_hasta: hasta, p_canal: canal, p_vendedora: vendedora }),
    supabase.from("profiles").select("id, nombre").order("nombre"),
  ]);
  const filas = (data ?? []) as Fila[];
  const validas = filas.filter((f) => f.estado === "completada");
  const suma = (k: "total" | "utilidad" | "piezas") => validas.reduce((s, f) => s + Number(f[k]), 0);

  return (
    <>
      <h1 className="text-xl font-semibold">Ventas</h1>
      <FiltroPeriodo desde={desde} hasta={hasta} base="/admin/ventas" extra={{ canal: canal ?? undefined, vendedora: vendedora ?? undefined }}>
        <label className="text-sm text-neutral-600">Canal
          <select name="canal" defaultValue={canal ?? ""} className={input}>
            <option value="">Todos</option>
            {CANALES.map((c) => <option key={c.valor} value={c.valor}>{c.etiqueta}</option>)}
          </select>
        </label>
        <label className="text-sm text-neutral-600">Vendedora
          <select name="vendedora" defaultValue={vendedora ?? ""} className={input}>
            <option value="">Todas</option>
            {(perfiles ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
      </FiltroPeriodo>

      {error && <Aviso>{error.message}</Aviso>}

      <Seccion
        titulo={`${validas.length} ventas · ${mxn(suma("total"))} · utilidad ${mxn(suma("utilidad"))}`}
        acciones={<ExportarCSV nombre={`ventas_${desde}_${hasta}`} filas={[["Folio", "Fecha", "Vendedora", "Canal", "Estado", "Piezas", "Total", "Costo", "Utilidad", "Pago"], ...filas.map((f) => [f.folio, f.fecha, f.vendedora, f.canal, f.estado, f.piezas, f.total, f.costo, f.utilidad, f.metodos])]} />}
      >
        <TablaWrap>
          <thead><tr><th className={th}>Folio</th><th className={th}>Fecha</th><th className={th}>Vendedora</th><th className={th}>Canal</th><th className={th}>Pago</th><th className={th}>Pzs</th><th className={th}>Total</th><th className={th}>Utilidad</th></tr></thead>
          <tbody className="divide-y">
            {filas.length === 0 && <tr><td className={td} colSpan={8}>Sin ventas en el periodo.</td></tr>}
            {filas.map((f) => (
              <tr key={f.venta_id} className={f.estado === "cancelada" ? "text-neutral-400 line-through" : ""}>
                <td className={td}><Link href={`/admin/ventas/${f.venta_id}`} className="underline">#{f.folio}</Link></td>
                <td className={td}>{fechaHora(f.fecha)}</td><td className={td}>{f.vendedora}</td><td className={td}>{etiquetaCanal(f.canal)}</td>
                <td className={td}>{f.metodos}</td><td className={td}>{f.piezas}</td><td className={td}>{mxn(Number(f.total))}</td><td className={td}>{mxn(Number(f.utilidad))}</td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
        {filas.length >= 1000 && <Aviso tipo="info">Se muestran las 1,000 más recientes; acota el periodo.</Aviso>}
      </Seccion>
    </>
  );
}
