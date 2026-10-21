import { describe, expect, it } from "vitest";
import { mensajeError } from "./errores";

describe("mensajeError", () => {
  it("traduce código de barras duplicado", () => {
    expect(mensajeError({ message: 'duplicate key value violates unique constraint "variantes_codigo_barras_key"' })).toMatch(/código de barras/);
  });
  it("traduce falta de stock", () => {
    expect(mensajeError({ message: 'violates check constraint "variantes_stock_check"' })).toMatch(/existencias/);
  });
  it("deja pasar mensajes propios de las funciones", () => {
    expect(mensajeError({ message: "Ya hay una caja abierta" })).toBe("Ya hay una caja abierta");
  });
  it("tolera errores sin mensaje", () => {
    expect(mensajeError(null)).toMatch(/inesperado/);
  });
});
