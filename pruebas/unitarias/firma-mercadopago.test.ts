import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verificarFirmaMercadoPago } from "@/servicios/facturacion/firma";

function firma(secreto: string, id: string, solicitud: string, ts: string) {
  const manifiesto = `id:${id};request-id:${solicitud};ts:${ts};`;
  const v1 = createHmac("sha256", secreto).update(manifiesto).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("firma de Mercado Pago", () => {
  it("acepta una firma válida", () => {
    const secreta = "clave-de-prueba";
    expect(
      verificarFirmaMercadoPago({
        firma: firma(secreta, "999", "req-1", "1704908010"),
        solicitudId: "req-1",
        datoId: "999",
        secreto: secreta,
      }),
    ).toBe(true);
  });

  it("rechaza una firma alterada", () => {
    expect(
      verificarFirmaMercadoPago({
        firma: "ts=1704908010,v1=0000",
        solicitudId: "req-1",
        datoId: "999",
        secreto: "clave-de-prueba",
      }),
    ).toBe(false);
  });

  it("rechaza si falta el secreto", () => {
    expect(
      verificarFirmaMercadoPago({
        firma: firma("x", "1", "r", "1"),
        solicitudId: "r",
        datoId: "1",
        secreto: "",
      }),
    ).toBe(false);
  });
});
