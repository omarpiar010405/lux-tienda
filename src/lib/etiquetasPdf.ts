import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";

export type Etiqueta = { nombre: string; detalle: string; precio: string; codigo: string };

// Hoja Carta con etiquetas tipo Avery 5160 (66.7 × 25.4 mm, 3 × 10 = 30 por hoja).
// También sirve en papel normal: se recorta por la cuadrícula.
const COLS = 3;
const FILAS = 10;
export const ETIQUETAS_POR_HOJA = COLS * FILAS;
const ANCHO = 66.675;
const ALTO = 25.4;
const MARGEN_X = 4.826;
const MARGEN_Y = 12.7;
const PASO_X = 69.85;

function codigoDeBarras(texto: string): string {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, texto, { format: "CODE128", displayValue: true, fontSize: 18, height: 40, margin: 0, textMargin: 2 });
  return canvas.toDataURL("image/png");
}

/** `inicio` (1–30) permite reutilizar una hoja ya usada a medias. */
export function generarPdfEtiquetas(etiquetas: Etiqueta[], inicio = 1): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const cache = new Map<string, string>();
  let pos = Math.max(0, Math.min(ETIQUETAS_POR_HOJA - 1, inicio - 1));

  etiquetas.forEach((e) => {
    if (pos >= ETIQUETAS_POR_HOJA) {
      doc.addPage();
      pos = 0;
    }
    const x = MARGEN_X + (pos % COLS) * PASO_X;
    const y = MARGEN_Y + Math.floor(pos / COLS) * ALTO;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(doc.splitTextToSize(e.nombre, ANCHO - 22)[0] ?? "", x + 2, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(doc.splitTextToSize(e.detalle, ANCHO - 22)[0] ?? "", x + 2, y + 7.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(e.precio, x + ANCHO - 2, y + 5, { align: "right" });

    let img = cache.get(e.codigo);
    if (!img) {
      img = codigoDeBarras(e.codigo);
      cache.set(e.codigo, img);
    }
    doc.addImage(img, "PNG", x + 6, y + 9.5, ANCHO - 12, 13);
    pos += 1;
  });

  return doc;
}
