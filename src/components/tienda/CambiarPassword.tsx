"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { contrasenaValida } from "@/lib/contrasena";
import { mensajeError } from "@/lib/errores";
import { t } from "@/lib/ui";
import { Aviso } from "@/components/Kit";

export function CambiarPassword() {
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cambiar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!contrasenaValida(nueva)) return setMsg({ tipo: "error", texto: "La contraseña debe tener al menos 8 caracteres." });
    if (nueva !== repetir) return setMsg({ tipo: "error", texto: "Las contraseñas no coinciden." });
    setGuardando(true);
    const { error } = await createClient().auth.updateUser({ password: nueva });
    setGuardando(false);
    if (error) return setMsg({ tipo: "error", texto: mensajeError(error) });
    setNueva(""); setRepetir("");
    setMsg({ tipo: "ok", texto: "Contraseña actualizada." });
  }

  return (
    <form onSubmit={cambiar} className={`${t.tarjeta} max-w-xl space-y-5 p-6`} noValidate>
      <h2 className="font-display text-xl">Cambiar contraseña</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="pw-nueva" className={t.etiqueta}>Nueva contraseña</label><input id="pw-nueva" type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} className={t.input} /></div>
        <div><label htmlFor="pw-repetir" className={t.etiqueta}>Repite la contraseña</label><input id="pw-repetir" type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} className={t.input} /></div>
      </div>
      {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      <button disabled={guardando} className={t.btnNegro}>{guardando ? "Guardando…" : "Actualizar contraseña"}</button>
    </form>
  );
}
