import { describe, expect, it } from "vitest";
import { esRutaProtegida, esRutaSoloInvitados, sanearRutaSiguiente } from "@/autorizacion/rutas";

describe("sanearRutaSiguiente", () => {
  it.each([
    ["/panel", "/panel"],
    ["/panel/configuracion?seccion=perfil#apariencia", "/panel/configuracion?seccion=perfil#apariencia"],
    ["/portal", "/portal"],
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

  it.each(["/", "/ingresar", "/registro", "/auth/confirmar", "/panelito"])("%s es pública", (ruta) => {
    expect(esRutaProtegida(ruta)).toBe(false);
  });

  it("identifica las rutas exclusivas para visitantes sin sesión", () => {
    expect(esRutaSoloInvitados("/ingresar")).toBe(true);
    expect(esRutaSoloInvitados("/registro")).toBe(true);
    expect(esRutaSoloInvitados("/recuperar-contrasena")).toBe(true);
    expect(esRutaSoloInvitados("/restablecer-contrasena")).toBe(false);
  });
});
