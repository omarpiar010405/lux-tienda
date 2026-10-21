import type { SupabaseClient } from "@supabase/supabase-js";

export type ComprobanteFila = { id: string; ruta: string; nombre_original: string | null; tipo_mime: string; tamano: number; created_at: string };
export type ComprobanteVista = { id: string; nombre: string; mime: string; tamano: number; url: string | null };

/** Enlaces temporales (1 hora) a los comprobantes; solo funcionan para quien las políticas permiten leer. */
export async function firmarComprobantes(supabase: SupabaseClient, filas: ComprobanteFila[]): Promise<ComprobanteVista[]> {
  if (filas.length === 0) return [];
  const { data } = await supabase.storage.from("comprobantes").createSignedUrls(filas.map((f) => f.ruta), 3600);
  const porRuta = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return filas.map((f) => ({
    id: f.id, nombre: f.nombre_original ?? "comprobante", mime: f.tipo_mime, tamano: f.tamano, url: porRuta.get(f.ruta) ?? null,
  }));
}
