import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDueno } from "@/lib/auth";
import { urlWhatsApp } from "@/lib/catalogo";
import { formatearDireccion } from "@/lib/clientes";
import { firmarComprobantes, type ComprobanteFila } from "@/lib/comprobantesServidor";
import { ESTADOS_PEDIDO, detalleOpciones, fechaHora, mxn } from "@/lib/format";
import { MARCA } from "@/lib/marca";
import { etiquetaPago } from "@/lib/pagos";
import type { EntregaPedido, EstadoPedido, MetodoPago, Opciones } from "@/lib/types";
import { AccionesPedido } from "@/components/AccionesPedido";
import { ListaComprobantes } from "@/components/ListaComprobantes";
import { Seccion, TablaWrap } from "@/components/Kit";
import { card, td, th } from "@/lib/ui";

type Pedido = {
  id: string; numero: number; estado: EstadoPedido; entrega: EntregaPedido; metodo_pago: MetodoPago; total: number; subtotal: number; notas: string | null; created_at: string;
  contacto_nombre: string; contacto_email: string | null; contacto_telefono: string; venta_id: string | null;
  direccion: { nombre: string; apellidos: string | null; telefono: string; calle: string; interior: string | null; colonia: string; ciudad: string; estado: string; cp: string; referencias: string | null } | null;
  pedido_items: { id: string; cantidad: number; precio_unitario: number; nombre: string; opciones: Opciones }[];
  pedido_comprobantes: ComprobanteFila[];
};

export default async function DetallePedidoAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireDueno();
  const { data } = await supabase
    .from("pedidos")
    .select("id, numero, estado, entrega, metodo_pago, total, subtotal, notas, created_at, contacto_nombre, contacto_email, contacto_telefono, venta_id, direccion, pedido_items(id, cantidad, precio_unitario, nombre, opciones), pedido_comprobantes(id, ruta, nombre_original, tipo_mime, tamano, created_at)")
    .eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as unknown as Pedido;
  const comprobantes = await firmarComprobantes(supabase, p.pedido_comprobantes ?? []);

  const wa = urlWhatsApp(`52${p.contacto_telefono}`, `Hola ${p.contacto_nombre}, te escribimos de ${MARCA.nombre} ${MARCA.subtitulo} sobre tu pedido #${p.numero}.`);

  return (
    <>
      <Link href="/admin/pedidos" className="text-sm underline text-neutral-600">← Pedidos</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Pedido #{p.numero}</h1>
          <p className="text-sm text-neutral-500">{fechaHora(p.created_at)}</p>
        </div>
        <span className={`px-3 py-1 text-sm ${ESTADOS_PEDIDO[p.estado].estilo}`}>{ESTADOS_PEDIDO[p.estado].etiqueta}</span>
      </div>

      <div className={`${card} space-y-3 p-4`}>
        <AccionesPedido pedidoId={p.id} estado={p.estado} entrega={p.entrega} metodoPago={p.metodo_pago} comprobantes={comprobantes.length} />
        {p.venta_id && <p className="text-sm"><Link href={`/admin/ventas/${p.venta_id}`} className="underline">Ver la venta registrada</Link></p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={`${card} p-4`}>
          <h2 className="mb-2 font-semibold">Cliente</h2>
          <p className="text-sm">{p.contacto_nombre}<br />{p.contacto_email}<br />{p.contacto_telefono}</p>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-emerald-700 underline">Escribir por WhatsApp</a>
          {p.notas && <p className="mt-3 text-sm text-neutral-600">Notas: {p.notas}</p>}
        </div>
        <div className={`${card} p-4`}>
          <h2 className="mb-2 font-semibold">Entrega: {p.entrega === "envio" ? "envío a domicilio" : "recoger en tienda"}</h2>
          {p.direccion ? (
            <p className="text-sm">
              {p.direccion.nombre}{p.direccion.apellidos ? ` ${p.direccion.apellidos}` : ""} · {p.direccion.telefono}<br />
              {formatearDireccion(p.direccion)}
              {p.direccion.referencias && <><br /><span className="text-neutral-500">{p.direccion.referencias}</span></>}
            </p>
          ) : <p className="text-sm text-neutral-600">No requiere dirección.</p>}
        </div>
      </div>

      <Seccion titulo={`Pago: ${etiquetaPago(p.metodo_pago)}`}>
        {p.metodo_pago === "transferencia" ? (
          comprobantes.length > 0 ? (
            <div className={`${card} space-y-2 p-4`}>
              <p className="text-sm text-neutral-600">{comprobantes.length} comprobante{comprobantes.length === 1 ? "" : "s"} · toca para abrir (los enlaces duran 1 hora). Verifica el monto de {mxn(Number(p.total))} en tu banco antes de confirmar.</p>
              <ListaComprobantes items={comprobantes} />
            </div>
          ) : (
            <p className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">La clienta aún no ha subido su comprobante de transferencia.</p>
          )
        ) : (
          <p className="text-sm text-neutral-600">Pagará {p.metodo_pago === "efectivo" ? "en efectivo" : "con tarjeta"} al recoger en tienda.</p>
        )}
      </Seccion>

      <Seccion titulo="Productos">
        <TablaWrap>
          <thead><tr><th className={th}>Producto</th><th className={th}>Cant.</th><th className={th}>Precio</th><th className={th}>Importe</th></tr></thead>
          <tbody className="divide-y">
            {p.pedido_items.map((i) => (
              <tr key={i.id}><td className={td}>{i.nombre} <span className="text-neutral-500">{detalleOpciones(i.opciones)}</span></td><td className={td}>{i.cantidad}</td><td className={td}>{mxn(Number(i.precio_unitario))}</td><td className={td}>{mxn(Number(i.precio_unitario) * i.cantidad)}</td></tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t font-medium"><td className={td} colSpan={3}>Total (sin envío)</td><td className={td}>{mxn(Number(p.total))}</td></tr></tfoot>
        </TablaWrap>
        <p className="text-xs text-neutral-500">Al confirmar se usan los precios vigentes; si cambiaron desde el pedido, el total se actualiza.</p>
      </Seccion>
    </>
  );
}
