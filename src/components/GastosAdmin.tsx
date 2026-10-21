"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mensajeError } from "@/lib/errores";
import { ivaDe, redondear } from "@/lib/calculos";
import { fechaCorta, hoyMX, mxn } from "@/lib/format";
import { btn, btnSec, card, input, td, th } from "@/lib/ui";
import { Aviso, TablaWrap } from "./Kit";

export const CATEGORIAS_GASTO = ["Renta", "Servicios", "Sueldos", "Publicidad", "Empaques", "Transporte", "Mantenimiento", "Otros"];

export type Gasto = { id: string; fecha: string; concepto: string; categoria: string; subtotal: number; iva: number; total: number; recurrente: boolean };

export function GastosAdmin({ gastos }: { gastos: Gasto[] }) {
  const router = useRouter();
  const [fecha, setFecha] = useState(hoyMX());
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("Otros");
  const [subtotal, setSubtotal] = useState("");
  const [iva, setIva] = useState("");
  const [recurrente, setRecurrente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const total = redondear((Number(subtotal) || 0) + (Number(iva) || 0));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!concepto.trim()) return setError("Escribe el concepto");
    if (!(Number(subtotal) >= 0) || subtotal === "") return setError("Escribe el subtotal");
    setGuardando(true);
    const { error: eIns } = await createClient().from("gastos").insert({
      fecha, concepto: concepto.trim(), categoria, subtotal: Number(subtotal), iva: Number(iva) || 0, recurrente,
    });
    setGuardando(false);
    if (eIns) return setError(mensajeError(eIns));
    setConcepto(""); setSubtotal(""); setIva(""); setRecurrente(false);
    router.refresh();
  }

  async function borrar(g: Gasto) {
    if (!confirm(`¿Borrar el gasto "${g.concepto}" por ${mxn(g.total)}?`)) return;
    const { error: eDel } = await createClient().from("gastos").delete().eq("id", g.id);
    if (eDel) return setError(mensajeError(eDel));
    router.refresh();
  }

  const etq = "text-sm text-neutral-600 block";

  return (
    <div className="space-y-4">
      <form onSubmit={guardar} className={`${card} p-4 grid sm:grid-cols-3 gap-3`}>
        <label className={etq}>Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={input} /></label>
        <label className={etq}>Concepto<input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Renta de octubre" className={input} /></label>
        <label className={etq}>Categoría
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={input}>{CATEGORIAS_GASTO.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className={etq}>Subtotal<input type="number" inputMode="decimal" min="0" step="0.01" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} className={input} /></label>
        <label className={etq}>IVA
          <div className="flex gap-2">
            <input type="number" inputMode="decimal" min="0" step="0.01" value={iva} onChange={(e) => setIva(e.target.value)} className={input} />
            <button type="button" className={btnSec} onClick={() => setIva(String(ivaDe(Number(subtotal) || 0)))}>16%</button>
          </div>
        </label>
        <div className="text-sm pt-6">Total: <b>{mxn(total)}</b></div>
        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={recurrente} onChange={(e) => setRecurrente(e.target.checked)} /> Gasto recurrente</label>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button className={btn} disabled={guardando}>{guardando ? "Guardando..." : "Agregar gasto"}</button>
          {error && <Aviso>{error}</Aviso>}
        </div>
      </form>

      <TablaWrap>
        <thead><tr><th className={th}>Fecha</th><th className={th}>Concepto</th><th className={th}>Categoría</th><th className={th}>Subtotal</th><th className={th}>IVA</th><th className={th}>Total</th><th className={th}></th></tr></thead>
        <tbody className="divide-y">
          {gastos.length === 0 && <tr><td className={td} colSpan={7}>Sin gastos en el periodo.</td></tr>}
          {gastos.map((g) => (
            <tr key={g.id}>
              <td className={td}>{fechaCorta(g.fecha)}</td><td className={td}>{g.concepto}{g.recurrente ? " 🔁" : ""}</td><td className={td}>{g.categoria}</td>
              <td className={td}>{mxn(Number(g.subtotal))}</td><td className={td}>{mxn(Number(g.iva))}</td><td className={td}>{mxn(Number(g.total))}</td>
              <td className={td}><button className="text-red-600 text-sm cursor-pointer" onClick={() => borrar(g)}>Borrar</button></td>
            </tr>
          ))}
        </tbody>
      </TablaWrap>
    </div>
  );
}
