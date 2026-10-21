import type { SupabaseClient } from "@supabase/supabase-js";
import { comprimirImagen } from "./imagen";
import { mensajeError } from "./errores";
import { mimeDeArchivo, rutaComprobante, validarComprobante } from "./pagos";

/** Sube comprobantes al bucket privado y los registra en el pedido. Solo en el navegador. */
export async function subirComprobantes(
  supabase: SupabaseClient, clienteId: string, pedidoId: string, archivos: File[]
): Promise<{ subidos: number; errores: string[] }> {
  let subidos = 0;
  const errores: string[] = [];

  for (const original of archivos) {
    const valido = validarComprobante(original);
    if (!valido.ok) {
      errores.push(`${original.name}: ${valido.error}`);
      continue;
    }
    // Las fotos pesadas se reducen conservando legibilidad; PDF y HEIC se suben tal cual
    const reducible = ["image/jpeg", "image/png", "image/webp"].includes(valido.mime) && original.size > 1_500_000;
    const archivo = reducible ? await comprimirImagen(original, 2200, 0.88) : original;
    const mime = mimeDeArchivo(archivo) ?? valido.mime;
    const ruta = rutaComprobante(clienteId, pedidoId, original.name, crypto.randomUUID().slice(0, 8));

    const { error: eSubida } = await supabase.storage.from("comprobantes").upload(ruta, archivo, { contentType: mime, upsert: false });
    if (eSubida) {
      errores.push(`${original.name}: ${mensajeError(eSubida)}`);
      continue;
    }
    const { error: eRegistro } = await supabase.rpc("adjuntar_comprobante", {
      p_pedido_id: pedidoId, p_ruta: ruta, p_nombre: original.name, p_mime: mime, p_tamano: archivo.size,
    });
    if (eRegistro) {
      await supabase.storage.from("comprobantes").remove([ruta]); // no dejar archivos sueltos
      errores.push(`${original.name}: ${mensajeError(eRegistro)}`);
      continue;
    }
    subidos += 1;
  }
  return { subidos, errores };
}
