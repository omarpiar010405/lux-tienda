"use client";

import { useState } from "react";
import { ACCEPT_COMPROBANTE, MAX_COMPROBANTES, pesoLegible, validarComprobante } from "@/lib/pagos";
import { t } from "@/lib/ui";

/** Elige archivos de comprobante (JPG, PNG, WEBP, HEIC o PDF, hasta 10 MB) y los valida antes de subirlos. */
export function SelectorComprobantes({ archivos, onChange, maximo = MAX_COMPROBANTES }: { archivos: File[]; onChange: (a: File[]) => void; maximo?: number }) {
  const [errores, setErrores] = useState<string[]>([]);

  function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const nuevos = Array.from(e.target.files ?? []);
    e.target.value = ""; // permite volver a elegir el mismo archivo
    const errs: string[] = [];
    const aceptados = [...archivos];
    for (const f of nuevos) {
      if (aceptados.length >= maximo) {
        errs.push(`Máximo ${maximo} archivos por pedido`);
        break;
      }
      const v = validarComprobante(f);
      if (!v.ok) errs.push(`${f.name}: ${v.error}`);
      else aceptados.push(f);
    }
    setErrores(errs);
    onChange(aceptados);
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center gap-1 border border-dashed border-neutral-400 bg-white p-5 text-center text-sm transition-colors hover:border-oro focus-within:outline-2 focus-within:outline-oro">
        <span className="font-medium">Adjuntar comprobante de transferencia</span>
        <span className="text-xs text-neutral-500">JPG, PNG, WEBP, HEIC o PDF · máximo 10 MB por archivo · hasta {maximo}</span>
        <input type="file" multiple accept={ACCEPT_COMPROBANTE} onChange={alElegir} className="sr-only" />
      </label>
      {errores.length > 0 && (
        <ul role="alert" className="space-y-1 text-sm text-red-700">{errores.map((e) => <li key={e}>{e}</li>)}</ul>
      )}
      {archivos.length > 0 && (
        <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-white text-sm">
          {archivos.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate">{f.name} <span className="text-neutral-500">· {pesoLegible(f.size)}</span></span>
              <button type="button" className={`${t.etiqueta} !mb-0 shrink-0 underline underline-offset-4 cursor-pointer`} onClick={() => onChange(archivos.filter((_, j) => j !== i))}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
