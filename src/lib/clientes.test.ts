import { describe, expect, it } from "vitest";
import { DIRECCION_VACIA, normalizarTelefono, sanearNext, validarDireccion, validarRegistro } from "./clientes";

describe("normalizarTelefono", () => {
  it.each([
    ["55 1234 5678", "5512345678"], ["(55) 1234-5678", "5512345678"], ["+52 55 1234 5678", "5512345678"], ["525512345678", "5512345678"],
  ])("%s → %s", (entrada, esperado) => expect(normalizarTelefono(entrada)).toBe(esperado));
  it("rechaza longitudes incorrectas", () => {
    expect(normalizarTelefono("123")).toBeNull();
    expect(normalizarTelefono("")).toBeNull();
    expect(normalizarTelefono(null)).toBeNull();
    expect(normalizarTelefono("55123456789")).toBeNull();
  });
});

const dir = { ...DIRECCION_VACIA, nombre: "Ana", telefono: "55 1234 5678", calle: "Reforma 100", colonia: "Juárez", ciudad: "CDMX", estado: "Ciudad de México", cp: "06600" };

describe("validarDireccion", () => {
  it("acepta una dirección completa y normaliza el teléfono", () => {
    const r = validarDireccion(dir);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.datos.telefono).toBe("5512345678");
  });
  it("reporta cada campo faltante", () => {
    const r = validarDireccion({ ...DIRECCION_VACIA });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errores).sort()).toEqual(["calle", "colonia", "cp", "ciudad", "estado", "nombre", "telefono"].sort());
  });
  it("código postal de 4 dígitos o estado inventado no pasan", () => {
    expect(validarDireccion({ ...dir, cp: "1234" }).ok).toBe(false);
    expect(validarDireccion({ ...dir, estado: "Narnia" }).ok).toBe(false);
  });
});

describe("validarRegistro", () => {
  const ok = { nombre: "Ana", apellidos: "", email: "ana@correo.com", telefono: "5512345678", password: "12345678", acepta_privacidad: true };
  it("acepta datos válidos", () => expect(validarRegistro(ok).ok).toBe(true));
  it("exige aviso de privacidad, contraseña de 8 y correo válido", () => {
    expect(validarRegistro({ ...ok, acepta_privacidad: false }).ok).toBe(false);
    expect(validarRegistro({ ...ok, password: "1234567" }).ok).toBe(false);
    expect(validarRegistro({ ...ok, email: "ana@" }).ok).toBe(false);
  });
});

describe("sanearNext", () => {
  it("solo deja pasar rutas internas", () => {
    expect(sanearNext("/checkout")).toBe("/checkout");
    expect(sanearNext("/cuenta/pedidos?x=1")).toBe("/cuenta/pedidos?x=1");
    expect(sanearNext("https://malo.com")).toBeNull();
    expect(sanearNext("//malo.com")).toBeNull();
    expect(sanearNext("/\\malo.com")).toBeNull();
    expect(sanearNext(null)).toBeNull();
  });
});

import { formatearDireccion, opcional } from "./clientes";
describe("formatearDireccion / opcional", () => {
  it("arma la dirección en una línea y omite el interior vacío", () => {
    expect(formatearDireccion({ calle: "Reforma 100", interior: "4", colonia: "Juárez", ciudad: "CDMX", estado: "Ciudad de México", cp: "06600" }))
      .toBe("Reforma 100, Int. 4, Col. Juárez, CP 06600, CDMX, Ciudad de México");
    expect(formatearDireccion({ calle: "A", colonia: "B", ciudad: "C", estado: "D", cp: "00000" })).not.toContain("Int.");
  });
  it("opcional vuelve null lo vacío", () => {
    expect(opcional("  ")).toBeNull();
    expect(opcional(" hola ")).toBe("hola");
  });
});
