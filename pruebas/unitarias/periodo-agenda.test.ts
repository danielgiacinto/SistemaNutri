import { describe, expect, it } from "vitest";
import { filtrarPeriodoAgenda } from "@/componentes/agenda/filtrar-periodo";

const zona = "America/Argentina/Buenos_Aires";

describe("cambio de vista de la agenda con datos del mes", () => {
  it("respeta la medianoche del consultorio al pasar de semana a día", () => {
    const turnos = [
      { inicio: "2026-11-06T02:59:00Z" },
      { inicio: "2026-11-06T03:00:00Z" },
      { inicio: "2026-11-07T02:59:00Z" },
      { inicio: "2026-11-07T03:00:00Z" },
    ];
    expect(filtrarPeriodoAgenda(turnos, "dia", "2026-11-06", zona)).toEqual(turnos.slice(1, 3));
    expect(filtrarPeriodoAgenda(turnos, "semana", "2026-11-06", zona)).toEqual(turnos);
  });

  it("conserva los días del mes anterior y siguiente que pertenecen a la semana", () => {
    const turnos = [
      { inicio: "2026-10-26T12:00:00Z" },
      { inicio: "2026-10-31T12:00:00Z" },
      { inicio: "2026-11-01T12:00:00Z" },
      { inicio: "2026-11-02T12:00:00Z" },
    ];
    expect(filtrarPeriodoAgenda(turnos, "semana", "2026-11-01", zona)).toEqual(turnos.slice(0, 3));
    expect(filtrarPeriodoAgenda(turnos, "mes", "2026-11-01", zona)).toEqual(turnos);
  });
});
