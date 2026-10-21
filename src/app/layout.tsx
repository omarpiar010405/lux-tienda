import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistrarSW } from "@/components/RegistrarSW";

const tienda = process.env.NEXT_PUBLIC_NOMBRE_TIENDA ?? "LUX";

export const metadata: Metadata = {
  title: { default: tienda, template: `%s · ${tienda}` },
  description: "Catálogo, inventario y punto de venta",
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
  appleWebApp: { capable: true, title: tienda, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body className="antialiased">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
