"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizarTelefono } from "@/lib/clientes";
import { mensajeError } from "@/lib/errores";
import type { Cliente } from "@/lib/types";
import { t } from "@/lib/ui";
import { Aviso } from "@/components/Kit";

export function FormularioDatos({ cliente }: { cliente: Cliente }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(cliente.nombre);
  const [apellidos, setApellidos] = useState(cliente.apellidos ?? "");
  const [telefono, setTelefono] = useState(cliente.telefono ?? "");
  const [novedades, setNovedades] = useState(cliente.acepta_novedades);
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const tel = normalizarTelefono(telefono);
    if (!nombre.trim()) return setMsg({ tipo: "error", texto: "Escribe tu nombre" });
    if (!tel) return setMsg({ tipo: "error", texto: "Escribe un teléfono de 10 dígitos" });
    setGuardando(true);
    const { error } = await createClient().from("clientes").update({ nombre: nombre.trim(), apellidos: apellidos.trim() || null, telefono: tel, acepta_novedades: novedades }).eq("id", cliente.id);
    setGuardando(false);
    if (error) return setMsg({ tipo: "error", texto: mensajeError(error) });
    setTelefono(tel);
    setMsg({ tipo: "ok", texto: "Datos guardados" });
    router.refresh();
  }

  return (
    <form onSubmit={guardar} className={`${t.tarjeta} max-w-xl space-y-5 p-6`}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="d-nombre" className={t.etiqueta}>Nombre</label><input id="d-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className={t.input} autoComplete="given-name" /></div>
        <div><label htmlFor="d-apellidos" className={t.etiqueta}>Apellidos</label><input id="d-apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className={t.input} autoComplete="family-name" /></div>
      </div>
      <div><label htmlFor="d-email" className={t.etiqueta}>Correo</label><input id="d-email" value={cliente.email ?? ""} disabled className={`${t.input} bg-neutral-100 text-neutral-600`} /></div>
      <div><label htmlFor="d-tel" className={t.etiqueta}>Teléfono / WhatsApp</label><input id="d-tel" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={t.input} autoComplete="tel" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={novedades} onChange={(e) => setNovedades(e.target.checked)} /> Quiero recibir novedades y ofertas</label>
      {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      <button disabled={guardando} className={t.btnNegro}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
    </form>
  );
}
