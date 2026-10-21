"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatearDireccion, type DireccionForm } from "@/lib/clientes";
import { mensajeError } from "@/lib/errores";
import { mxn } from "@/lib/format";
import { textoHorarioTienda } from "@/lib/horarios";
import { subirComprobantes } from "@/lib/comprobantes";
import { MARCA } from "@/lib/marca";
import { metodoPermitido, opcionesDisponibles } from "@/lib/pagos";
import type { Cliente, Direccion, MetodoPago } from "@/lib/types";
import { t } from "@/lib/ui";
import { Aviso } from "@/components/Kit";
import { useCarrito } from "./CarritoContext";
import { filaDireccion } from "./DireccionesCuenta";
import { FormularioDireccion } from "./FormularioDireccion";
import { SelectorComprobantes } from "./SelectorComprobantes";
import { problemaLinea, useDetalles } from "./useDetalles";

export function Checkout({ cliente, direcciones }: { cliente: Cliente; direcciones: Direccion[] }) {
  const router = useRouter();
  const { lineas, listo, vaciar } = useCarrito();
  const { detalles, cargando } = useDetalles(lineas, listo);

  const [lista, setLista] = useState<Direccion[]>(direcciones);
  const [entrega, setEntrega] = useState<"envio" | "recoger">("envio");
  const [dirId, setDirId] = useState<string | null>(direcciones.find((d) => d.es_principal)?.id ?? direcciones[0]?.id ?? null);
  const [agregando, setAgregando] = useState(direcciones.length === 0);
  const [metodoElegido, setMetodoElegido] = useState<MetodoPago>("transferencia");
  const [comprobantes, setComprobantes] = useState<File[]>([]);
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validas = useMemo(() => (detalles ?? []).filter((d) => !problemaLinea(d)), [detalles]);
  const conProblema = (detalles ?? []).filter((d) => problemaLinea(d));
  const total = validas.reduce((s, d) => s + d.precio * d.cantidad, 0);
  const sinTelefono = !cliente.telefono;
  // Si cambia a envío y el método elegido ya no aplica, se usa transferencia (R-PAY-02)
  const metodo: MetodoPago = metodoPermitido(entrega, metodoElegido) ? metodoElegido : "transferencia";

  async function guardarDireccion(d: DireccionForm): Promise<string | null> {
    const { data, error: e } = await createClient()
      .from("direcciones")
      .insert({ ...filaDireccion(d), cliente_id: cliente.id })
      .select("id, alias, nombre, apellidos, telefono, calle, interior, colonia, ciudad, estado, cp, referencias, es_principal")
      .single();
    if (e) return mensajeError(e);
    const nueva = data as Direccion;
    setLista((l) => [...l.map((x) => (nueva.es_principal ? { ...x, es_principal: false } : x)), nueva]);
    setDirId(nueva.id);
    setAgregando(false);
    return null;
  }

  async function realizarPedido() {
    setError(null);
    if (sinTelefono) return setError("Falta tu teléfono. Agrégalo en Mi cuenta.");
    if (entrega === "envio" && !dirId) return setError("Elige o agrega una dirección de envío.");
    setEnviando(true);
    const { data, error: e } = await createClient().rpc("crear_pedido", {
      p_items: validas.map((d) => ({ variante_id: d.varianteId, cantidad: d.cantidad })),
      p_entrega: entrega,
      p_direccion_id: entrega === "envio" ? dirId : null,
      p_notas: notas.trim() || null,
      p_metodo: metodo,
    });
    if (e) {
      setEnviando(false);
      return setError(mensajeError(e));
    }
    const r = data as { id: string; numero: number };

    // Comprobantes adjuntados desde el checkout (solo transferencia). Si algo falla, el pedido ya existe y se pueden subir después.
    let aviso = "";
    if (metodo === "transferencia" && comprobantes.length > 0) {
      const sub = await subirComprobantes(createClient(), cliente.id, r.id, comprobantes);
      if (sub.errores.length > 0) aviso = "&comprobante=pendiente";
    }
    vaciar();
    router.push(`/cuenta/pedidos/${r.id}?nuevo=1${aviso}`);
  }

  if (!listo || cargando) return <p className="py-20 text-center text-neutral-500" role="status">Preparando tu pedido…</p>;

  if ((detalles ?? []).length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-3xl">Tu carrito está vacío</p>
        <Link href="/tienda" className={`${t.btnNegro} mt-6`}>Ir a la tienda</Link>
      </div>
    );
  }

  const seccion = "border border-neutral-200 bg-white p-6";
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        {conProblema.length > 0 && (
          <Aviso tipo="info">Algunos productos de tu carrito cambiaron de disponibilidad. <Link href="/carrito" className="underline">Revisa tu carrito</Link> antes de continuar.</Aviso>
        )}

        <section className={seccion}>
          <h2 className="font-display text-xl">Contacto</h2>
          <p className="mt-2 text-sm text-neutral-700">{cliente.nombre} {cliente.apellidos ?? ""}<br />{cliente.email}<br />{cliente.telefono ?? <span className="text-red-700">Sin teléfono</span>}</p>
          {sinTelefono && <p className="mt-2 text-sm text-red-700">Necesitamos tu teléfono para coordinar la entrega. <Link href="/cuenta" className="underline">Agrégalo aquí</Link>.</p>}
        </section>

        <section className={seccion}>
          <h2 className="font-display text-xl">Entrega</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de entrega">
            {([["envio", "Envío a domicilio", "El costo se confirma por WhatsApp"], ["recoger", "Recoger en tienda", MARCA.direccionTienda || "Te avisamos cuando esté listo"]] as const).map(([v, titulo, sub]) => (
              <label key={v} className={`cursor-pointer border p-4 ${entrega === v ? "border-oro bg-marfil" : "border-neutral-300"}`}>
                <input type="radio" name="entrega" value={v} checked={entrega === v} onChange={() => setEntrega(v)} className="mr-2" />
                <span className="font-medium">{titulo}</span>
                <span className="mt-1 block pl-5 text-xs text-neutral-600">{sub}</span>
              </label>
            ))}
          </div>

          {entrega === "recoger" && (
            <div className="mt-6 border border-neutral-200 bg-marfil p-4 text-sm">
              <p className="font-medium">Horario de recolección</p>
              <p className="mt-1 text-neutral-700">{textoHorarioTienda()}</p>
              <p className="mt-2 text-neutral-600">
                {MARCA.direccionTienda ? `Dirección: ${MARCA.direccionTienda}` : "Te avisamos por WhatsApp cuando tu pedido esté listo."}
              </p>
            </div>
          )}

          {entrega === "envio" && (
            <div className="mt-6 space-y-3">
              {lista.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className={t.etiqueta}>Dirección de envío</legend>
                  {lista.map((d) => (
                    <label key={d.id} className={`flex cursor-pointer gap-3 border p-4 text-sm ${dirId === d.id ? "border-oro bg-marfil" : "border-neutral-300"}`}>
                      <input type="radio" name="direccion" checked={dirId === d.id} onChange={() => setDirId(d.id)} />
                      <span>
                        <b>{d.alias || d.nombre}</b> — {d.nombre}{d.apellidos ? ` ${d.apellidos}` : ""} · {d.telefono}<br />
                        <span className="text-neutral-600">{formatearDireccion(d)}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
              {agregando ? (
                <div className="border border-neutral-200 p-5">
                  <h3 className="mb-4 font-display text-lg">Nueva dirección</h3>
                  <FormularioDireccion
                    inicial={{ nombre: cliente.nombre, apellidos: cliente.apellidos ?? "", telefono: cliente.telefono ?? "" }}
                    textoBoton="Usar esta dirección"
                    alGuardar={guardarDireccion}
                    alCancelar={lista.length > 0 ? () => setAgregando(false) : undefined}
                  />
                </div>
              ) : (
                lista.length < 10 && <button type="button" className="text-sm underline underline-offset-4 cursor-pointer" onClick={() => setAgregando(true)}>+ Usar otra dirección</button>
              )}
            </div>
          )}
        </section>

        <section className={seccion}>
          <h2 className="font-display text-xl">Pago</h2>
          <div className="mt-4 space-y-3" role="radiogroup" aria-label="Método de pago">
            {opcionesDisponibles(entrega).map((o) => (
              <label key={o.valor} className={`block cursor-pointer border p-4 ${metodo === o.valor ? "border-oro bg-marfil" : "border-neutral-300"}`}>
                <input type="radio" name="metodo" value={o.valor} checked={metodo === o.valor} onChange={() => setMetodoElegido(o.valor)} className="mr-2" />
                <span className="font-medium">{o.titulo}</span>
                <span className="mt-1 block pl-5 text-xs text-neutral-600">{o.detalle}</span>
              </label>
            ))}
          </div>
          {entrega === "envio" && <p className="mt-3 text-xs text-neutral-500">Para envíos a domicilio el pago es por transferencia. Efectivo y tarjeta están disponibles al recoger en tienda.</p>}

          {metodo === "transferencia" && (
            <div className="mt-5 space-y-3">
              {MARCA.instruccionesPago ? (
                <div className="whitespace-pre-line border border-neutral-200 bg-marfil p-4 text-sm">{MARCA.instruccionesPago}</div>
              ) : (
                <p className="text-sm text-neutral-600">Al terminar tu pedido te compartimos los datos para la transferencia.</p>
              )}
              <p className="text-sm text-neutral-700">Puedes adjuntar tu comprobante ahora o hacerlo después desde tu pedido.</p>
              <SelectorComprobantes archivos={comprobantes} onChange={setComprobantes} />
            </div>
          )}
          {metodo !== "transferencia" && <p className="mt-4 text-sm text-neutral-600">Pagas cuando recojas tu pedido. Te avisamos por WhatsApp cuando esté listo.</p>}
        </section>

        <section className={seccion}>
          <label htmlFor="notas" className="font-display text-xl">Notas del pedido <span className="font-sans text-sm text-neutral-500">(opcional)</span></label>
          <textarea id="notas" rows={3} maxLength={500} value={notas} onChange={(e) => setNotas(e.target.value)} className={`${t.input} mt-3`} placeholder="Horario de entrega, dudas de talla, etc." />
        </section>
      </div>

      <aside className="h-fit border border-neutral-200 bg-white p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-2xl">Tu pedido</h2>
        <ul className="mt-4 divide-y divide-neutral-200 text-sm">
          {validas.map((d) => (
            <li key={d.varianteId} className="flex justify-between gap-3 py-3">
              <span>{d.cantidad} × {d.nombre}{d.detalle ? <span className="text-neutral-500"> · {d.detalle}</span> : null}</span>
              <span className="whitespace-nowrap">{mxn(d.precio * d.cantidad)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-neutral-200 pt-4 text-lg"><span>Total</span><span className="font-display text-2xl">{mxn(total)}</span></div>
        <p className="mt-1 text-xs text-neutral-500">Precios con IVA incluido. Envío por confirmar.</p>

        <div className="mt-5 border border-neutral-200 bg-marfil p-3 text-xs text-neutral-700">
          No se cobra en línea. {metodo === "transferencia" ? "Confirmamos tu pedido al revisar tu transferencia." : "Pagas al recoger en tienda."}
        </div>

        {error && <div className="mt-4"><Aviso>{error}</Aviso></div>}
        <button className={`${t.btnOro} mt-5 w-full`} disabled={enviando || validas.length === 0 || conProblema.length > 0} onClick={realizarPedido}>
          {enviando ? (comprobantes.length > 0 ? "Enviando pedido y comprobante…" : "Enviando pedido…") : "Realizar pedido"}
        </button>
        <Link href="/carrito" className="mt-3 block text-center text-xs uppercase tracking-[0.15em] text-neutral-500 underline underline-offset-4">Volver al carrito</Link>
      </aside>
    </div>
  );
}

