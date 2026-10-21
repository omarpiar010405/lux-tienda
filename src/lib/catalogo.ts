import { detalleOpciones } from "./format";
import type { Opciones, Seccion } from "./types";

export type FilaCatalogo = {
  variante_id: string;
  producto_id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  opciones: Opciones;
  precio: number;
  stock: number;
  disponible: boolean;
  fotos: string[] | null;
  marca: string | null;
  seccion: Seccion;
};

export type ProductoPublico = {
  id: string;
  nombre: string;
  descripcion: string | null;
  marca: string | null;
  categoria: string;
  seccion: Seccion;
  fotos: string[];
  precioMin: number;
  precioMax: number;
  disponible: boolean;
  variantes: { id: string; opciones: Opciones; detalle: string; precio: number; stock: number; disponible: boolean }[];
};

export function agruparCatalogo(filas: FilaCatalogo[]): ProductoPublico[] {
  const mapa = new Map<string, ProductoPublico>();
  for (const f of filas) {
    let p = mapa.get(f.producto_id);
    if (!p) {
      p = {
        id: f.producto_id, nombre: f.nombre, descripcion: f.descripcion, marca: f.marca, categoria: f.categoria,
        seccion: f.seccion, fotos: f.fotos ?? [], precioMin: f.precio, precioMax: f.precio, disponible: false, variantes: [],
      };
      mapa.set(f.producto_id, p);
    }
    p.variantes.push({ id: f.variante_id, opciones: f.opciones, detalle: detalleOpciones(f.opciones), precio: f.precio, stock: f.stock, disponible: f.disponible });
    p.precioMin = Math.min(p.precioMin, f.precio);
    p.precioMax = Math.max(p.precioMax, f.precio);
    if (f.disponible) p.disponible = true;
  }
  return [...mapa.values()].sort((a, b) => Number(b.disponible) - Number(a.disponible) || a.nombre.localeCompare(b.nombre, "es"));
}

export function mensajeWhatsApp(nombre: string, detalle: string, precio: number, url?: string): string {
  const dinero = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(precio);
  const base = `Hola, me interesa: ${nombre}${detalle ? ` (${detalle})` : ""} - ${dinero}. ¿Está disponible?`;
  return url ? `${base}\n${url}` : base;
}

export function urlWhatsApp(telefono: string | undefined, texto: string): string {
  const tel = (telefono ?? "").replace(/\D/g, "");
  return `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
}


export type CategoriaTienda = { nombre: string; foto: string | null; productos: number };

/** Categorías con al menos un producto disponible; la foto sale del primer producto con foto (el orden de entrada manda). */
export function categoriasDisponibles(productos: ProductoPublico[]): CategoriaTienda[] {
  const mapa = new Map<string, CategoriaTienda>();
  for (const p of productos) {
    if (!p.disponible) continue;
    const c = mapa.get(p.categoria) ?? { nombre: p.categoria, foto: null, productos: 0 };
    c.productos += 1;
    if (!c.foto && p.fotos[0]) c.foto = p.fotos[0];
    mapa.set(p.categoria, c);
  }
  return [...mapa.values()].sort((a, b) => b.productos - a.productos || a.nombre.localeCompare(b.nombre, "es"));
}

/** Ordena según una lista de ids (ranking); lo que no está en la lista va al final en su orden original. */
export function ordenarPorIds(productos: ProductoPublico[], ids: string[]): ProductoPublico[] {
  const pos = new Map(ids.map((id, i) => [id, i]));
  return [...productos].sort((a, b) => (pos.get(a.id) ?? Infinity) - (pos.get(b.id) ?? Infinity));
}

export function mensajePedidoWhatsApp(lineas: { nombre: string; detalle: string; cantidad: number; precio: number }[]): string {
  const dinero = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
  const total = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const renglones = lineas.map((l) => `• ${l.cantidad} × ${l.nombre}${l.detalle ? ` (${l.detalle})` : ""} — ${dinero(l.precio * l.cantidad)}`);
  return ["Hola, quiero hacer este pedido:", ...renglones, `Total estimado: ${dinero(total)}`, "¿Me confirmas disponibilidad y envío?"].join("\n");
}
