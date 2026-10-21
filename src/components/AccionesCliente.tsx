"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import type { Rol } from "@/lib/types";
import { btnSec } from "@/lib/ui";

export function AccionesCliente({ id, nombre, rol, activo }: { id: string; nombre: string; rol: Rol; activo: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function actualizar(cambios: { rol?: Rol; activo?: boolean }, confirmacion?: string) {
    if (confirmacion && !confirm(confirmacion)) return;
    setError(null);
    const { error: e } = await createClient().from("profiles").update(cambios).eq("id", id);
    if (e) return setError(mensajeError(e));
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {rol === "cliente" && (
        <button className={btnSec} onClick={() => actualizar({ rol: "vendedora" }, `¿Dar acceso de vendedora a ${nombre}? Podrá vender y ver existencias y precios (no costos ni datos de clientes).`)}>
          Dar acceso como vendedora
        </button>
      )}
      <button className={btnSec} onClick={() => actualizar({ activo: !activo }, activo ? `¿Desactivar la cuenta de ${nombre}?` : undefined)}>{activo ? "Desactivar" : "Activar"}</button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
