// Identidad de la boutique. Edita aquí los textos; no hace falta tocar componentes.
// Colores y tipografía: src/app/globals.css (bloque @theme).
export const MARCA = {
  nombre: process.env.NEXT_PUBLIC_NOMBRE_TIENDA ?? "LUX",
  subtitulo: "BOUTIQUE",
  lema: "Moda, fragancias y accesorios",
  portadaTitulo: "Elegancia que se nota",
  portadaTexto: "Prendas, fragancias y accesorios seleccionados para ti.",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMERO ?? "",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
  anuncio: process.env.NEXT_PUBLIC_ANUNCIO ?? "",
  instruccionesPago: (process.env.NEXT_PUBLIC_INSTRUCCIONES_PAGO ?? "").replace(/\\n/g, "\n"), // en .env, \n = salto de línea
  direccionTienda: process.env.NEXT_PUBLIC_DIRECCION_TIENDA ?? "",
  // Caja registradora: apagada por ahora (spec 02 · R-POS-01, ADR-017). Con "true" vuelve a exigirse caja abierta.
  usarCaja: process.env.NEXT_PUBLIC_USAR_CAJA === "true",
} as const;
