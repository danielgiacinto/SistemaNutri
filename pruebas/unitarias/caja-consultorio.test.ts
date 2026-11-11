import { describe, expect, it } from "vitest";
import { esMesCaja, resumirCaja } from "@/lib/caja-consultorio";
import type { DatosFinanzas, MovimientoConsultorio, OperacionConsultorio, PagoConsultorio } from "@/tipos/finanzas";

const zona = "America/Argentina/Buenos_Aires";
const operacion = (campos: Partial<OperacionConsultorio> = {}): OperacionConsultorio => ({ id: "op1", turno_id: "t1", paciente_id: "p1", paciente: "Paciente de prueba", servicio_nombre: "Seguimiento histórico", moneda: "ARS", original: 100, descuento: 0, abonado: 0, bonificado: false, motivo: null, vence_en: null, inicio: "2026-11-02T12:00:00Z", atendido_en: null, estado_turno: "programado", ...campos });
const pago = (campos: Partial<PagoConsultorio> = {}): PagoConsultorio => ({ id: "pago1", operacion_id: "op1", importe: 40, fecha: "2026-11-02T12:00:00Z", medio: "Efectivo", referencia: null, observaciones: null, revertido_en: null, motivo_reversion: null, tipo_reversion: null, ...campos });
const movimiento = (campos: Partial<MovimientoConsultorio> = {}): MovimientoConsultorio => ({ id: "m1", pago_id: "pago1", tipo: "ingreso", categoria: "consulta", descripcion: "Cobro de prueba", importe: 40, moneda: "ARS", medio: "Efectivo", fecha: "2026-11-02T12:00:00Z", compensacion_de: null, ...campos });
const datos = (campos: Partial<DatosFinanzas> = {}): DatosFinanzas => ({ ahora: "2026-11-11T15:30:00Z", servicios: [], configuracion: null, consentimientos: [], operaciones: [operacion()], pagos: [pago()], movimientos: [movimiento()], ajustes: [], recordatorios: [], intentos: [], atenciones: [], ...campos });

