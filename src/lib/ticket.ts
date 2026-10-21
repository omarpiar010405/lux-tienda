import { detalleOpciones, etiquetaCanal, etiquetaMetodo, fechaHora, mxn } from "./format";
import type { Canal, MetodoPago, Opciones, TicketData } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function ticketTexto(t: TicketData, tienda: string): string {
  const lineas = [
    tienda,
    `Ticket #${t.folio} · ${fechaHora(t.created_at)}`,
    `Canal: ${etiquetaCanal(t.canal)}${t.cliente ? ` · ${t.cliente}` : ""}`,
    "------------------------------",
    ...t.items.flatMap((i) => {
      const base = `${i.cantidad} × ${i.nombre}${i.detalle ? ` (${i.detalle})` : ""}  ${mxn(i.precio_unitario * i.cantidad)}`;
      return i.descuento > 0 ? [base, `   Descuento -${mxn(i.descuento)}`] : [base];
    }),
    "------------------------------",
    `TOTAL: ${mxn(t.total)}`,
    ...t.pagos.map((p) => `Pago ${etiquetaMetodo(p.metodo)}: ${mxn(p.monto)}`),
    ...(t.estado === "cancelada" ? ["** VENTA CANCELADA **"] : []),
    "¡Gracias por tu compra!",
  ];
  return lineas.join("\n");
}

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

type Crudo = {
  folio: number;
  created_at: string;
  canal: Canal;
  cliente: string | null;
  total: number;
  estado: "completada" | "cancelada";
  pagos: { metodo: MetodoPago; monto: number }[];
  venta_items: {
    cantidad: number;
    precio_unitario: number;
    descuento: number;
    variantes: Uno<{ opciones: Opciones; productos: Uno<{ nombre: string; marca: string | null }> }>;
  }[];
};

/** Lee una venta por folio (RLS: la vendedora solo ve las suyas). */
export async function obtenerTicket(supabase: SupabaseClient, folio: number): Promise<TicketData | null> {
  const { data } = await supabase
    .from("ventas")
    .select(
      "folio, created_at, canal, cliente, total, estado, pagos(metodo, monto), venta_items(cantidad, precio_unitario, descuento, variantes(opciones, productos(nombre, marca)))"
    )
    .eq("folio", folio)
    .maybeSingle();
  if (!data) return null;

  const v = data as unknown as Crudo;
  return {
    folio: v.folio,
    created_at: v.created_at,
    canal: v.canal,
    cliente: v.cliente,
    total: Number(v.total),
    estado: v.estado,
    pagos: v.pagos.map((p) => ({ metodo: p.metodo, monto: Number(p.monto) })),
    items: v.venta_items.map((i) => {
      const variante = uno(i.variantes);
      const producto = variante ? uno(variante.productos) : null;
      return {
        cantidad: i.cantidad,
        precio_unitario: Number(i.precio_unitario),
        descuento: Number(i.descuento),
        nombre: producto ? `${producto.nombre}${producto.marca ? ` ${producto.marca}` : ""}` : "Producto",
        detalle: variante ? detalleOpciones(variante.opciones) : "",
      };
    }),
  };
}
