import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCuenta } from "@/lib/auth";
import { urlWhatsApp } from "@/lib/catalogo";
import { firmarComprobantes, type ComprobanteFila } from "@/lib/comprobantesServidor";
import { formatearDireccion } from "@/lib/clientes";
import { ESTADOS_PEDIDO, detalleOpciones, fechaHora, mxn } from "@/lib/format";
import { MARCA } from "@/lib/marca";
import { etiquetaPago } from "@/lib/pagos";
import type { Opciones } from "@/lib/types";
import { t } from "@/lib/ui";
import { Aviso } from "@/components/Kit";
import { ListaComprobantes } from "@/components/ListaComprobantes";
import { IconoWhatsApp } from "@/components/tienda/Iconos";
import { SubirComprobante } from "@/components/tienda/SubirComprobante";

type Pedido = {
  id: string; numero: number; estado: string; entrega: string; metodo_pago: string; total: number; notas: string | null; created_at: string;
  contacto_nombre: string; contacto_telefono: string;
  direccion: { nombre: string; apellidos: string | null; telefono: string; calle: string; interior: string | null; colonia: string; ciudad: string; estado: string; cp: string; referencias: string | null } | null;
  pedido_items: { id: string; cantidad: number; precio_unitario: number; nombre: string; opciones: Opciones }[];
  pedido_comprobantes: ComprobanteFila[];
};

