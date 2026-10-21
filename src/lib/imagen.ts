/** Reduce fotos de celular (varios MB) a un JPEG de máx. 1600 px antes de subirlas. */
export async function comprimirImagen(archivo: File, max = 1600, calidad = 0.82): Promise<File> {
  if (!archivo.type.startsWith("image/") || archivo.type === "image/gif" || archivo.type === "image/svg+xml") return archivo;
  try {
    const bmp = await createImageBitmap(archivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * escala);
    const h = Math.round(bmp.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return archivo;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", calidad));
    if (!blob || blob.size >= archivo.size) return archivo;
    return new File([blob], archivo.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return archivo;
  }
}
