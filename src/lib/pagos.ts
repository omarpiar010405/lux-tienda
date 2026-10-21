// Métodos de pago de pedidos y comprobantes (spec 06 · R-PAY). Puras, sin dependencias de navegador.
import type { EntregaPedido, MetodoPago } from "./types";

export const OPCIONES_PAGO: { valor: MetodoPago; titulo: string; detalle: string; soloRecoger: boolean }[] = [
  { valor: "transferencia", titulo: "Transferencia bancaria", detalle: "Te damos los datos y subes tu comprobante.", soloRecoger: false },
  { valor: "efectivo", titulo: "Efectivo al recoger", detalle: "Pagas en la tienda cuando recojas tu pedido.", soloRecoger: true },
  { valor: "tarjeta", titulo: "Tarjeta al recoger", detalle: "Pagas con terminal en la tienda.", soloRecoger: true },
];

/** Envío a domicilio ⇒ solo transferencia (R-PAY-02). La base de datos lo exige también. */
export function opcionesDisponibles(entrega: EntregaPedido) {
  return OPCIONES_PAGO.filter((o) => entrega === "recoger" || !o.soloRecoger);
}

export function metodoPermitido(entrega: EntregaPedido, metodo: MetodoPago): boolean {
  return opcionesDisponibles(entrega).some((o) => o.valor === metodo);
}

export function etiquetaPago(m: string): string {
  return OPCIONES_PAGO.find((o) => o.valor === m)?.titulo ?? m;
}

// ---- comprobantes ----
export const MAX_BYTES_COMPROBANTE = 10 * 1024 * 1024;
export const MAX_COMPROBANTES = 5;

export const FORMATOS_COMPROBANTE: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  heic: "image/heic", heif: "image/heif", pdf: "application/pdf",
};
const MIMES_PERMITIDOS = new Set(Object.values(FORMATOS_COMPROBANTE));
export const ACCEPT_COMPROBANTE = [...Object.keys(FORMATOS_COMPROBANTE).map((e) => `.${e}`), ...MIMES_PERMITIDOS].join(",");

export function extension(nombre: string): string {
  const i = nombre.lastIndexOf(".");
  return i < 0 ? "" : nombre.slice(i + 1).toLowerCase();
}

/** Algunos navegadores no informan el tipo de los .heic; entonces se deduce de la extensión. */
export function mimeDeArchivo(a: { name: string; type: string }): string | null {
  const tipo = a.type.toLowerCase();
  if (MIMES_PERMITIDOS.has(tipo)) return tipo;
  return FORMATOS_COMPROBANTE[extension(a.name)] ?? null;
}

export function validarComprobante(a: { name: string; type: string; size: number }): { ok: true; mime: string } | { ok: false; error: string } {
  const mime = mimeDeArchivo(a);
  if (!mime) return { ok: false, error: "Formato no permitido (usa JPG, PNG, WEBP, HEIC o PDF)" };
  if (a.size <= 0) return { ok: false, error: "El archivo está vacío" };
  if (a.size > MAX_BYTES_COMPROBANTE) return { ok: false, error: "Pesa más de 10 MB" };
  return { ok: true, mime };
}

/** Nombre apto para almacenamiento: sin acentos, espacios ni símbolos; conserva la extensión. */
export function nombreSeguro(nombreOriginal: string): string {
  const nombre = nombreOriginal.split(/[\\/]/).pop() ?? ""; // solo el último segmento (ignora rutas)
  const ext = extension(nombre);
  const base = (ext ? nombre.slice(0, -(ext.length + 1)) : nombre)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  return `${base || "comprobante"}${ext ? `.${ext.replace(/[^a-z0-9]/g, "")}` : ""}`;
}

/** <cliente>/<pedido>/<aleatorio>-<nombre>: debe coincidir con las políticas del bucket "comprobantes". */
export function rutaComprobante(clienteId: string, pedidoId: string, nombreOriginal: string, aleatorio: string): string {
  return `${clienteId}/${pedidoId}/${aleatorio}-${nombreSeguro(nombreOriginal)}`;
}

export function pesoLegible(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
