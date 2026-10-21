import { describe, expect, it } from "vitest";
import {
  MAX_BYTES_COMPROBANTE, metodoPermitido, mimeDeArchivo, nombreSeguro, opcionesDisponibles, pesoLegible, rutaComprobante, validarComprobante,
} from "./pagos";

describe("métodos de pago por entrega", () => {
  it("envío a domicilio solo ofrece transferencia", () => {
    expect(opcionesDisponibles("envio").map((o) => o.valor)).toEqual(["transferencia"]);
    expect(metodoPermitido("envio", "efectivo")).toBe(false);
    expect(metodoPermitido("envio", "tarjeta")).toBe(false);
  });
  it("recoger en tienda ofrece los tres", () => {
    expect(opcionesDisponibles("recoger").map((o) => o.valor)).toEqual(["transferencia", "efectivo", "tarjeta"]);
    expect(metodoPermitido("recoger", "efectivo")).toBe(true);
  });
});

describe("comprobantes", () => {
  const f = (name: string, type: string, size = 1000) => ({ name, type, size });
  it.each([
    ["recibo.jpg", "image/jpeg"], ["captura.PNG", "image/png"], ["foto.webp", "image/webp"],
    ["spei.pdf", "application/pdf"], ["iphone.heic", "image/heic"], ["iphone.heif", "image/heif"],
  ])("acepta %s", (name, type) => expect(validarComprobante(f(name, type)).ok).toBe(true));

  it("deduce el tipo por la extensión cuando el navegador no lo informa (HEIC en escritorio)", () => {
    expect(mimeDeArchivo(f("IMG_1234.HEIC", ""))).toBe("image/heic");
    expect(mimeDeArchivo(f("comprobante.pdf", ""))).toBe("application/pdf");
  });
  it("rechaza formatos peligrosos o desconocidos", () => {
    for (const n of ["virus.exe", "pagina.html", "script.js", "documento.docx", "sin-extension"]) {
      expect(validarComprobante(f(n, "application/octet-stream")).ok).toBe(false);
    }
  });
  it("rechaza archivos vacíos y de más de 10 MB; acepta justo 10 MB", () => {
    expect(validarComprobante(f("a.jpg", "image/jpeg", 0)).ok).toBe(false);
    expect(validarComprobante(f("a.jpg", "image/jpeg", MAX_BYTES_COMPROBANTE + 1)).ok).toBe(false);
    expect(validarComprobante(f("a.jpg", "image/jpeg", MAX_BYTES_COMPROBANTE)).ok).toBe(true);
  });
  it("un tipo permitido con otra extensión se acepta por su tipo real", () => {
    expect(validarComprobante(f("foto", "image/png")).ok).toBe(true);
  });
  it("limpia el nombre para almacenamiento", () => {
    expect(nombreSeguro("Comprobante de Pago (Ñandú) #1.JPG")).toBe("comprobante-de-pago-nandu-1.jpg");
    expect(nombreSeguro("../../etc/passwd")).toBe("passwd");
    expect(nombreSeguro("C:\\Users\\Ana\\recibo final.PDF")).toBe("recibo-final.pdf");
    expect(nombreSeguro("...")).toBe("comprobante");
  });
  it("arma la ruta que exigen las políticas: cliente/pedido/archivo", () => {
    const r = rutaComprobante("c1", "p1", "Mi Recibo.pdf", "ab12");
    expect(r).toBe("c1/p1/ab12-mi-recibo.pdf");
    expect(r.split("/")).toHaveLength(3);
  });
  it("muestra el peso en KB o MB", () => {
    expect(pesoLegible(2048)).toBe("2 KB");
    expect(pesoLegible(5.5 * 1024 * 1024)).toBe("5.5 MB");
  });
});
