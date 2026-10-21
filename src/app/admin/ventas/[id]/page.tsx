import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDueno } from "@/lib/auth";
import { detalleOpciones, etiquetaCanal, etiquetaMetodo, fechaHora, mxn } from "@/lib/format";
import { utilidadRenglon } from "@/lib/calculos";
import type { Opciones } from "@/lib/types";
import { Seccion, TablaWrap } from "@/components/Kit";
import { BotonCancelarVenta } from "@/components/BotonCancelarVenta";
import { td, th } from "@/lib/ui";

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

type Venta = {
  id: string; folio: number; created_at: string; canal: string; cliente: string | null; notas: string | null; total: number; estado: string;
  vendedora: Uno<{ nombre: string }>;
  pagos: { metodo: string; monto: number }[];
  venta_items: {
    id: string; cantidad: number; precio_unitario: number; descuento: number;
    venta_item_costos: Uno<{ costo_unitario: number }>;
    variantes: Uno<{ opciones: Opciones; productos: Uno<{ nombre: string; marca: string | null }> }>;
  }[];
};

export default async function DetalleVenta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireDueno();
  const { data } = await supabase
    .from("ventas")
    .select("id, folio, created_at, canal, cliente, notas, total, estado, vendedora:profiles(nombre), pagos(metodo, monto), venta_items(id, cantidad, precio_unitario, descuento, venta_item_costos(costo_unitario), variantes(opciones, productos(nombre, marca)))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const v = data as unknown as Venta;

  const renglones = v.venta_items.map((i) => {
    const variante = uno(i.variantes);
    const prod = variante ? uno(variante.productos) : null;
    const costo = Number(uno(i.venta_item_costos)?.costo_unitario ?? 0);
    return {
      id: i.id, nombre: prod?.nombre ?? "Producto", detalle: variante ? detalleOpciones(variante.opciones) : "",
      cantidad: i.cantidad, precio: Number(i.precio_unitario), descuento: Number(i.descuento), costo,
      utilidad: utilidadRenglon(Number(i.precio_unitario), i.cantidad, Number(i.descuento), costo),
    };
  });
  const utilidad = renglones.reduce((s, r) => s + r.utilidad, 0);

  return (
    <>
      <Link href="/admin/ventas" className="text-sm underline text-neutral-600">← Ventas</Link>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Venta #{v.folio} {v.estado === "cancelada" && <span className="text-red-600">(cancelada)</span>}</h1>
          <p className="text-sm text-neutral-500">
            {fechaHora(v.created_at)} · {uno(v.vendedora)?.nombre ?? "—"} · {etiquetaCanal(v.canal)}{v.cliente ? ` · ${v.cliente}` : ""}
          </p>
          {v.notas && <p className="text-sm text-neutral-500">Nota: {v.notas}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/pos/ventas/${v.folio}`} className="inline-flex rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium">Ver ticket</Link>
          {v.estado === "completada" && <BotonCancelarVenta ventaId={v.id} folio={v.folio} />}
        </div>
      </div>

      <Seccion titulo="Renglones">
        <TablaWrap>
          <thead><tr><th className={th}>Producto</th><th className={th}>Cant.</th><th className={th}>Precio</th><th className={th}>Desc.</th><th className={th}>Costo</th><th className={th}>Utilidad</th></tr></thead>
          <tbody className="divide-y">
            {renglones.map((r) => (
              <tr key={r.id}>
                <td className={td}>{r.nombre} <span className="text-neutral-500">{r.detalle}</span></td><td className={td}>{r.cantidad}</td>
                <td className={td}>{mxn(r.precio)}</td><td className={td}>{r.descuento ? mxn(r.descuento) : "—"}</td>
                <td className={td}>{r.costo ? mxn(r.costo) : <span className="text-amber-600">sin costo</span>}</td><td className={td}>{mxn(r.utilidad)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="font-medium border-t"><td className={td} colSpan={5}>Total {mxn(Number(v.total))}</td><td className={td}>{mxn(utilidad)}</td></tr></tfoot>
        </TablaWrap>
      </Seccion>

      <Seccion titulo="Pagos">
        <ul className="text-sm">{v.pagos.map((p, i) => <li key={i}>{etiquetaMetodo(p.metodo)}: {mxn(Number(p.monto))}</li>)}</ul>
      </Seccion>
    </>
  );
}
