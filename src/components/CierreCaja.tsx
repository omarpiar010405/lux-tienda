"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import { fechaHora, mxn } from "@/lib/format";
import { redondear } from "@/lib/calculos";
import type { ResumenCaja } from "@/lib/types";
import { btn, card, input } from "@/lib/ui";
import { Aviso } from "./Kit";

export function CierreCaja({ resumen }: { resumen: ResumenCaja }) {
  const router = useRouter();
  const [contado, setContado] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cerrada, setCerrada] = useState<ResumenCaja | null>(null);

  const esperado = Number(resumen.efectivo_esperado);
  const diferencia = contado === "" ? null : redondear(Number(contado) - esperado);

  async function cerrar() {
    if (contado === "") return setError("Escribe el efectivo contado");
    if (!confirm("¿Cerrar la caja? Después habrá que abrir una nueva para vender.")) return;
    setCargando(true);
    setError(null);
    const { data, error: e } = await createClient().rpc("cerrar_caja", { p_efectivo_contado: Number(contado), p_notas: notas || null });
    setCargando(false);
    if (e) return setError(mensajeError(e));
    setCerrada(data as ResumenCaja);
    router.refresh();
  }

  const fila = (t: string, v: string, fuerte = false) => (
    <div className={`flex justify-between ${fuerte ? "font-semibold border-t pt-2" : ""}`}><span>{t}</span><span>{v}</span></div>
  );

  if (cerrada) {
    return (
      <div className={`${card} p-4 space-y-2 max-w-md`}>
        <Aviso tipo="ok">Caja cerrada.</Aviso>
        {fila("Efectivo esperado", mxn(Number(cerrada.efectivo_esperado)))}
        {fila("Efectivo contado", mxn(Number(cerrada.efectivo_contado)))}
        {fila("Diferencia", mxn(Number(cerrada.diferencia)), true)}
      </div>
    );
  }

  return (
    <div className={`${card} p-4 space-y-2 max-w-md`}>
      <h2 className="font-semibold">Caja abierta</h2>
      <p className="text-sm text-neutral-500">Desde {fechaHora(resumen.abierto_at)} · {resumen.num_ventas} ventas · {mxn(Number(resumen.total_ventas))}</p>
      {fila("Fondo inicial", mxn(Number(resumen.fondo_inicial)))}
      {fila("Ventas en efectivo", mxn(Number(resumen.efectivo)))}
      {fila("Ventas con tarjeta", mxn(Number(resumen.tarjeta)))}
      {fila("Ventas por transferencia", mxn(Number(resumen.transferencia)))}
      {fila("Efectivo esperado en caja", mxn(esperado), true)}

      <label className="text-sm text-neutral-600 block pt-2">Efectivo contado
        <input type="number" inputMode="decimal" min="0" value={contado} onChange={(e) => setContado(e.target.value)} className={input} />
      </label>
      {diferencia != null && (
        <p className={`text-sm ${diferencia === 0 ? "text-emerald-700" : "text-red-600"}`}>
          {diferencia === 0 ? "Cuadra exacto." : diferencia > 0 ? `Sobran ${mxn(diferencia)}` : `Faltan ${mxn(-diferencia)}`}
        </p>
      )}
      <label className="text-sm text-neutral-600 block">Notas (opcional)
        <input value={notas} onChange={(e) => setNotas(e.target.value)} className={input} />
      </label>
      {error && <Aviso>{error}</Aviso>}
      <button className={`${btn} w-full py-3`} disabled={cargando} onClick={cerrar}>{cargando ? "Cerrando..." : "Cerrar caja"}</button>
    </div>
  );
}
