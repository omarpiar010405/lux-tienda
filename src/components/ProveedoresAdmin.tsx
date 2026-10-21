"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import { btn, btnSec, card, input } from "@/lib/ui";
import { Aviso } from "./Kit";

export type Proveedor = { id: string; nombre: string; contacto: string | null; activo: boolean };

export function ProveedoresAdmin({ proveedores }: { proveedores: Proveedor[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("Escribe el nombre");
    const { error: eIns } = await createClient().from("proveedores").insert({ nombre: nombre.trim(), contacto: contacto.trim() || null });
    if (eIns) return setError(mensajeError(eIns));
    setNombre(""); setContacto("");
    router.refresh();
  }

  async function alternar(p: Proveedor) {
    const { error: eUp } = await createClient().from("proveedores").update({ activo: !p.activo }).eq("id", p.id);
    if (eUp) return setError(mensajeError(eUp));
    router.refresh();
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <form onSubmit={agregar} className={`${card} p-4 flex gap-2 flex-wrap items-end`}>
        <label className="text-sm text-neutral-600 flex-1 min-w-40">Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} className={input} /></label>
        <label className="text-sm text-neutral-600 flex-1 min-w-40">Contacto (opcional)<input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Teléfono o correo" className={input} /></label>
        <button className={btn}>Agregar</button>
      </form>
      {error && <Aviso>{error}</Aviso>}
      <ul className={`${card} divide-y`}>
        {proveedores.length === 0 && <li className="p-3 text-sm text-neutral-500">Aún no hay proveedores. También se pueden escribir directo al registrar una compra.</li>}
        {proveedores.map((p) => (
          <li key={p.id} className={`p-3 flex items-center justify-between gap-2 ${p.activo ? "" : "opacity-50"}`}>
            <div><p className="font-medium">{p.nombre}</p>{p.contacto && <p className="text-sm text-neutral-500">{p.contacto}</p>}</div>
            <button className={btnSec} onClick={() => alternar(p)}>{p.activo ? "Desactivar" : "Activar"}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
