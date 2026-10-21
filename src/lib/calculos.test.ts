import { describe, expect, it } from "vitest";
import { costoPromedio, importeRenglon, ivaDe, margenPct, totalCarrito, utilidadRenglon } from "./calculos";

describe("costoPromedio", () => {
  it("promedia ponderado: 3 a 215 + 2 a 245 = 227", () => {
    expect(costoPromedio(3, 215, 2, 245)).toBe(227);
  });
  it("sin existencias queda el costo nuevo", () => {
    expect(costoPromedio(0, 215, 4, 300)).toBe(300);
  });
  it("sin historial de costo queda el costo nuevo", () => {
    expect(costoPromedio(5, null, 2, 100)).toBe(100);
  });
});

describe("utilidad", () => {
  it("renglón con descuento", () => {
    expect(importeRenglon(500, 1, 50)).toBe(450);
    expect(utilidadRenglon(500, 1, 50, 215)).toBe(235);
  });
  it("margen en porcentaje con un decimal", () => {
    expect(margenPct(528, 970)).toBe(54.4);
    expect(margenPct(10, 0)).toBe(0);
  });
  it("IVA 16%", () => {
    expect(ivaDe(1000)).toBe(160);
  });
  it("total del carrito", () => {
    expect(totalCarrito([{ precio: 520, cantidad: 1, descuento: 0 }, { precio: 500, cantidad: 2, descuento: 100 }])).toBe(1420);
  });
});
