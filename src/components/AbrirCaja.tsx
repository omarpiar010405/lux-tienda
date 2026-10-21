"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import { btn, card, input } from "@/lib/ui";
import { Aviso } from "./Kit";

export function AbrirCaja() {
  const router = useRouter();
  const [fondo, setFondo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function abrir() {
    setCargando(true);
    setError(null);
    const { error: e } = await createClient().rpc("abrir_caja", { p_fondo: Number(fondo) || 0 });
    setCargando(false);
    if (e) return setError(mensajeError(e));
    router.refresh();
  }

  return (
    <div className={`${card} max-w-sm mx-auto p-5 space-y-3`}>
      <h2 className="font-semibold">Abrir caja</h2>
      <p className="text-sm text-neutral-600">Para vender hay que abrir la caja con el efectivo inicial (fondo).</p>
      <label className="text-sm text-neutral-600 block">Fondo inicial (MXN)
        <input type="number" inputMode="decimal" min="0" value={fondo} onChange={(e) => setFondo(e.target.value)} className={input} placeholder="0" />
      </label>
      {error && <Aviso>{error}</Aviso>}
      <button className={`${btn} w-full py-3`} disabled={cargando} onClick={abrir}>{cargando ? "Abriendo..." : "Abrir caja"}</button>
    </div>
  );
}
