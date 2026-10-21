"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import { etiquetaOpcion } from "@/lib/format";
import { btn, btnSec, card, input } from "@/lib/ui";
import { Aviso } from "./Kit";

export type CategoriaFila = { id: string; nombre: string; opciones: string[]; productos: number };

const ATRIBUTOS = ["talla", "color", "ml", "capacidad", "equipo"];

export function CategoriasAdmin({ categorias }: { categorias: CategoriaFila[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [a1, setA1] = useState("talla");
  const [a2, setA2] = useState("");
  const [error, setError] = useState<string | null>(null);

  const limpiar = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "_");

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) return setError("Escribe el nombre de la categoría");
    const opciones = [limpiar(a1), limpiar(a2)].filter(Boolean);
    if (opciones.length === 0) return setError("Elige al menos un atributo (por ejemplo talla)");
    if (opciones.length === 2 && opciones[0] === opciones[1]) return setError("Los dos atributos deben ser distintos");
    const { error: eIns } = await createClient().from("categorias").insert({ nombre: nombre.trim(), opciones });
    if (eIns) return setError(eIns.message.includes("categorias_nombre_key") ? "Ya existe una categoría con ese nombre." : mensajeError(eIns));
    setNombre(""); setA2("");
    router.refresh();
  }

  async function renombrar(c: CategoriaFila) {
    const nuevo = prompt("Nuevo nombre de la categoría:", c.nombre)?.trim();
    if (!nuevo || nuevo === c.nombre) return;
    const { error: e } = await createClient().from("categorias").update({ nombre: nuevo }).eq("id", c.id);
    if (e) return setError(e.message.includes("categorias_nombre_key") ? "Ya existe una categoría con ese nombre." : mensajeError(e));
    router.refresh();
  }

  async function borrar(c: CategoriaFila) {
    if (!confirm(`¿Borrar la categoría "${c.nombre}"?`)) return;
    const { error: e } = await createClient().from("categorias").delete().eq("id", c.id);
    if (e) return setError("No se puede borrar: todavía tiene productos.");
    router.refresh();
  }

  const lista = (
    <datalist id="atributos">{ATRIBUTOS.map((a) => <option key={a} value={a} />)}</datalist>
  );

  return (
    <div className="space-y-4 max-w-2xl">
      <Aviso tipo="info">
        Los atributos definen cómo se distinguen las variantes de un producto (talla, color, ml…). Se eligen al crear la categoría y no se cambian después, porque las variantes ya existentes dependen de ellos. El color de la ropa suele ir en el nombre del producto.
      </Aviso>

      <form onSubmit={agregar} className={`${card} p-4 grid sm:grid-cols-3 gap-3 items-end`}>
        {lista}
        <label className="text-sm text-neutral-600 sm:col-span-3">Nombre de la categoría<input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Bolsas" className={input} /></label>
        <label className="text-sm text-neutral-600">Atributo 1<input value={a1} onChange={(e) => setA1(e.target.value)} list="atributos" className={input} /></label>
        <label className="text-sm text-neutral-600">Atributo 2 (opcional)<input value={a2} onChange={(e) => setA2(e.target.value)} list="atributos" className={input} /></label>
        <button className={btn}>Agregar categoría</button>
      </form>
      {error && <Aviso>{error}</Aviso>}

      <ul className={`${card} divide-y`}>
        {categorias.map((c) => (
          <li key={c.id} className="p-3 flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-medium">{c.nombre}</p>
              <p className="text-sm text-neutral-500">{c.opciones.map(etiquetaOpcion).join(" + ")} · {c.productos} productos</p>
            </div>
            <div className="flex gap-2">
              <button className={btnSec} onClick={() => renombrar(c)}>Renombrar</button>
              {c.productos === 0 && <button className={btnSec} onClick={() => borrar(c)}>Borrar</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
