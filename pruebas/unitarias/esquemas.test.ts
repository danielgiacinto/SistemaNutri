import { describe, expect, it } from "vitest";
import { esquemaIngreso, esquemaRegistro, esquemaRestablecimiento } from "@/esquemas/autenticacion";
import { esquemaAltaConsultorio, esquemaDatosConsultorio } from "@/esquemas/consultorio";
import { esquemaPreferenciasApariencia } from "@/esquemas/perfil";
import { traducirErrorAutenticacion } from "@/servicios/autenticacion";

const registroValido = {
  nombre: " Ana ",
  apellido: "Demo",
  correo: "  ANA@Ejemplo.TEST ",
  contrasena: "clave1234",
  confirmacion: "clave1234",
};

describe("esquemas de autenticación", () => {
  it("normaliza el correo y recorta espacios", () => {
    const resultado = esquemaRegistro.parse(registroValido);
    expect(resultado.correo).toBe("ana@ejemplo.test");
    expect(resultado.nombre).toBe("Ana");
  });

  it("exige letras y números en la contraseña", () => {
    const soloLetras = esquemaRegistro.safeParse({ ...registroValido, contrasena: "abcdefgh", confirmacion: "abcdefgh" });
    const soloNumeros = esquemaRegistro.safeParse({ ...registroValido, contrasena: "12345678", confirmacion: "12345678" });
    const corta = esquemaRegistro.safeParse({ ...registroValido, contrasena: "ab1", confirmacion: "ab1" });
    expect(soloLetras.success).toBe(false);
    expect(soloNumeros.success).toBe(false);
    expect(corta.success).toBe(false);
  });

  it("detecta contraseñas que no coinciden en el campo de confirmación", () => {
    const resultado = esquemaRestablecimiento.safeParse({ contrasena: "clave1234", confirmacion: "clave12345" });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0].path).toEqual(["confirmacion"]);
  });

  it("rechaza correos inválidos al ingresar", () => {
    expect(esquemaIngreso.safeParse({ correo: "no-es-correo", contrasena: "x" }).success).toBe(false);
  });
});

describe("esquemas del consultorio", () => {
  it("acepta la zona horaria predeterminada de Córdoba", () => {
    const resultado = esquemaAltaConsultorio.parse({ nombre: "Consultorio", zonaHoraria: "America/Argentina/Cordoba" });
    expect(resultado.zonaHoraria).toBe("America/Argentina/Cordoba");
  });

  it("rechaza zonas horarias fuera de la lista", () => {
    expect(esquemaAltaConsultorio.safeParse({ nombre: "Consultorio", zonaHoraria: "Marte/Olympus" }).success).toBe(false);
  });

  it("convierte los opcionales vacíos en null", () => {
    const resultado = esquemaDatosConsultorio.parse({
      nombre: "Consultorio",
      zonaHoraria: "America/Argentina/Cordoba",
      telefono: "   ",
      direccion: "",
      duracionTurnoMinutos: 45,
    });
    expect(resultado.telefono).toBeNull();
    expect(resultado.direccion).toBeNull();
  });

  it("exige al menos dos caracteres en el nombre", () => {
    expect(esquemaAltaConsultorio.safeParse({ nombre: " a ", zonaHoraria: "America/Argentina/Cordoba" }).success).toBe(
      false,
    );
  });
});

describe("preferencias de apariencia", () => {
  it("solo acepta temas y paletas conocidos", () => {
    expect(esquemaPreferenciasApariencia.safeParse({ tema: "oscuro", paleta: "oceano" }).success).toBe(true);
    expect(esquemaPreferenciasApariencia.safeParse({ tema: "neon", paleta: "oceano" }).success).toBe(false);
    expect(esquemaPreferenciasApariencia.safeParse({ tema: "claro", paleta: "rojo" }).success).toBe(false);
  });
});

describe("traducción de errores de autenticación", () => {
  it("traduce códigos conocidos y usa un mensaje genérico para el resto", () => {
    expect(traducirErrorAutenticacion("invalid_credentials")).toMatch(/correo o la contraseña/);
    expect(traducirErrorAutenticacion("codigo_desconocido")).toMatch(/No pudimos completar/);
    expect(traducirErrorAutenticacion(undefined)).toMatch(/No pudimos completar/);
  });
});
