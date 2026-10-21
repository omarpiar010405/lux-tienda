"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatearDireccion, opcional, type DireccionForm } from "@/lib/clientes";
import { mensajeError } from "@/lib/errores";
import type { Direccion } from "@/lib/types";
import { t } from "@/lib/ui";
import { Aviso } from "@/components/Kit";
import { FormularioDireccion } from "./FormularioDireccion";

export const filaDireccion = (d: DireccionForm) => ({
  alias: opcional(d.alias), nombre: d.nombre, apellidos: opcional(d.apellidos), telefono: d.telefono, calle: d.calle,
  interior: opcional(d.interior), colonia: d.colonia, ciudad: d.ciudad, estado: d.estado, cp: d.cp,
  referencias: opcional(d.referencias), es_principal: d.es_principal,
});

const aForm = (d: Direccion): DireccionForm => ({
  alias: d.alias ?? "", nombre: d.nombre, apellidos: d.apellidos ?? "", telefono: d.telefono, calle: d.calle, interior: d.interior ?? "",
  colonia: d.colonia, ciudad: d.ciudad, estado: d.estado, cp: d.cp, referencias: d.referencias ?? "", es_principal: d.es_principal,
});

export function DireccionesCuenta({ clienteId, direcciones, nombreInicial, telefonoInicial }: { clienteId: string; direcciones: Direccion[]; nombreInicial: string; telefonoInicial: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | "nueva" | null>(direcciones.length === 0 ? "nueva" : null);
  const [error, setError] = useState<string | null>(null);

  async function guardar(id: string | null, d: DireccionForm): Promise<string | null> {
    const supabase = createClient();
    const { error: e } = id
      ? await supabase.from("direcciones").update(filaDireccion(d)).eq("id", id)
      : await supabase.from("direcciones").insert({ ...filaDireccion(d), cliente_id: clienteId });
    if (e) return mensajeError(e);
    setEditando(null);
    router.refresh();
    return null;
  }

  async function borrar(d: Direccion) {
    if (!confirm("¿Borrar esta dirección?")) return;
    const { error: e } = await createClient().from("direcciones").delete().eq("id", d.id);
    if (e) return setError(mensajeError(e));
    router.refresh();
  }

  async function hacerPrincipal(d: Direccion) {
    const { error: e } = await createClient().from("direcciones").update({ es_principal: true }).eq("id", d.id);
    if (e) return setError(mensajeError(e));
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {error && <Aviso>{error}</Aviso>}
      <ul className="grid gap-4 md:grid-cols-2">
        {direcciones.map((d) =>
          editando === d.id ? (
            <li key={d.id} className={`${t.tarjeta} p-5 md:col-span-2`}>
              <FormularioDireccion inicial={aForm(d)} alGuardar={(x) => guardar(d.id, x)} alCancelar={() => setEditando(null)} />
            </li>
          ) : (
            <li key={d.id} className={`${t.tarjeta} flex flex-col p-5`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-lg">{d.alias || d.nombre}</p>
                {d.es_principal && <span className="bg-oro px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-negro">Principal</span>}
              </div>
              <p className="mt-1 text-sm text-neutral-700">{d.nombre}{d.apellidos ? ` ${d.apellidos}` : ""} · {d.telefono}</p>
              <p className="mt-1 text-sm text-neutral-600">{formatearDireccion(d)}</p>
              {d.referencias && <p className="mt-1 text-xs text-neutral-500">{d.referencias}</p>}
              <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.15em]">
                <button className="underline underline-offset-4 cursor-pointer" onClick={() => setEditando(d.id)}>Editar</button>
                {!d.es_principal && <button className="underline underline-offset-4 cursor-pointer" onClick={() => hacerPrincipal(d)}>Hacer principal</button>}
                <button className="text-red-700 underline underline-offset-4 cursor-pointer" onClick={() => borrar(d)}>Borrar</button>
              </div>
            </li>
          )
        )}
      </ul>

      {editando === "nueva" ? (
        <div className={`${t.tarjeta} p-5`}>
          <h2 className="mb-4 font-display text-xl">Nueva dirección</h2>
          <FormularioDireccion
            inicial={{ nombre: nombreInicial, telefono: telefonoInicial }}
            alGuardar={(x) => guardar(null, x)}
            alCancelar={direcciones.length > 0 ? () => setEditando(null) : undefined}
          />
        </div>
      ) : (
        direcciones.length < 10 && <button className={t.btnLinea} onClick={() => setEditando("nueva")}>+ Agregar dirección</button>
      )}
    </div>
  );
}
