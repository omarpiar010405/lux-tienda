import type { Canal, MetodoPago, Opciones, Seccion } from "./types";

export const ZONA = "America/Mexico_City";

export function mxn(n: number | null | undefined): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n ?? 0);
}

/** Fecha de hoy (AAAA-MM-DD) en hora de Ciudad de México. */
export function hoyMX(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date());
}

export function sumarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

export function inicioMes(iso: string): string {
  return iso.slice(0, 8) + "01";
}

export function finMes(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function mesAnterior(iso: string): { desde: string; hasta: string } {
  const ultimoDiaMesPasado = sumarDias(inicioMes(iso), -1);
  return { desde: inicioMes(ultimoDiaMesPasado), hasta: ultimoDiaMesPasado };
}

export function fechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: ZONA, dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

/** "2026-10-14" → "14/10/2026" */
export function fechaCorta(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const ETIQUETAS_OPCION: Record<string, string> = {
  talla: "Talla",
  color: "Color",
  ml: "Tamaño (ml)",
  capacidad: "Capacidad",
  equipo: "Equipo",
};

export function etiquetaOpcion(clave: string): string {
  return ETIQUETAS_OPCION[clave] ?? clave;
}

/** {"talla":"M"} → "Talla M" · {"ml":"100"} → "100 ml" */
export function detalleOpciones(o: Opciones | null | undefined): string {
  if (!o) return "";
  return Object.entries(o)
    .map(([k, v]) => (k === "ml" ? `${v} ml` : k === "capacidad" ? v : `${etiquetaOpcion(k)} ${v}`))
    .join(", ");
}

export const SECCIONES: { valor: Seccion; etiqueta: string }[] = [
  { valor: "hombre", etiqueta: "Hombre" },
  { valor: "mujer", etiqueta: "Mujer" },
  { valor: "unisex", etiqueta: "Unisex" },
  { valor: "na", etiqueta: "No aplica" },
];

export const CANALES: { valor: Canal; etiqueta: string }[] = [
  { valor: "mostrador", etiqueta: "Mostrador" },
  { valor: "instagram", etiqueta: "Instagram" },
  { valor: "whatsapp", etiqueta: "WhatsApp" },
  { valor: "facebook", etiqueta: "Facebook" },
  { valor: "web", etiqueta: "Web" },
  { valor: "otro", etiqueta: "Otro" },
];

export const METODOS: { valor: MetodoPago; etiqueta: string }[] = [
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "tarjeta", etiqueta: "Tarjeta" },
  { valor: "transferencia", etiqueta: "Transferencia" },
];

export function etiquetaCanal(c: string): string {
  return CANALES.find((x) => x.valor === c)?.etiqueta ?? c;
}
export function etiquetaMetodo(m: string): string {
  return METODOS.find((x) => x.valor === m)?.etiqueta ?? m;
}
export function etiquetaSeccion(s: string): string {
  return SECCIONES.find((x) => x.valor === s)?.etiqueta ?? s;
}

export const ESTADOS_PEDIDO: Record<string, { etiqueta: string; estilo: string }> = {
  nuevo: { etiqueta: "Pendiente de confirmar", estilo: "bg-amber-100 text-amber-900" },
  confirmado: { etiqueta: "Confirmado", estilo: "bg-sky-100 text-sky-900" },
  enviado: { etiqueta: "Enviado", estilo: "bg-indigo-100 text-indigo-900" },
  entregado: { etiqueta: "Entregado", estilo: "bg-emerald-100 text-emerald-900" },
  cancelado: { etiqueta: "Cancelado", estilo: "bg-neutral-200 text-neutral-700" },
};
export function etiquetaEstadoPedido(e: string): string {
  return ESTADOS_PEDIDO[e]?.etiqueta ?? e;
}
