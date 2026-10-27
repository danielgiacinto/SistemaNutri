import { describe, expect, it } from "vitest";
import {
  esRutaInvitacion,
  esRutaProtegida,
  esRutaSoloInvitados,
  rutaConSiguiente,
  sanearRutaSiguiente,
} from "@/autorizacion/rutas";

describe("sanearRutaSiguiente", () => {
  it.each([
    ["/panel", "/panel"],
    ["/panel/configuracion?seccion=perfil#apariencia", "/panel/configuracion?seccion=perfil#apariencia"],
    ["/portal", "/portal"],
    ["/invitacion/aceptar", "/invitacion/aceptar"],
    ["/invitacion/abcDEF-_0123456789", "/invitacion/abcDEF-_0123456789"],
  ])("acepta la ruta interna %s", (entrada, esperado) => {
    expect(sanearRutaSiguiente(entrada)).toBe(esperado);
  });

  it.each([
    ["https://sitio-malicioso.com"],
    ["//sitio-malicioso.com"],
    ["/\\sitio-malicioso.com"],
    ["\\\\sitio-malicioso.com"],
    ["javascript:alert(1)"],
    ["panel"],
    ["/panel\n"],
    [""],
    [null],
    [undefined],
  ])("rechaza el valor inseguro %j", (entrada) => {
    expect(sanearRutaSiguiente(entrada)).toBeNull();
  });

  it("rechaza rutas de autenticación para evitar bucles", () => {
    expect(sanearRutaSiguiente("/ingresar")).toBeNull();
    expect(sanearRutaSiguiente("/auth/confirmar?code=x")).toBeNull();
  });

  it("rechaza valores excesivamente largos", () => {
    expect(sanearRutaSiguiente(`/${"a".repeat(600)}`)).toBeNull();
  });
});

describe("clasificación de rutas", () => {
  it.each(["/panel", "/panel/pacientes", "/portal", "/admin/auditoria", "/bienvenida", "/restablecer-contrasena"])(
    "%s exige sesión",
    (ruta) => {
      expect(esRutaProtegida(ruta)).toBe(true);
    },
  );

  it.each(["/", "/ingresar", "/registro", "/auth/confirmar", "/auth/google", "/panelito", "/invitacion/token"])(
    "%s es pública",
    (ruta) => {
      expect(esRutaProtegida(ruta)).toBe(false);
    },
  );

  it("identifica las rutas exclusivas para visitantes sin sesión", () => {
    expect(esRutaSoloInvitados("/ingresar")).toBe(true);
    expect(esRutaSoloInvitados("/registro")).toBe(true);
    expect(esRutaSoloInvitados("/recuperar-contrasena")).toBe(true);
    expect(esRutaSoloInvitados("/restablecer-contrasena")).toBe(false);
  });
});

describe("esRutaInvitacion", () => {
  it("reconoce el alta y la aceptación del portal", () => {
    expect(esRutaInvitacion("/invitacion/aceptar")).toBe(true);
    expect(esRutaInvitacion("/invitacion/abcDEF-_0123456789")).toBe(true);
    expect(esRutaInvitacion("/portal")).toBe(false);
    expect(esRutaInvitacion(null)).toBe(false);
  });
});

describe("rutaConSiguiente", () => {
  it("agrega el destino interno cuando existe", () => {
    expect(rutaConSiguiente("/registro", "/invitacion/token")).toBe("/registro?siguiente=%2Finvitacion%2Ftoken");
    expect(rutaConSiguiente("/ingresar", null)).toBe("/ingresar");
  });
});
