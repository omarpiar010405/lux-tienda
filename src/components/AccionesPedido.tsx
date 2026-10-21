"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import { METODOS } from "@/lib/format";
import type { EntregaPedido, EstadoPedido, MetodoPago } from "@/lib/types";
import { btn, btnPeligro, btnSec, input } from "@/lib/ui";
import { Aviso } from "./Kit";

export function AccionesPedido({ pedidoId, estado, entrega, metodoPago, comprobantes }: { pedidoId: string; estado: EstadoPedido; entrega: EntregaPedido; metodoPago: MetodoPago; comprobantes: number }) {
  const router = useRouter();
  const [metodo, setMetodo] = useState<MetodoPago>(metodoPago);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(accion: () => PromiseLike<{ error: { message: string } | null }>) {
    setCargando(true);
    setError(null);
    const { error: e } = await accion();
    setCargando(false);
    if (e) return setError(mensajeError(e));
    router.refresh();
  }

  const cambiar = (nuevo: EstadoPedido, confirmacion?: string) => {
    if (confirmacion && !confirm(confirmacion)) return;
    return ejecutar(() => createClient().rpc("cambiar_estado_pedido", { p_pedido_id: pedidoId, p_estado: nuevo }));
  };

  return (
    <div className="space-y-3">
      {error && <Aviso>{error}</Aviso>}
      <div className="flex flex-wrap items-end gap-3">
        {estado === "nuevo" && (
          <>
            <label className="text-sm text-neutral-600">Pago recibido por (la clienta eligió: {METODOS.find((m) => m.valor === metodoPago)?.etiqueta})
              <select value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)} className={`${input} w-48`}>
                {METODOS.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
              </select>
            </label>
            <button className={btn} disabled={cargando}
              onClick={() => {
                const sinComprobante = metodoPago === "transferencia" && comprobantes === 0;
                const texto = sinComprobante
                  ? "Este pedido es por transferencia y todavía NO tiene comprobante. ¿Confirmarlo de todos modos? Se registrará la venta y bajarán las existencias."
                  : "Se registrará la venta y bajarán las existencias. ¿Confirmar el pedido?";
                if (confirm(texto)) ejecutar(() => createClient().rpc("confirmar_pedido", { p_pedido_id: pedidoId, p_metodo: metodo }));
              }}>
              Confirmar y registrar venta
            </button>
          </>
        )}
        {estado === "confirmado" && entrega === "envio" && <button className={btn} disabled={cargando} onClick={() => cambiar("enviado")}>Marcar como enviado</button>}
        {estado === "confirmado" && entrega === "recoger" && <button className={btn} disabled={cargando} onClick={() => cambiar("entregado")}>Marcar como entregado</button>}
        {estado === "enviado" && <button className={btn} disabled={cargando} onClick={() => cambiar("entregado")}>Marcar como entregado</button>}
        {(estado === "nuevo" || estado === "confirmado") && (
          <button className={btnPeligro} disabled={cargando} onClick={() => cambiar("cancelado", estado === "confirmado" ? "Se cancelará la venta y las piezas regresarán al inventario. ¿Cancelar el pedido?" : "¿Cancelar este pedido?")}>
            Cancelar pedido
          </button>
        )}
        {(estado === "entregado" || estado === "cancelado") && <span className={`${btnSec} cursor-default`}>Sin acciones pendientes</span>}
      </div>
    </div>
  );
}
