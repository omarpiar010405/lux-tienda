import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("MARCA", () => {
  it("convierte \\n del .env en saltos de línea reales en los datos de pago", async () => {
    vi.stubEnv("NEXT_PUBLIC_INSTRUCCIONES_PAGO", "Banco X\\nCLABE 123\\nTitular: LUX");
    const { MARCA } = await import("./marca");
    expect(MARCA.instruccionesPago).toBe("Banco X\nCLABE 123\nTitular: LUX");
  });
  it("la caja está apagada por defecto y se enciende solo con 'true'", async () => {
    vi.stubEnv("NEXT_PUBLIC_USAR_CAJA", "");
    expect((await import("./marca")).MARCA.usarCaja).toBe(false);
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_USAR_CAJA", "true");
    expect((await import("./marca")).MARCA.usarCaja).toBe(true);
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_USAR_CAJA", "false");
    expect((await import("./marca")).MARCA.usarCaja).toBe(false);
  });
});
