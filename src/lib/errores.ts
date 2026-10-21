/** Convierte errores técnicos de Supabase/Postgres en mensajes entendibles. */
export function mensajeError(e: unknown): string {
  const m = (e as { message?: string } | null)?.message ?? "Ocurrió un error inesperado";
  if (m.includes("variantes_codigo_barras_key")) return "Ese código de barras ya existe en otro producto.";
  if (m.includes("variantes_producto_id_opciones_key")) return "Esa variante ya existe en este producto.";
  if (m.includes("variantes_stock_check")) return "No hay existencias suficientes.";
  if (m.includes("codigo_barras_valido")) return "El código de barras no puede estar vacío ni tener espacios en los extremos.";
  if (m.includes("row-level security")) return "No tienes permiso para esa acción.";
  if (m.includes("proveedores_nombre_key")) return "Ese proveedor ya existe.";
  if (m.includes("Could not find the function")) return "Falta ejecutar una migración en Supabase (ver README).";
  return m;
}
