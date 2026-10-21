import { describe, expect, it } from "vitest";
import { agregar, cambiarCantidad, leerCarrito, MAX_LINEAS, MAX_POR_LINEA, quitar, totalPiezas } from "./carrito";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

describe("carrito", () => {
  it("agrega y suma la misma variante", () => {
    let c = agregar([], A);
    c = agregar(c, A, 2);
    expect(c).toEqual([{ varianteId: A, cantidad: 3 }]);
  });
  it("respeta el tope de existencias y el máximo por renglón", () => {
    expect(agregar([{ varianteId: A, cantidad: 2 }], A, 5, 3)[0].cantidad).toBe(3);
    expect(agregar([], A, 99)[0].cantidad).toBe(MAX_POR_LINEA);
  });
  it("cambiar a 0 o menos quita el renglón", () => {
    expect(cambiarCantidad([{ varianteId: A, cantidad: 2 }], A, 0)).toEqual([]);
    expect(cambiarCantidad([{ varianteId: A, cantidad: 2 }, { varianteId: B, cantidad: 1 }], B, 4, 3)).toEqual([
      { varianteId: A, cantidad: 2 }, { varianteId: B, cantidad: 3 },
    ]);
  });
  it("quita y cuenta piezas", () => {
    const c = [{ varianteId: A, cantidad: 2 }, { varianteId: B, cantidad: 3 }];
    expect(totalPiezas(c)).toBe(5);
    expect(quitar(c, A)).toEqual([{ varianteId: B, cantidad: 3 }]);
  });
  it("no pasa del máximo de renglones", () => {
    let c: ReturnType<typeof agregar> = [];
    for (let i = 0; i < MAX_LINEAS + 5; i++) {
      c = agregar(c, `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`);
    }
    expect(c).toHaveLength(MAX_LINEAS);
  });
  it("leer tolera basura, repetidos, ids falsos y cantidades absurdas", () => {
    expect(leerCarrito(null)).toEqual([]);
    expect(leerCarrito("no es json")).toEqual([]);
    expect(leerCarrito('{"a":1}')).toEqual([]);
    const bueno = JSON.stringify([
      { varianteId: A, cantidad: 2 }, { varianteId: A, cantidad: 5 }, { varianteId: "x", cantidad: 1 },
      { varianteId: B, cantidad: 999 }, { varianteId: "33333333-3333-3333-3333-333333333333", cantidad: -1 },
    ]);
    expect(leerCarrito(bueno)).toEqual([{ varianteId: A, cantidad: 2 }, { varianteId: B, cantidad: MAX_POR_LINEA }]);
  });
});
