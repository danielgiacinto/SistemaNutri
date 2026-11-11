import { describe, expect, it } from "vitest";
import { contarTurnosPorDia, diasDeTiraAgenda, enlaceAgenda, filtrarPeriodoAgenda, rangoLecturaAgenda } from "@/componentes/agenda/filtrar-periodo";
import { instanteDesdeLocal, rangoDeVista } from "@/lib/fechas";

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

describe("tira diaria de la agenda", () => {
  it("muestra dos semanas desde el lunes y cruza el año sin repetir fechas", () => {
    const dias = diasDeTiraAgenda("2026-12-31");
    expect(dias).toHaveLength(14);
    expect(dias[0]).toBe("2026-12-28");
    expect(dias[13]).toBe("2027-01-10");
    expect(new Set(dias).size).toBe(14);
  });

  it.each(["2026-11-01", "2026-11-30", "2026-12-31", "2028-02-29"])("lee todos los días visibles de %s en la zona del consultorio", fecha => {
    const lectura = rangoLecturaAgenda(fecha, zona);
    const mes = rangoDeVista("mes", fecha, zona);
    expect(lectura.desde.getTime()).toBeLessThanOrEqual(mes.desde.getTime());
    expect(lectura.hasta.getTime()).toBeGreaterThanOrEqual(mes.hasta.getTime());
    for (const dia of diasDeTiraAgenda(fecha)) {
      expect(instanteDesdeLocal(dia, "00:00", zona).getTime()).toBeGreaterThanOrEqual(lectura.desde.getTime());
      expect(instanteDesdeLocal(dia, "23:59", zona).getTime()).toBeLessThan(lectura.hasta.getTime());
    }
  });

  it("cuenta por fecha local y excluye cancelaciones sin ocultar consultas atendidas o ausencias", () => {
    const cantidades = contarTurnosPorDia([
      { inicio: "2026-11-06T02:59:00Z", estado: "confirmado" },
      { inicio: "2026-11-06T03:00:00Z", estado: "programado" },
      { inicio: "2026-11-06T18:00:00Z", estado: "completado" },
      { inicio: "2026-11-06T19:00:00Z", estado: "ausente" },
      { inicio: "2026-11-06T20:00:00Z", estado: "cancelado" },
    ], zona);
    expect([...cantidades]).toEqual([["2026-11-05", 1], ["2026-11-06", 3]]);
  });

  it("mantiene presentación y filtros al navegar a otra fecha", () => {
    const enlace = enlaceAgenda("dia", "2027-01-01", "vista=semana&fecha=2026-12-31&detalle=horarios&estado=confirmado");
    const consulta = new URL(enlace, "http://localhost").searchParams;
    expect(Object.fromEntries(consulta)).toEqual({ vista: "dia", fecha: "2027-01-01", detalle: "horarios", estado: "confirmado" });
  });
});
