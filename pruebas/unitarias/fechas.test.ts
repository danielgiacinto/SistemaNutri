import { describe, expect, it } from "vitest";
import {
  agregarDias,
  esFechaIso,
  horaCorta,
  instanteDesdeLocal,
  inicioDeSemana,
  isoDiaSemana,
  minutosDesdeMedianoche,
} from "@/lib/fechas";
import { sanitizarBusqueda } from "@/lib/busqueda";
import { calcularImc } from "@/lib/antropometria";

describe("fechas", () => {
  it("reconoce fechas ISO válidas e inválidas", () => {
    expect(esFechaIso("2026-10-24")).toBe(true);
    expect(esFechaIso("2026-02-30")).toBe(false);
    expect(esFechaIso("24/10/2026")).toBe(false);
  });

  it("convierte hora de Córdoba (UTC-3) a UTC", () => {
    const instante = instanteDesdeLocal("2026-10-26", "10:30", "America/Argentina/Cordoba");
    expect(instante.toISOString()).toBe("2026-10-26T13:30:00.000Z");
  });

  it("calcula el lunes de la semana", () => {
    expect(inicioDeSemana("2026-10-24")).toBe("2026-10-19");
    expect(isoDiaSemana("2026-10-26")).toBe(1);
    expect(agregarDias("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("normaliza horas de PostgreSQL para compararlas con las ranuras", () => {
    expect(horaCorta("09:00:00")).toBe("09:00");
    expect(horaCorta("9:05")).toBe("09:05");
    expect(minutosDesdeMedianoche("09:00:00")).toBe(540);
    expect(minutosDesdeMedianoche("09:00:00") <= minutosDesdeMedianoche("09:00")).toBe(true);
  });
});

describe("búsqueda e IMC", () => {
  it("elimina comodines de ilike", () => {
    expect(sanitizarBusqueda("Ana%_Rojas")).toBe("Ana Rojas");
  });

  it("calcula el IMC sin interpretarlo", () => {
    expect(calcularImc(70, 170)).toBe(24.2);
    expect(calcularImc(null, 170)).toBeNull();
  });
});
