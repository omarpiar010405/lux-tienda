import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { detalleOpciones, fechaCorta, hoyMX, inicioMes, mxn } from "@/lib/format";
import { margenPct } from "@/lib/calculos";
import type { Opciones } from "@/lib/types";
import { Aviso, Seccion, Tarjeta, TablaWrap } from "@/components/Kit";
import { ExportarCSV } from "@/components/ExportarCSV";
import { FiltroPeriodo, fechaValida } from "@/components/FiltroPeriodo";
import { td, th } from "@/lib/ui";

export const metadata = { title: "Resumen" };

type Resumen = {
  num_ventas: number; piezas: number; ventas: number; costo_vendido: number; utilidad_bruta: number; inversion: number;
  gastos_subtotal: number; gastos_iva: number; gastos_total: number; ganancia_neta: number;
};
type PorCategoria = { categoria: string; piezas: number; ventas: number; costo: number; utilidad_bruta: number; inversion: number; ganancia_neta: number };
type Inventario = { variantes: number; piezas: number; valor_costo: number; valor_precio: number; sin_costo: number };
type StockBajo = { variante_id: string; producto_id: string; nombre: string; marca: string | null; categoria: string; opciones: Opciones; stock: number; precio: number };
type SinMov = { variante_id: string; producto_id: string; nombre: string; marca: string | null; opciones: Opciones; stock: number; ultima_venta: string | null };
type Vendido = { producto_id: string; nombre: string; marca: string | null; piezas: number; ventas: number; utilidad: number; margen_pct: number };
type Gasto = { id: string; fecha: string; concepto: string; categoria: string; subtotal: number; iva: number; total: number };

