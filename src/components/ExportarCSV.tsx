"use client";

import { descargarCSV, type CeldaCSV } from "@/lib/csv";
import { btnSec } from "@/lib/ui";

export function ExportarCSV({ nombre, filas, texto = "Exportar CSV" }: { nombre: string; filas: CeldaCSV[][]; texto?: string }) {
  return (
    <button type="button" className={btnSec} onClick={() => descargarCSV(nombre, filas)}>
      {texto}
    </button>
  );
}