describe("Caja del consultorio", () => {
  it("agrupa pagos parciales de un turno y conserva el nombre histórico, sin duplicar consultas", () => {
    const resumen = resumirCaja(datos({ pagos: [pago(), pago({ id: "pago2", importe: 60, medio: "Transferencia" })], movimientos: [movimiento(), movimiento({ id: "m2", pago_id: "pago2", importe: 60, medio: "Transferencia" })] }), "2026-11", zona);
    expect(resumen.cobrado).toBe(100);
    expect(resumen.consultas).toBe(1);
    expect(resumen.promedio).toBe(100);
    expect(resumen.servicios).toEqual([{ nombre: "Seguimiento histórico", importe: 100, cantidad: 1, porcentaje: 100 }]);
    expect(resumen.dias.reduce((suma, dia) => suma + dia.importe, 0)).toBe(100);
  });

  it("separa ingresos manuales, devoluciones y neto sin restar una devolución dos veces", () => {
    const resumen = resumirCaja(datos({ pagos: [pago({ revertido_en: "2026-11-03T12:00:00Z", tipo_reversion: "devolucion" })], movimientos: [movimiento(), movimiento({ id: "manual", pago_id: null, importe: 10 }), movimiento({ id: "devolucion", tipo: "egreso", importe: 40 })] }), "2026-11", zona);
    expect(resumen).toMatchObject({ cobrado: 40, ingresos: 50, egresos: 40, neto: 10, consultas: 1 });
  });

  it("resuelve correcciones sobre todo el historial, aunque la compensación sea de otro mes", () => {
    const resumen = resumirCaja(datos({ movimientos: [movimiento(), movimiento({ id: "comp", tipo: "egreso", fecha: "2026-12-02T12:00:00Z", compensacion_de: "m1" })] }), "2026-11", zona);
    expect(resumen).toMatchObject({ cobrado: 0, ingresos: 0, egresos: 0, promedio: null });
    const pagoErroneo = resumirCaja(datos({ pagos: [pago({ tipo_reversion: "error", revertido_en: "2026-11-03T12:00:00Z" })] }), "2026-11", zona);
    expect(pagoErroneo.cobrado).toBe(0);
  });

  it("asigna la deuda por atención local y deja futuros y anticipos cancelados aparte", () => {
    const resumen = resumirCaja(datos({ operaciones: [
      operacion({ estado_turno: "completado", atendido_en: "2026-11-01T03:00:00Z", abonado: 40 }),
      operacion({ id: "op2", turno_id: "t2", estado_turno: "completado", atendido_en: "2026-11-01T02:59:00Z" }),
      operacion({ id: "op3", turno_id: "t3", estado_turno: "cancelado", abonado: 25 }),
      operacion({ id: "op4", turno_id: "t4", estado_turno: "ausente", abonado: 10 }),
      operacion({ id: "op5", turno_id: "t5", estado_turno: "programado", inicio: "2026-11-12T12:00:00Z" }),
    ] }), "2026-11", zona);
    expect(resumen.deudaMes).toBe(60);
    expect(resumen.deudaAcumulada).toBe(160);
    expect(resumen.deudasMes.map(fila => fila.id)).toEqual(["op1"]);
    expect(resumen.anticipos.map(fila => fila.id)).toEqual(["op3", "op4"]);
  });

  it("respeta medianoches locales, centavos y moneda sin mezclar importes futuros", () => {
    const resumen = resumirCaja(datos({ movimientos: [
      movimiento({ id: "antes", fecha: "2026-11-01T02:59:00Z", importe: 100 }),
      movimiento({ id: "inicio", fecha: "2026-11-01T03:00:00Z", importe: 0.1 }),
      movimiento({ id: "centavos", fecha: "2026-11-02T03:00:00Z", importe: 0.2 }),
      movimiento({ id: "usd", moneda: "USD", importe: 100 }),
      movimiento({ id: "futuro", fecha: "2026-11-12T12:00:00Z", importe: 100 }),
    ] }), "2026-11", zona);
    expect(resumen.cobrado).toBe(0.3);
    expect(resumen.importeAnterior).toBe(0);
    expect(resumen.servicios.reduce((suma, fila) => suma + Math.round(fila.importe * 100), 0)).toBe(30);
  });

  it("compara el mes en curso a igual día y hora, limitando meses más cortos", () => {
    const resumen = resumirCaja(datos({ ahora: "2026-03-31T15:30:00Z", movimientos: [
      movimiento({ id: "antes", fecha: "2026-02-28T15:29:00Z", importe: 10 }),
      movimiento({ id: "despues", fecha: "2026-02-28T15:31:00Z", importe: 20 }),
      movimiento({ id: "actual", fecha: "2026-03-31T15:00:00Z", importe: 30 }),
    ] }), "2026-03", zona);
    expect(resumen.importeAnterior).toBe(10);
    expect(resumen.comparacionParcial).toBe(true);
    expect(resumirCaja(datos({ ahora: "2026-04-02T12:00:00Z", movimientos: [movimiento({ fecha: "2026-02-28T23:00:00Z", importe: 20 })] }), "2026-03", zona).importeAnterior).toBe(20);
  });

  it("presenta un mes vacío y valida años bisiestos y meses de URL", () => {
    const resumen = resumirCaja(datos({ operaciones: [], pagos: [], movimientos: [] }), "2028-02", zona);
    expect(resumen.dias).toHaveLength(29);
    expect(resumen).toMatchObject({ cobrado: 0, consultas: 0, promedio: null, importeAnterior: 0, deudaMes: 0, neto: 0 });
    expect(esMesCaja("2028-02")).toBe(true);
    expect(esMesCaja("2028-13")).toBe(false);
    expect(esMesCaja("2028-2")).toBe(false);
  });
});
