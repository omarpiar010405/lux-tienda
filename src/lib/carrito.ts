// Carrito del cliente (spec 06, ADR-013): solo variante y cantidad, sin precios.
export type LineaCarrito = { varianteId: string; cantidad: number };

export const CLAVE_CARRITO = "lux-carrito-v1";
export const MAX_POR_LINEA = 20;
export const MAX_LINEAS = 30;

export function agregar(lineas: LineaCarrito[], varianteId: string, cantidad = 1, tope = MAX_POR_LINEA): LineaCarrito[] {
  const max = Math.min(tope, MAX_POR_LINEA);
  const existente = lineas.find((l) => l.varianteId === varianteId);
  if (existente) {
    return lineas.map((l) => (l.varianteId === varianteId ? { ...l, cantidad: Math.min(max, l.cantidad + cantidad) } : l));
  }
  if (lineas.length >= MAX_LINEAS) return lineas;
  return [...lineas, { varianteId, cantidad: Math.max(1, Math.min(max, cantidad)) }];
}

export function cambiarCantidad(lineas: LineaCarrito[], varianteId: string, cantidad: number, tope = MAX_POR_LINEA): LineaCarrito[] {
  if (cantidad <= 0) return quitar(lineas, varianteId);
  const max = Math.min(tope, MAX_POR_LINEA);
  return lineas.map((l) => (l.varianteId === varianteId ? { ...l, cantidad: Math.min(max, cantidad) } : l));
}

export function quitar(lineas: LineaCarrito[], varianteId: string): LineaCarrito[] {
  return lineas.filter((l) => l.varianteId !== varianteId);
}

export function totalPiezas(lineas: LineaCarrito[]): number {
  return lineas.reduce((s, l) => s + l.cantidad, 0);
}

/** Lee lo guardado en el navegador con tolerancia a datos dañados o manipulados. */
export function leerCarrito(json: string | null): LineaCarrito[] {
  if (!json) return [];
  try {
    const datos: unknown = JSON.parse(json);
    if (!Array.isArray(datos)) return [];
    const vistos = new Set<string>();
    const resultado: LineaCarrito[] = [];
    for (const d of datos) {
      const id = (d as { varianteId?: unknown })?.varianteId;
      const cant = Number((d as { cantidad?: unknown })?.cantidad);
      if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || vistos.has(id)) continue;
      if (!Number.isInteger(cant) || cant < 1) continue;
      vistos.add(id);
      resultado.push({ varianteId: id, cantidad: Math.min(MAX_POR_LINEA, cant) });
      if (resultado.length >= MAX_LINEAS) break;
    }
    return resultado;
  } catch {
    return [];
  }
}
