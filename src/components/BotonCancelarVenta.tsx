"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import { btnPeligro } from "@/lib/ui";
import { Aviso } from "./Kit";

export function BotonCancelarVenta({ ventaId, folio }: { ventaId: string; folio: number }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelar() {
    if (!confirm(`¿Cancelar la venta #${folio}? Las piezas regresan al inventario.`)) return;
    setCargando(true);
    setError(null);
    const { error: e } = await createClient().rpc("cancelar_venta", { p_venta_id: ventaId });
    setCargando(false);
    if (e) return setError(mensajeError(e));
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button className={btnPeligro} disabled={cargando} onClick={cancelar}>{cargando ? "Cancelando..." : "Cancelar venta"}</button>
      {error && <Aviso>{error}</Aviso>}
    </div>
  );
}
