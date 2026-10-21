import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const nombre = process.env.NEXT_PUBLIC_NOMBRE_TIENDA ?? "LUX";
  return {
    name: `${nombre} Boutique`,
    short_name: nombre,
    description: "Inventario, punto de venta y catálogo",
    start_url: "/login", // si ya hay sesión, redirige al POS o al panel según el rol
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    lang: "es-MX",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
