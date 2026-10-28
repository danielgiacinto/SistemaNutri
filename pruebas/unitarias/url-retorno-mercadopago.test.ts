import { describe, expect, it } from "vitest";
import { correoDelPagador, urlRetornoMercadoPago } from "@/servicios/facturacion/mercadopago";

describe("url de retorno para Mercado Pago", () => {
  it("rechaza localhost y usa el respaldo", () => {
    expect(urlRetornoMercadoPago("http://localhost:3000")).toBe("https://www.mercadopago.com.ar");
    expect(urlRetornoMercadoPago("http://127.0.0.1:3000")).toBe("https://www.mercadopago.com.ar");
    expect(urlRetornoMercadoPago(undefined)).toBe("https://www.mercadopago.com.ar");
  });

  it("conserva un dominio público", () => {
    expect(urlRetornoMercadoPago("https://nutrisfera.com.ar")).toBe("https://nutrisfera.com.ar/panel/facturacion");
  });
});

describe("correo del pagador", () => {
  it("en prueba usa el comprador de prueba y en producción el del titular", () => {
    expect(correoDelPagador("titular@consultorio.com", "comprador@testuser.com")).toBe("comprador@testuser.com");
    expect(correoDelPagador("titular@consultorio.com", "  ")).toBe("titular@consultorio.com");
    expect(correoDelPagador("titular@consultorio.com", undefined)).toBe("titular@consultorio.com");
  });
});
