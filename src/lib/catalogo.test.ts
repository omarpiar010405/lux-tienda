import { describe, expect, it } from "vitest";
import { agruparCatalogo, categoriasDisponibles, mensajePedidoWhatsApp, mensajeWhatsApp, ordenarPorIds, urlWhatsApp, type FilaCatalogo } from "./catalogo";

const f = (o: Partial<FilaCatalogo>): FilaCatalogo => ({
  variante_id: "v", producto_id: "p1", nombre: "Playera", descripcion: null, categoria: "Playeras",
  opciones: { talla: "M" }, precio: 500, stock: 2, disponible: true, fotos: ["a.jpg"], marca: "Boss", seccion: "hombre", ...o,
});

describe("agruparCatalogo", () => {
  it("junta variantes, calcula rango de precio y disponibilidad", () => {
    const [p] = agruparCatalogo([f({ variante_id: "1", precio: 500 }), f({ variante_id: "2", opciones: { talla: "L" }, precio: 600, stock: 0, disponible: false })]);
    expect(p.variantes).toHaveLength(2);
    expect(p.precioMin).toBe(500);
    expect(p.precioMax).toBe(600);
    expect(p.disponible).toBe(true);
    expect(p.variantes[1].detalle).toBe("Talla L");
  });
  it("manda los agotados al final", () => {
    const r = agruparCatalogo([
      f({ producto_id: "a", nombre: "A", disponible: false, stock: 0 }),
      f({ producto_id: "b", nombre: "B" }),
    ]);
    expect(r.map((x) => x.id)).toEqual(["b", "a"]);
  });
});

describe("WhatsApp", () => {
  it("arma el mensaje y la URL", () => {
    const m = mensajeWhatsApp("Playera Boss", "Talla M", 520);
    expect(m).toContain("Playera Boss (Talla M)");
    expect(urlWhatsApp("+52 55 1234 5678", m)).toMatch(/^https:\/\/wa\.me\/525512345678\?text=/);
  });
});

describe("categoriasDisponibles", () => {
  it("solo cuenta productos disponibles y toma la primera foto", () => {
    const ps = agruparCatalogo([
      f({ producto_id: "a", nombre: "A", categoria: "Playeras", fotos: [] }),
      f({ producto_id: "b", nombre: "B", categoria: "Playeras", fotos: ["b.jpg"] }),
      f({ producto_id: "c", nombre: "C", categoria: "Gorras", disponible: false, stock: 0 }),
      f({ producto_id: "d", nombre: "D", categoria: "Fragancias", fotos: ["d.jpg"] }),
    ]);
    const cats = categoriasDisponibles(ps);
    expect(cats.map((c) => c.nombre)).toEqual(["Playeras", "Fragancias"]);
    expect(cats[0]).toMatchObject({ productos: 2, foto: "b.jpg" });
  });
});

describe("ordenarPorIds", () => {
  it("respeta el ranking y deja el resto al final", () => {
    const ps = agruparCatalogo([f({ producto_id: "a", nombre: "A" }), f({ producto_id: "b", nombre: "B" }), f({ producto_id: "c", nombre: "C" })]);
    expect(ordenarPorIds(ps, ["c", "a"]).map((p) => p.id)).toEqual(["c", "a", "b"]);
  });
});

describe("mensajePedidoWhatsApp", () => {
  it("lista todos los renglones con total", () => {
    const m = mensajePedidoWhatsApp([
      { nombre: "Playera Boss", detalle: "Talla M", cantidad: 2, precio: 520 },
      { nombre: "Perfume", detalle: "100 ml", cantidad: 1, precio: 900 },
    ]);
    expect(m).toContain("• 2 × Playera Boss (Talla M)");
    expect(m).toContain("• 1 × Perfume (100 ml)");
    expect(m).toMatch(/Total estimado: \$1,940\.00/);
  });
});
