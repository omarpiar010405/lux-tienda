import { describe, expect, it } from "vitest";
import { contrasenaValida, generarContrasena } from "./contrasena";

describe("contraseñas", () => {
  it("genera contraseñas legibles de 12 caracteres y distintas entre sí", () => {
    const a = generarContrasena(), b = generarContrasena();
    expect(a).toHaveLength(12);
    expect(a).toMatch(/^[a-zA-Z2-9]+$/);
    expect(a).not.toMatch(/[0OlI1]/);
    expect(a).not.toBe(b);
  });
  it("exige mínimo 8 caracteres", () => {
    expect(contrasenaValida("1234567")).toBe(false);
    expect(contrasenaValida("12345678")).toBe(true);
  });
});
