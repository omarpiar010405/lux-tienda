import { describe, expect, it } from "vitest";
import {
  agruparCompras, buscarProducto, normalizar, parseCanal, parseFecha, parseNumero, parseSeccion,
  resolverVariante, validarCompras, validarVentas, type ProductoCatalogo,
} from "./importar";
import type { Categoria } from "./types";

const playeras: Categoria = { id: "c1", nombre: "Playeras", opciones: ["talla"] };
const jerseys: Categoria = { id: "c2", nombre: "Jerseys", opciones: ["talla", "equipo"] };
const cats = [playeras, jerseys];

describe("parseNumero", () => {
  it.each([
    ["215", 215], ["$ 215,00", 215], ["1.234,50", 1234.5], ["1,234.50", 1234.5],
    ["1,234", 1234], ["500.5", 500.5], ["$1,200", 1200], ["1.200.000", 1200000],
  ])("%s → %s", (txt, esperado) => expect(parseNumero(txt)).toBe(esperado));
  it("rechaza texto y vacíos", () => {
    expect(parseNumero("abc")).toBeNull();
    expect(parseNumero("")).toBeNull();
  });
});

describe("parseFecha", () => {
  it("acepta dd/mm/aaaa, dd/mm/aa y aaaa-mm-dd", () => {
    expect(parseFecha("08/10/2026")).toBe("2026-10-08");
    expect(parseFecha("8/10/26")).toBe("2026-10-08");
    expect(parseFecha("2026-10-08")).toBe("2026-10-08");
  });
  it("rechaza fechas imposibles", () => {
    expect(parseFecha("31/02/2026")).toBeNull();
    expect(parseFecha("hola")).toBeNull();
  });
});

describe("otros parsers", () => {
  it("normaliza acentos y espacios", () => expect(normalizar("  Suéteres  ")).toBe("sueteres"));
  it("sección", () => {
    expect(parseSeccion("Hombre")).toBe("hombre");
    expect(parseSeccion("")).toBe("na");
    expect(parseSeccion("robot")).toBeNull();
  });
  it("canal", () => {
    expect(parseCanal("IG")).toBe("instagram");
    expect(parseCanal("")).toBe("mostrador");
    expect(parseCanal("paloma")).toBeNull();
  });
});

const fila = (o: Record<string, string> = {}) => ({
  fecha_compra: "26/09/2026", seccion: "hombre", categoria: "Playeras", marca: "Boss",
  nombre: "Playera Premium", variante: "M", variante2: "", piezas: "3", costo: "215", precio: "500",
  codigo_barras: "", proveedor: "", ...o,
});

describe("validarCompras", () => {
  it("acepta una fila correcta", () => {
    const [f] = validarCompras([fila()], cats);
    expect(f.errores).toEqual([]);
    expect(f.fecha).toBe("2026-09-26");
    expect(f.valores).toEqual(["M"]);
  });
  it("reporta categoría inexistente, piezas y costo inválidos", () => {
    const [f] = validarCompras([fila({ categoria: "Zapatos", piezas: "0", costo: "x" })], cats);
    expect(f.errores.length).toBe(3);
  });
  it("categorías de 2 atributos piden variante2", () => {
    const [f] = validarCompras([fila({ categoria: "Jerseys", variante: "M", variante2: "" })], cats);
    expect(f.errores.join(" ")).toMatch(/talla y equipo/);
    const [ok] = validarCompras([fila({ categoria: "Jerseys", variante: "M", variante2: "Barcelona" })], cats);
    expect(ok.errores).toEqual([]);
  });
  it("detecta filas repetidas", () => {
    const fs = validarCompras([fila(), fila()], cats);
    expect(fs[0].errores).toEqual([]);
    expect(fs[1].errores.join(" ")).toMatch(/repetida/);
  });
});

describe("agruparCompras", () => {
  it("junta tallas del mismo producto e ignora filas con error", () => {
    const fs = validarCompras([fila({ variante: "CH" }), fila({ variante: "M" }), fila({ nombre: "Otra", piezas: "0" })], cats);
    const grupos = agruparCompras(fs);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].filas).toHaveLength(2);
  });
});

const catalogo: ProductoCatalogo[] = [
  { id: "p1", nombre: "Playera Premium", marca: "Boss", categoria: playeras, variantes: [{ id: "v1", opciones: { talla: "M" } }, { id: "v2", opciones: { talla: "CH" } }] },
  { id: "p2", nombre: "Jersey Nuevo", marca: null, categoria: jerseys, variantes: [{ id: "v3", opciones: { talla: "G", equipo: "Barcelona" } }] },
];

describe("productos existentes y ventas históricas", () => {
  it("encuentra el producto por categoría, marca y nombre", () => {
    expect(buscarProducto({ categoria: playeras, marca: "boss", nombre: "PLAYERA premium" }, catalogo)?.id).toBe("p1");
    expect(buscarProducto({ categoria: playeras, marca: "", nombre: "Playera Premium" }, catalogo)).toBeNull();
  });
  it("resuelve la variante de una venta", () => {
    expect(resolverVariante({ nombre: "playera premium", marca: "", valores: ["m"] }, catalogo).varianteId).toBe("v1");
    expect(resolverVariante({ nombre: "Jersey Nuevo", marca: "", valores: ["G", "barcelona"] }, catalogo).varianteId).toBe("v3");
  });
  it("explica por qué no encuentra", () => {
    expect(resolverVariante({ nombre: "Nada", marca: "", valores: ["M"] }, catalogo).error).toMatch(/importa primero/);
    expect(resolverVariante({ nombre: "Playera Premium", marca: "", valores: ["XXL"] }, catalogo).error).toMatch(/variante/);
  });
  it("valida ventas históricas con costo opcional", () => {
    const [f] = validarVentas([{ fecha: "19/09/2026", canal: "", nombre: "Camisa Maja", marca: "", variante: "TM", variante2: "", piezas: "1", precio: "500", costo: "", metodo_pago: "" }]);
    expect(f.errores).toEqual([]);
    expect(f.costo).toBeNull();
    expect(f.canal).toBe("mostrador");
    expect(f.metodo).toBe("efectivo");
  });
});
