// Cálculos puros. Deben coincidir con las funciones SQL (specs/data-model.md).

export function redondear(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Igual que registrar_compra: promedio ponderado; sin existencias o sin historial, queda el costo nuevo. */
export function costoPromedio(stock: number, promedio: number | null, piezas: number, costo: number): number {
  if (promedio == null || stock <= 0) return redondear(costo);
  return redondear((stock * promedio + piezas * costo) / (stock + piezas));
}

export function importeRenglon(precio: number, cantidad: number, descuento: number): number {
  return redondear(precio * cantidad - descuento);
}

/** (precio × piezas − descuento) − (costo × piezas) */
export function utilidadRenglon(precio: number, cantidad: number, descuento: number, costo: number): number {
  return redondear(importeRenglon(precio, cantidad, descuento) - costo * cantidad);
}

export function margenPct(utilidad: number, ventas: number): number {
  return ventas > 0 ? Math.round((utilidad * 1000) / ventas) / 10 : 0;
}

export function ivaDe(subtotal: number, tasa = 0.16): number {
  return redondear(subtotal * tasa);
}

export function totalCarrito(items: { precio: number; cantidad: number; descuento: number }[]): number {
  return redondear(items.reduce((s, i) => s + i.precio * i.cantidad - i.descuento, 0));
}