export default async function Panel({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const { supabase } = await requireDueno();
  const sp = await searchParams;
  const hoy = hoyMX();
  const desde = fechaValida(sp.desde) ?? inicioMes(hoy);
  const hasta = fechaValida(sp.hasta) ?? hoy;
  const p = { p_desde: desde, p_hasta: hasta };

  const [rRes, rCat, rGas, rInv, rBajo, rSin, rTop] = await Promise.all([
    supabase.rpc("panel_resumen", p),
    supabase.rpc("panel_por_categoria", p),
    supabase.from("gastos").select("id, fecha, concepto, categoria, subtotal, iva, total").gte("fecha", desde).lte("fecha", hasta).order("fecha", { ascending: false }),
    supabase.rpc("panel_inventario"),
    supabase.rpc("panel_stock_bajo", { p_umbral: 2 }),
    supabase.rpc("panel_sin_movimiento", { p_dias: 30 }),
    supabase.rpc("panel_mas_vendidos", { ...p, p_limit: 10 }),
  ]);

  const fallo = [rRes, rCat, rGas, rInv, rBajo, rSin, rTop].find((r) => r.error)?.error;
  const r = ((rRes.data ?? []) as Resumen[])[0];
  const cats = (rCat.data ?? []) as PorCategoria[];
  const gastos = (rGas.data ?? []) as Gasto[];
  const inv = ((rInv.data ?? []) as Inventario[])[0];
  const bajo = (rBajo.data ?? []) as StockBajo[];
  const sin = (rSin.data ?? []) as SinMov[];
  const top = (rTop.data ?? []) as Vendido[];

  const num = (x: number | undefined) => Number(x ?? 0);

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-semibold">Resumen</h1>
        <p className="text-sm text-neutral-500">{fechaCorta(desde)} – {fechaCorta(hasta)}</p>
      </div>
      <FiltroPeriodo desde={desde} hasta={hasta} base="/admin" />

      {fallo && <Aviso>No se pudo cargar el panel: {fallo.message}. ¿Ya ejecutaste las migraciones 0004 y 0005?</Aviso>}

      {r && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tarjeta titulo="Ventas" valor={mxn(num(r.ventas))} nota={`${r.num_ventas} ventas · ${r.piezas} piezas`} />
            <Tarjeta titulo="Utilidad bruta" valor={mxn(num(r.utilidad_bruta))} nota={`Margen ${margenPct(num(r.utilidad_bruta), num(r.ventas))}%`} />
            <Tarjeta titulo="Gastos" valor={mxn(num(r.gastos_total))} nota={`Subtotal ${mxn(num(r.gastos_subtotal))} + IVA ${mxn(num(r.gastos_iva))}`} />
            <Tarjeta titulo="Ganancia neta" valor={mxn(num(r.ganancia_neta))} tono={num(r.ganancia_neta) < 0 ? "mal" : "bien"} nota="Utilidad bruta − gastos (provisional)" />
            <Tarjeta titulo="Inversión en compras" valor={mxn(num(r.inversion))} nota="Se muestra aparte: lo no vendido sigue siendo inventario" />
            <Tarjeta titulo="Costo de lo vendido" valor={mxn(num(r.costo_vendido))} />
            {inv && <Tarjeta titulo="Inventario a costo" valor={mxn(num(inv.valor_costo))} nota={`${inv.piezas} piezas${inv.sin_costo ? ` · ${inv.sin_costo} variantes sin costo` : ""}`} />}
            {inv && <Tarjeta titulo="Inventario a precio de venta" valor={mxn(num(inv.valor_precio))} />}
          </div>

          <Seccion
            titulo="Por categoría"
            acciones={<ExportarCSV nombre={`categorias_${desde}_${hasta}`} filas={[["Categoría", "Piezas", "Ventas", "Costo", "Utilidad bruta", "Inversión", "Ganancia neta"], ...cats.map((c) => [c.categoria, c.piezas, c.ventas, c.costo, c.utilidad_bruta, c.inversion, c.ganancia_neta])]} />}
          >
            <TablaWrap>
              <thead><tr><th className={th}>Categoría</th><th className={th}>Piezas</th><th className={th}>Ventas</th><th className={th}>Costo</th><th className={th}>Utilidad bruta</th><th className={th}>Inversión</th><th className={th}>Ganancia neta*</th></tr></thead>
              <tbody className="divide-y">
                {cats.length === 0 && <tr><td className={td} colSpan={7}>Sin movimientos en el periodo.</td></tr>}
                {cats.map((c) => (
                  <tr key={c.categoria}>
                    <td className={td}>{c.categoria}</td><td className={td}>{c.piezas}</td><td className={td}>{mxn(num(c.ventas))}</td>
                    <td className={td}>{mxn(num(c.costo))}</td><td className={td}>{mxn(num(c.utilidad_bruta))}</td>
                    <td className={td}>{mxn(num(c.inversion))}</td><td className={td}>{mxn(num(c.ganancia_neta))}</td>
                  </tr>
                ))}
              </tbody>
            </TablaWrap>
            <p className="text-xs text-neutral-500">* Los gastos se reparten entre categorías en proporción a sus ventas.</p>
          </Seccion>

          <Seccion
            titulo="Egresos"
            acciones={<ExportarCSV nombre={`egresos_${desde}_${hasta}`} filas={[["Fecha", "Concepto", "Categoría", "Subtotal", "IVA", "Total"], ...gastos.map((g) => [g.fecha, g.concepto, g.categoria, g.subtotal, g.iva, g.total])]} />}
          >
            <TablaWrap>
              <thead><tr><th className={th}>Fecha</th><th className={th}>Concepto</th><th className={th}>Categoría</th><th className={th}>Subtotal</th><th className={th}>IVA</th><th className={th}>Total</th></tr></thead>
              <tbody className="divide-y">
                {gastos.length === 0 && <tr><td className={td} colSpan={6}>Sin gastos en el periodo. <Link href="/admin/gastos" className="underline">Registrar gasto</Link></td></tr>}
                {gastos.map((g) => (
                  <tr key={g.id}><td className={td}>{fechaCorta(g.fecha)}</td><td className={td}>{g.concepto}</td><td className={td}>{g.categoria}</td><td className={td}>{mxn(num(g.subtotal))}</td><td className={td}>{mxn(num(g.iva))}</td><td className={td}>{mxn(num(g.total))}</td></tr>
                ))}
              </tbody>
              {gastos.length > 0 && (
                <tfoot><tr className="font-medium border-t"><td className={td} colSpan={3}>Total</td><td className={td}>{mxn(num(r.gastos_subtotal))}</td><td className={td}>{mxn(num(r.gastos_iva))}</td><td className={td}>{mxn(num(r.gastos_total))}</td></tr></tfoot>
              )}
            </TablaWrap>
          </Seccion>
        </>
      )}

      <Seccion titulo="Más vendidos del periodo">
        <TablaWrap>
          <thead><tr><th className={th}>Producto</th><th className={th}>Piezas</th><th className={th}>Ventas</th><th className={th}>Utilidad</th><th className={th}>Margen</th></tr></thead>
          <tbody className="divide-y">
            {top.length === 0 && <tr><td className={td} colSpan={5}>Sin ventas en el periodo.</td></tr>}
            {top.map((t) => (
              <tr key={t.producto_id}>
                <td className={td}><Link href={`/admin/productos/${t.producto_id}`} className="underline">{t.nombre}</Link>{t.marca ? ` · ${t.marca}` : ""}</td>
                <td className={td}>{t.piezas}</td><td className={td}>{mxn(num(t.ventas))}</td><td className={td}>{mxn(num(t.utilidad))}</td><td className={td}>{num(t.margen_pct)}%</td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
      </Seccion>

      <div className="grid md:grid-cols-2 gap-5">
        <Seccion titulo="Stock bajo (2 o menos)">
          <TablaWrap>
            <tbody className="divide-y">
              {bajo.length === 0 && <tr><td className={td}>Todo en orden.</td></tr>}
              {bajo.map((b) => (
                <tr key={b.variante_id}>
                  <td className={td}><Link href={`/admin/productos/${b.producto_id}`} className="underline">{b.nombre}</Link> <span className="text-neutral-500">{detalleOpciones(b.opciones)}</span></td>
                  <td className={`${td} text-right ${b.stock === 0 ? "text-red-600" : ""}`}>{b.stock} pzs</td>
                </tr>
              ))}
            </tbody>
          </TablaWrap>
        </Seccion>

        <Seccion titulo="Sin vender en 30 días">
          <TablaWrap>
            <tbody className="divide-y">
              {sin.length === 0 && <tr><td className={td}>Nada estancado.</td></tr>}
              {sin.map((s) => (
                <tr key={s.variante_id}>
                  <td className={td}><Link href={`/admin/productos/${s.producto_id}`} className="underline">{s.nombre}</Link> <span className="text-neutral-500">{detalleOpciones(s.opciones)}</span></td>
                  <td className={`${td} text-right`}>{s.stock} pzs</td>
                </tr>
              ))}
            </tbody>
          </TablaWrap>
        </Seccion>
      </div>
    </>
  );
}
