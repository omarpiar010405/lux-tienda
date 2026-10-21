export type CeldaCSV = string | number | null | undefined;

export function aCSV(filas: CeldaCSV[][]): string {
  return filas
    .map((fila) =>
      fila
        .map((c) => {
          const t = c == null ? "" : String(c);
          return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
        })
        .join(",")
    )
    .join("\r\n");
}

/** Descarga un CSV con BOM para que Excel respete los acentos. Solo en el navegador. */
export function descargarCSV(nombre: string, filas: CeldaCSV[][]): void {
  const blob = new Blob(["\uFEFF" + aCSV(filas)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre.endsWith(".csv") ? nombre : `${nombre}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Descarga un texto ya armado como CSV (con BOM). Solo en el navegador. */
export function descargarTexto(nombre: string, texto: string): void {
  const blob = new Blob(["\uFEFF" + texto], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
