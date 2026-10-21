import { etiquetaOpcion } from "./format";
import type { Canal, Categoria, MetodoPago, Opciones, Seccion } from "./types";

export const COLUMNAS_COMPRAS = [
  "fecha_compra", "seccion", "categoria", "marca", "nombre",
  "variante", "variante2", "piezas", "costo", "precio", "codigo_barras", "proveedor",
] as const;

export const COLUMNAS_VENTAS = [
  "fecha", "canal", "nombre", "marca", "variante", "variante2", "piezas", "precio", "costo", "metodo_pago",
] as const;

export function normalizar(s: string | null | undefined): string {
  return (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Acepta AAAA-MM-DD y DD/MM/AAAA (también con guiones, puntos o año de 2 dígitos). */
export function parseFecha(s: string): string | null {
  const t = (s ?? "").trim();
  let y: number, mo: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (iso) {
    y = +iso[1]; mo = +iso[2]; d = +iso[3];
  } else {
    const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(t);
    if (!dmy) return null;
    d = +dmy[1]; mo = +dmy[2]; y = +dmy[3];
    if (dmy[3].length === 2) y += 2000;
  }
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Entiende "$1,234.50", "1.234,50" y "215,00" (formato de Google Sheets en español). */
export function parseNumero(s: string): number | null {
  let t = (s ?? "").replace(/[$\s]/g, "").replace(/mxn/i, "");
  if (t === "") return null;
  const coma = t.includes(",");
  const punto = t.includes(".");
  if (coma && punto) {
    t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (coma) {
    const partes = t.split(",");
    t = partes.length === 2 && partes[1].length !== 3 ? `${partes[0]}.${partes[1]}` : partes.join("");
  } else if ((t.match(/\./g) ?? []).length > 1) {
    t = t.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

export function parseSeccion(s: string): Seccion | null {
  const n = normalizar(s);
  if (["", "na", "n/a", "no aplica"].includes(n)) return "na";
  if (["hombre", "caballero", "h"].includes(n)) return "hombre";
  if (["mujer", "dama", "m"].includes(n)) return "mujer";
  if (n === "unisex") return "unisex";
  return null;
}

export function parseCanal(s: string): Canal | null {
  const n = normalizar(s);
  if (n === "") return "mostrador";
  if (["mostrador", "tienda", "local"].includes(n)) return "mostrador";
  if (["instagram", "ig", "insta"].includes(n)) return "instagram";
  if (["whatsapp", "wa", "whats"].includes(n)) return "whatsapp";
  if (["facebook", "fb"].includes(n)) return "facebook";
  if (n === "web") return "web";
  if (n === "otro") return "otro";
  return null;
}

export function parseMetodo(s: string): MetodoPago | null {
  const n = normalizar(s);
  if (["", "efectivo"].includes(n)) return "efectivo";
  if (["tarjeta", "debito", "credito"].includes(n)) return "tarjeta";
  if (["transferencia", "transfer", "spei"].includes(n)) return "transferencia";
  return null;
}

// ---------------------------------------------------------------- compras

export type FilaCompra = {
  linea: number;
  fecha: string;
  seccion: Seccion;
  categoria: Categoria | null;
  marca: string;
  nombre: string;
  valores: string[];
  piezas: number;
  costo: number;
  precio: number;
  codigo: string;
  proveedor: string;
  errores: string[];
};

export function validarCompras(rows: Record<string, string>[], categorias: Categoria[]): FilaCompra[] {
  const porNombre = new Map(categorias.map((c) => [normalizar(c.nombre), c]));
  const vistas = new Set<string>();

  return rows.map((r, i) => {
    const g = (k: string) => (r[k] ?? "").trim();
    const errores: string[] = [];

    const fecha = parseFecha(g("fecha_compra"));
    if (!fecha) errores.push("Fecha inválida (usa dd/mm/aaaa)");

    const seccion = parseSeccion(g("seccion"));
    if (seccion == null) errores.push("Sección debe ser hombre, mujer, unisex o vacía");

    const categoria = porNombre.get(normalizar(g("categoria"))) ?? null;
    if (!categoria) errores.push(`La categoría no existe: "${g("categoria")}"`);
    else if (categoria.opciones.length > 2) errores.push("La categoría tiene más de 2 atributos (no soportado)");

    const nombre = g("nombre");
    if (!nombre) errores.push("Falta el nombre");

    const valores = categoria
      ? categoria.opciones.slice(0, 2).map((_, j) => g(j === 0 ? "variante" : "variante2"))
      : [g("variante")];
    if (categoria && valores.some((v) => !v)) {
      errores.push(`Falta ${categoria.opciones.map(etiquetaOpcion).join(" y ").toLowerCase()}`);
    }

    const piezas = parseNumero(g("piezas"));
    if (piezas == null || !Number.isInteger(piezas) || piezas <= 0) errores.push("Piezas debe ser un entero mayor a 0");
    const costo = parseNumero(g("costo"));
    if (costo == null || costo < 0) errores.push("Costo inválido");
    const precio = parseNumero(g("precio"));
    if (precio == null || precio <= 0) errores.push("Precio inválido");

    const clave = normalizar([categoria?.id, g("marca"), nombre, ...valores, fecha].join("|"));
    if (errores.length === 0) {
      if (vistas.has(clave)) errores.push("Fila repetida (mismo producto, variante y fecha)");
      vistas.add(clave);
    }

    return {
      linea: i + 2, // +1 por el encabezado, +1 porque las filas se cuentan desde 1
      fecha: fecha ?? "",
      seccion: seccion ?? "na",
      categoria,
      marca: g("marca"),
      nombre,
      valores,
      piezas: piezas ?? 0,
      costo: costo ?? 0,
      precio: precio ?? 0,
      codigo: g("codigo_barras"),
      proveedor: g("proveedor"),
      errores,
    };
  });
}

export type GrupoProducto = {
  clave: string;
  categoria: Categoria;
  seccion: Seccion;
  marca: string;
  nombre: string;
  filas: FilaCompra[];
};

/** Agrupa las filas válidas por producto (categoría + marca + nombre). */
export function agruparCompras(filas: FilaCompra[]): GrupoProducto[] {
  const mapa = new Map<string, GrupoProducto>();
  for (const f of filas) {
    if (f.errores.length > 0 || !f.categoria) continue;
    const clave = normalizar(`${f.categoria.id}|${f.marca}|${f.nombre}`);
    const g = mapa.get(clave);
    if (g) g.filas.push(f);
    else mapa.set(clave, { clave, categoria: f.categoria, seccion: f.seccion, marca: f.marca, nombre: f.nombre, filas: [f] });
  }
  return [...mapa.values()];
}

export function opcionesDe(categoria: Categoria, valores: string[]): Opciones {
  const o: Opciones = {};
  categoria.opciones.slice(0, 2).forEach((k, j) => (o[k] = valores[j].trim()));
  return o;
}

export function claveVariante(categoria: Categoria, opciones: Opciones): string {
  return categoria.opciones.slice(0, 2).map((k) => normalizar(opciones[k])).join("|");
}

// ----------------------------------------------------------------- ventas

export type ProductoCatalogo = {
  id: string;
  nombre: string;
  marca: string | null;
  categoria: Categoria;
  variantes: { id: string; opciones: Opciones }[];
};

export type FilaVenta = {
  linea: number;
  fecha: string;
  canal: Canal;
  nombre: string;
  marca: string;
  valores: string[];
  piezas: number;
  precio: number;
  costo: number | null;
  metodo: MetodoPago;
  errores: string[];
};

export function validarVentas(rows: Record<string, string>[]): FilaVenta[] {
  return rows.map((r, i) => {
    const g = (k: string) => (r[k] ?? "").trim();
    const errores: string[] = [];

    const fecha = parseFecha(g("fecha"));
    if (!fecha) errores.push("Fecha inválida (usa dd/mm/aaaa)");
    const canal = parseCanal(g("canal"));
    if (!canal) errores.push(`Canal desconocido: "${g("canal")}"`);
    const metodo = parseMetodo(g("metodo_pago"));
    if (!metodo) errores.push(`Método de pago desconocido: "${g("metodo_pago")}"`);
    if (!g("nombre")) errores.push("Falta el nombre del producto");

    const piezas = parseNumero(g("piezas"));
    if (piezas == null || !Number.isInteger(piezas) || piezas <= 0) errores.push("Piezas debe ser un entero mayor a 0");
    const precio = parseNumero(g("precio"));
    if (precio == null || precio <= 0) errores.push("Precio inválido");
    const costoTxt = g("costo");
    const costo = costoTxt === "" ? null : parseNumero(costoTxt);
    if (costoTxt !== "" && (costo == null || costo < 0)) errores.push("Costo inválido");

    return {
      linea: i + 2,
      fecha: fecha ?? "",
      canal: canal ?? "mostrador",
      nombre: g("nombre"),
      marca: g("marca"),
      valores: [g("variante"), g("variante2")].filter(Boolean),
      piezas: piezas ?? 0,
      precio: precio ?? 0,
      costo,
      metodo: metodo ?? "efectivo",
      errores,
    };
  });
}

export function buscarProducto(
  g: { categoria: Categoria; marca: string; nombre: string },
  productos: ProductoCatalogo[]
): ProductoCatalogo | null {
  return (
    productos.find(
      (p) =>
        p.categoria.id === g.categoria.id &&
        normalizar(p.nombre) === normalizar(g.nombre) &&
        normalizar(p.marca) === normalizar(g.marca)
    ) ?? null
  );
}

/** Encuentra la variante de una venta histórica; marca vacía acepta cualquier marca si solo hay un producto. */
export function resolverVariante(
  f: Pick<FilaVenta, "nombre" | "marca" | "valores">,
  productos: ProductoCatalogo[]
): { varianteId: string | null; error: string | null } {
  const candidatos = productos.filter(
    (p) => normalizar(p.nombre) === normalizar(f.nombre) && (f.marca === "" || normalizar(p.marca) === normalizar(f.marca))
  );
  if (candidatos.length === 0) return { varianteId: null, error: `No existe el producto "${f.nombre}" (importa primero las compras)` };
  if (candidatos.length > 1) return { varianteId: null, error: `Hay varios productos llamados "${f.nombre}"; agrega la marca` };

  const p = candidatos[0];
  const buscada = f.valores.map(normalizar).join("|");
  const v = p.variantes.find((x) => claveVariante(p.categoria, x.opciones).replace(/\|+$/, "") === buscada);
  if (!v) return { varianteId: null, error: `No existe la variante "${f.valores.join(" / ")}" de "${p.nombre}"` };
  return { varianteId: v.id, error: null };
}

// -------------------------------------------------------------- plantillas

export function plantillaCSV(tipo: "compras" | "ventas"): string {
  if (tipo === "compras") {
    return [
      COLUMNAS_COMPRAS.join(","),
      "26/09/2026,hombre,Playeras,Boss,Playera Premium cuello redondo,CH,,3,215,500,,Proveedor A",
      "26/09/2026,hombre,Playeras,Boss,Playera Premium cuello redondo,M,,4,215,500,,Proveedor A",
      "10/09/2026,unisex,Fragancias,,Le Labo Santal 33,100,,3,400,900,7501234567890,",
    ].join("\r\n");
  }
  return [
    COLUMNAS_VENTAS.join(","),
    "19/09/2026,mostrador,Camisa Maja,Maja,TM,,1,500,215,efectivo",
  ].join("\r\n");
}
