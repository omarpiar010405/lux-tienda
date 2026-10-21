"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import type { Rol } from "@/lib/types";
import { btnSec, card, input } from "@/lib/ui";
import { Aviso } from "./Kit";

export type Usuario = { id: string; nombre: string; rol: Rol; activo: boolean };

export function UsuariosAdmin({ usuarios, yo }: { usuarios: Usuario[]; yo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function cambiar(u: Usuario, cambios: Partial<Usuario>) {
    setError(null);
    const { error: e } = await createClient().from("profiles").update(cambios).eq("id", u.id);
    if (e) return setError(mensajeError(e));
    router.refresh();
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {error && <Aviso>{error}</Aviso>}
      <ul className={`${card} divide-y`}>
        {usuarios.map((u) => (
          <li key={u.id} className={`p-3 flex items-center gap-2 flex-wrap ${u.activo ? "" : "opacity-50"}`}>
            <p className="font-medium flex-1 min-w-32">{u.nombre || "(sin nombre)"}{u.id === yo ? " (tú)" : ""}</p>
            <select value={u.rol} disabled={u.id === yo} onChange={(e) => cambiar(u, { rol: e.target.value as Rol })} className={`${input} w-40`}>
              <option value="dueno">Dueño</option>
              <option value="vendedora">Vendedora</option>
              <option value="cliente">Quitar acceso (cliente)</option>
            </select>
            <button className={btnSec} disabled={u.id === yo} onClick={() => cambiar(u, { activo: !u.activo })}>{u.activo ? "Desactivar" : "Activar"}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
