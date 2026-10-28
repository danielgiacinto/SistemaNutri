import { describe, expect, it } from "vitest";
import { validarAutorizacionTarjeta, type DatosAutorizacionTarjeta } from "@/esquemas/tarjeta";

const completos: DatosAutorizacionTarjeta = {
  nombre: "APRO",
  correo: "titular@ejemplo.com",
  tipoDocumento: "DNI",
  documento: "12.345.678",
  banco: "1",
  cuotas: "1",
  bancoListo: true,
  cuotasListas: true,
  numeroValido: true,
  vencimientoValido: true,
  codigoValido: true,
};

describe("validación antes de autorizar la tarjeta", () => {
  it("acepta un formulario completo", () => {
    expect(validarAutorizacionTarjeta(completos)).toEqual({});
  });

  it("marca cada campo vacío", () => {
    const errores = validarAutorizacionTarjeta({
      ...completos,
      nombre: " ",
      correo: "no-es-correo",
      tipoDocumento: "",
      documento: "123",
      banco: "",
      cuotas: "",
      bancoListo: false,
      cuotasListas: false,
      numeroValido: false,
      vencimientoValido: false,
      codigoValido: false,
    });
    expect(Object.keys(errores).sort()).toEqual(
      ["banco", "correo", "cuotas", "cvv", "dni", "nombre", "numero", "tipoDoc", "vence"].sort(),
    );
  });
});
