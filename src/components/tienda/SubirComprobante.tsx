"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { subirComprobantes } from "@/lib/comprobantes";
import { MAX_COMPROBANTES } from "@/lib/pagos";
import { t } from "@/lib/ui";
import { Aviso } from "@/components/Kit";
import { SelectorComprobantes } from "./SelectorComprobantes";

export function SubirComprobante({ pedidoId, clienteId, yaSubidos }: { pedidoId: string; clienteId: string; yaSubidos: number }) {
  const router = useRouter();
  const [archivos, setArchivos] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; lineas: string[] } | null>(null);
  const restantes = MAX_COMPROBANTES - yaSubidos;

  if (restantes <= 0) return <p className="text-sm text-neutral-600">Ya adjuntaste el máximo de {MAX_COMPROBANTES} comprobantes.</p>;

  async function enviar() {
    if (archivos.length === 0) return setMsg({ tipo: "error", lineas: ["Elige al menos un archivo."] });
    setSubiendo(true);
    setMsg(null);
    const r = await subirComprobantes(createClient(), clienteId, pedidoId, archivos);
    setSubiendo(false);
    setArchivos([]);
    if (r.errores.length > 0) setMsg({ tipo: "error", lineas: [r.subidos > 0 ? `Se enviaron ${r.subidos}, pero:` : "No se pudo enviar:", ...r.errores] });
    else setMsg({ tipo: "ok", lineas: [`¡Listo! Recibimos ${r.subidos === 1 ? "tu comprobante" : `tus ${r.subidos} comprobantes`}. Lo revisaremos y te confirmamos.`] });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <SelectorComprobantes archivos={archivos} onChange={setArchivos} maximo={restantes} />
      {msg && <Aviso tipo={msg.tipo}>{msg.lineas.map((l) => <p key={l}>{l}</p>)}</Aviso>}
      <button type="button" className={t.btnNegro} disabled={subiendo || archivos.length === 0} onClick={enviar}>
        {subiendo ? "Enviando…" : "Enviar comprobante"}
      </button>
    </div>
  );
}