export default async function DetallePedido({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string; comprobante?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user } = await requireCuenta(`/cuenta/pedidos/${id}`);
  const { data } = await supabase
    .from("pedidos")
    .select("id, numero, estado, entrega, metodo_pago, total, notas, created_at, contacto_nombre, contacto_telefono, direccion, pedido_items(id, cantidad, precio_unitario, nombre, opciones), pedido_comprobantes(id, ruta, nombre_original, tipo_mime, tamano, created_at)")
    .eq("id", id).eq("cliente_id", user.id).maybeSingle();
  if (!data) notFound();
  const p = data as unknown as Pedido;
  const comprobantes = await firmarComprobantes(supabase, p.pedido_comprobantes ?? []);

  const pasos = p.entrega === "envio" ? ["nuevo", "confirmado", "enviado", "entregado"] : ["nuevo", "confirmado", "entregado"];
  const actual = pasos.indexOf(p.estado);
  const esTransferencia = p.metodo_pago === "transferencia";
  const wa = MARCA.whatsapp
    ? urlWhatsApp(MARCA.whatsapp, `Hola, hice el pedido #${p.numero} en ${MARCA.nombre} ${MARCA.subtitulo}. ¿Me ayudas a confirmar el pago y la entrega?`)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/cuenta/pedidos" className="text-xs uppercase tracking-[0.15em] text-neutral-500 hover:text-negro">← Mis pedidos</Link>

      {sp.nuevo && (
        <div className="border border-oro bg-white p-6 text-center">
          <p className="font-display text-3xl">¡Gracias por tu pedido!</p>
          <p className="mt-2 text-neutral-700">Recibimos tu pedido <b>#{p.numero}</b>. {esTransferencia ? "En cuanto revisemos tu transferencia lo confirmamos." : "Te avisamos cuando esté listo para recoger."}</p>
        </div>
      )}
      {sp.comprobante === "pendiente" && (
        <Aviso>No pudimos subir tu comprobante. Tu pedido sí quedó registrado: súbelo de nuevo en la sección <b>Pago</b>.</Aviso>
      )}

      <div className={`${t.tarjeta} p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">Pedido #{p.numero}</h1>
            <p className="text-sm text-neutral-600">{fechaHora(p.created_at)}</p>
          </div>
          <span className={`px-3 py-1 text-sm ${ESTADOS_PEDIDO[p.estado]?.estilo ?? ""}`}>{ESTADOS_PEDIDO[p.estado]?.etiqueta ?? p.estado}</span>
        </div>

        {p.estado !== "cancelado" && (
          <ol className="mt-6 flex items-center" aria-label="Avance del pedido">
            {pasos.map((paso, i) => (
              <li key={paso} className="flex flex-1 items-center last:flex-none">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${i <= actual ? "border-oro bg-oro text-negro" : "border-neutral-300 text-neutral-400"}`} aria-current={i === actual}>{i + 1}</span>
                {i < pasos.length - 1 && <span className={`mx-2 h-px flex-1 ${i < actual ? "bg-oro" : "bg-neutral-300"}`} />}
              </li>
            ))}
          </ol>
        )}
        {p.estado !== "cancelado" && <p className="mt-2 text-xs text-neutral-500">{pasos.map((x) => ESTADOS_PEDIDO[x].etiqueta).join(" → ")}</p>}
      </div>

      {/* Pago */}
      <div className={`${t.tarjeta} space-y-4 p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl">Pago</h2>
          <span className="text-sm text-neutral-700">{etiquetaPago(p.metodo_pago)}</span>
        </div>

        {esTransferencia ? (
          <>
            {p.estado === "nuevo" && comprobantes.length === 0 && <Aviso tipo="info">Falta tu comprobante de transferencia. Súbelo aquí para que podamos confirmar tu pedido.</Aviso>}
            {p.estado === "nuevo" && MARCA.instruccionesPago && <div className="whitespace-pre-line border border-neutral-200 bg-marfil p-4 text-sm">{MARCA.instruccionesPago}</div>}
            {comprobantes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Comprobantes enviados</p>
                <ListaComprobantes items={comprobantes} />
              </div>
            )}
            {p.estado === "nuevo" && <SubirComprobante pedidoId={p.id} clienteId={user.id} yaSubidos={comprobantes.length} />}
            {p.estado !== "nuevo" && comprobantes.length === 0 && <p className="text-sm text-neutral-600">Pago confirmado por la boutique.</p>}
          </>
        ) : (
          <p className="text-sm text-neutral-700">Pagas en la tienda cuando recojas tu pedido.{MARCA.direccionTienda ? ` ${MARCA.direccionTienda}` : ""}</p>
        )}
        <p className="text-sm text-neutral-600">El costo de envío (si aplica) se acuerda por WhatsApp.</p>
        {wa && p.estado === "nuevo" && <a href={wa} target="_blank" rel="noopener noreferrer" className={`${t.btnLinea} gap-2`}><IconoWhatsApp /> Escribirnos por WhatsApp</a>}
      </div>

      <div className={`${t.tarjeta} p-6`}>
        <h2 className="font-display text-xl">Productos</h2>
        <ul className="mt-3 divide-y divide-neutral-200">
          {p.pedido_items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-3 text-sm">
              <span>{i.cantidad} × {i.nombre} <span className="text-neutral-500">{detalleOpciones(i.opciones)}</span></span>
              <span>{mxn(Number(i.precio_unitario) * i.cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-neutral-200 pt-3 text-lg"><span>Total</span><span className="font-display text-2xl">{mxn(Number(p.total))}</span></div>
        <p className="mt-1 text-xs text-neutral-500">Precios con IVA incluido. El envío no está incluido.</p>
      </div>

      <div className={`${t.tarjeta} grid gap-6 p-6 sm:grid-cols-2`}>
        <div>
          <h2 className="font-display text-xl">Entrega</h2>
          {p.direccion ? (
            <p className="mt-2 text-sm text-neutral-700">
              {p.direccion.nombre}{p.direccion.apellidos ? ` ${p.direccion.apellidos}` : ""} · {p.direccion.telefono}<br />
              {formatearDireccion(p.direccion)}
              {p.direccion.referencias && <><br /><span className="text-neutral-500">{p.direccion.referencias}</span></>}
            </p>
          ) : (
            <p className="mt-2 text-sm text-neutral-700">Recoger en tienda.{MARCA.direccionTienda ? ` ${MARCA.direccionTienda}` : ""}</p>
          )}
        </div>
        <div>
          <h2 className="font-display text-xl">Contacto</h2>
          <p className="mt-2 text-sm text-neutral-700">{p.contacto_nombre}<br />{p.contacto_telefono}</p>
          {p.notas && <p className="mt-3 text-sm text-neutral-600">Notas: {p.notas}</p>}
        </div>
      </div>
      {p.estado === "cancelado" && <Aviso tipo="info">Este pedido fue cancelado. Si tienes dudas, escríbenos por WhatsApp.</Aviso>}
    </div>
  );
}
