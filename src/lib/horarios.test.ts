import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("horario de la tienda", () => {
  it("es de lunes a viernes, de 9:00 a 16:00 h", async () => {
    const { textoHorarioTienda } = await import("./horarios");
    expect(textoHorarioTienda()).toBe("De lunes a viernes, de 9:00 a 16:00 h.");
  });

  it("el texto se puede personalizar con NEXT_PUBLIC_HORARIO_TIENDA", async () => {
    vi.stubEnv("NEXT_PUBLIC_HORARIO_TIENDA", "Lunes a sábado de 10:00 a 18:00 h.");
    const { textoHorarioTienda } = await import("./horarios");
    expect(textoHorarioTienda()).toBe("Lunes a sábado de 10:00 a 18:00 h.");
  });

  it("una variable vacía usa el horario de la boutique", async () => {
    vi.stubEnv("NEXT_PUBLIC_HORARIO_TIENDA", "   ");
    const { textoHorarioTienda } = await import("./horarios");
    expect(textoHorarioTienda()).toBe("De lunes a viernes, de 9:00 a 16:00 h.");
  });
});
