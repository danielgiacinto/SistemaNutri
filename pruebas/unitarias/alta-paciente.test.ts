import { describe, expect, it } from "vitest";
import { esquemaAltaPaciente, esquemaEdicionPaciente } from "@/esquemas/paciente";
import { nombreCompleto } from "@/lib/antropometria";

describe("alta mínima y cobertura del paciente", () => {
  it("permite empezar solo con el nombre y normaliza los opcionales", () => {
    const datos = esquemaAltaPaciente.parse({ nombre: " Ana " });
    expect(datos).toMatchObject({ nombre: "Ana", apellido: "", sexo: null, obraSocial: null, numeroAfiliado: null, correo: null, telefono: null });
    expect(nombreCompleto(datos)).toBe("Ana");
  });

  it("conserva ceros iniciales del afiliado y permite quitar el sexo en edición", () => {
    const datos = esquemaEdicionPaciente.parse({ nombre: "Ana", apellido: "   ", sexo: "", obraSocial: " Cobertura de prueba ", numeroAfiliado: " 00123 ", estado: "activo" });
    expect(datos).toMatchObject({ apellido: "", sexo: null, obraSocial: "Cobertura de prueba", numeroAfiliado: "00123" });
  });

  it.each([{}, { nombre: " " }, { nombre: "Ana", sexo: "otro" }, { nombre: "Ana", correo: "invalido" },
    { nombre: "Ana", fechaNacimiento: "2025-02-29" }, { nombre: "Ana", fechaNacimiento: "1899-12-31" },
    { nombre: "Ana", fechaNacimiento: "2999-01-01" }, { nombre: "Ana", obraSocial: "x".repeat(121) },
  ])("rechaza datos inválidos: %j", (datos) => {
    expect(esquemaAltaPaciente.safeParse(datos).success).toBe(false);
  });
});
