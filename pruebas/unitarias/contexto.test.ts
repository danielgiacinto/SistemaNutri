import { describe, expect, it } from "vitest";
import { calcularDestino, esProfesionalActivo, iniciales, nombreVisible, type ContextoUsuario } from "@/autorizacion/contexto";

function crearContexto(cambios: Partial<ContextoUsuario> = {}): ContextoUsuario {
  return {
    usuarioId: "00000000-0000-0000-0000-000000000001",
    correo: "demo@ejemplo.test",
    nombre: "Ana",
    apellido: "Demo",
    avatarUrl: null,
    tipoCuenta: null,
    esSuperadmin: false,
    preferencias: { tema: "sistema", paleta: "salvia" },
    consultorio: null,
    ...cambios,
  };
}

const consultorioActivo = {
  id: "c1",
  nombre: "Consultorio Demo",
  zonaHoraria: "America/Argentina/Cordoba",
  estado: "activo" as const,
  rol: "titular" as const,
};

describe("calcularDestino", () => {
  it("sin sesión envía al ingreso", () => {
    expect(calcularDestino(null)).toBe("/ingresar");
  });

  it("una cuenta sin alta completa va a la bienvenida", () => {
    expect(calcularDestino(crearContexto())).toBe("/bienvenida");
  });

  it("un profesional con consultorio activo va al panel", () => {
    expect(calcularDestino(crearContexto({ tipoCuenta: "profesional", consultorio: consultorioActivo }))).toBe("/panel");
  });

  it("un profesional con consultorio suspendido ve el aviso de cuenta inactiva", () => {
    const contexto = crearContexto({
      tipoCuenta: "profesional",
      consultorio: { ...consultorioActivo, estado: "suspendido" },
    });
    expect(calcularDestino(contexto)).toBe("/cuenta-inactiva");
    expect(esProfesionalActivo(contexto)).toBe(false);
  });

  it("un paciente va a su portal", () => {
    expect(calcularDestino(crearContexto({ tipoCuenta: "paciente" }))).toBe("/portal");
  });

  it("el superadministrador va al panel de administración", () => {
    expect(calcularDestino(crearContexto({ esSuperadmin: true }))).toBe("/admin");
  });
});

describe("presentación del usuario", () => {
  it("arma nombre e iniciales", () => {
    expect(nombreVisible(crearContexto())).toBe("Ana Demo");
    expect(iniciales(crearContexto())).toBe("AD");
  });

  it("usa el correo cuando no hay nombre", () => {
    const contexto = crearContexto({ nombre: "", apellido: "" });
    expect(nombreVisible(contexto)).toBe("demo@ejemplo.test");
    expect(iniciales(contexto)).toBe("D");
  });
});
