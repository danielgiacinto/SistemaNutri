import { describe, expect, it } from "vitest";
import { resumirMediosPago } from "@/lib/medios-pago";
import { CONFIGURACION_FINANCIERA_INICIAL, type DatosFinanzas, type MovimientoConsultorio, type PagoConsultorio } from "@/tipos/finanzas";

const zona = "America/Argentina/Buenos_Aires";
const fecha = "2026-11-11T12:00:00Z";

function movimiento(id: string, importe: number, medio: string, cambios: Partial<MovimientoConsultorio> = {}): MovimientoConsultorio {
  return { id, importe, medio, fecha, moneda: "ARS", tipo: "ingreso", pago_id: null, compensacion_de: null, categoria: "Consultas", descripcion: "Consulta de prueba", ...cambios };
}

function datos(movimientos: MovimientoConsultorio[], pagos: PagoConsultorio[] = []): DatosFinanzas {
  return { ahora: fecha, servicios: [], configuracion: null, consentimientos: [], operaciones: [], pagos, movimientos, ajustes: [], recordatorios: [], intentos: [], atenciones: [] };
}

function pago(id: string, tipo: "error" | "devolucion"): PagoConsultorio {
  return { id, operacion_id: "operacion", importe: 500, fecha, medio: "Transferencia", referencia: null, observaciones: null, revertido_en: fecha, motivo_reversion: "Prueba de reversión", tipo_reversion: tipo };
}

describe("distribución de ingresos por medios de pago", () => {
  it("ordena por importe, suma pagos parciales y movimientos manuales sin duplicar los pagos", () => {
    const resumen = resumirMediosPago(datos([
      movimiento("manual", 100, "Efectivo"),
      movimiento("parcial-1", 200, "Transferencia", { pago_id: "pago-1" }),
      movimiento("parcial-2", 300, "Transferencia", { pago_id: "pago-2" }),
    ]), zona)[0];
    expect(resumen).toMatchObject({ mes: "2026-11", importe: 600, cantidad: 3 });
    expect(resumen.medios.map(fila => [fila.medio, fila.importe, fila.cantidad])).toEqual([["Transferencia", 500, 2], ["Efectivo", 100, 1]]);
    expect(resumen.medios.reduce((suma, fila) => suma + fila.porcentaje, 0)).toBeCloseTo(100);
  });

  it("excluye correcciones aunque se registren en otro mes", () => {
    const resumen = resumirMediosPago(datos([
      movimiento("erroneo", 500, "Transferencia", { pago_id: "pago-error" }),
      movimiento("egreso-error", 500, "Transferencia", { pago_id: "pago-error", tipo: "egreso", fecha: "2026-12-01T12:00:00Z" }),
      movimiento("manual-erroneo", 100, "Efectivo"),
      movimiento("correccion-manual", 100, "Efectivo", { tipo: "egreso", compensacion_de: "manual-erroneo", fecha: "2026-12-02T12:00:00Z" }),
      movimiento("correcto", 200, "Tarjeta de débito"),
    ], [pago("pago-error", "error")]), zona);
    expect(resumen).toHaveLength(1);
    expect(resumen[0]).toMatchObject({ importe: 200, cantidad: 1, medios: [{ medio: "Tarjeta de débito", porcentaje: 100 }] });
  });

  it("mantiene el ingreso original de una devolución y excluye egresos y otras monedas", () => {
    const resumen = resumirMediosPago(datos([
      movimiento("recibido", 500, "Transferencia", { pago_id: "pago-devuelto" }),
      movimiento("devuelto", 500, "Transferencia", { pago_id: "pago-devuelto", tipo: "egreso" }),
      movimiento("gasto", 100, "Efectivo", { tipo: "egreso" }),
      movimiento("dolares", 50, "Efectivo", { moneda: "USD" }),
    ], [pago("pago-devuelto", "devolucion")]), zona)[0];
    expect(resumen).toMatchObject({ importe: 500, cantidad: 1, medios: [{ medio: "Transferencia", porcentaje: 100 }] });
  });

  it("asigna el mes en la zona del consultorio, también al cruzar de año", () => {
    const resumen = resumirMediosPago(datos([
      movimiento("diciembre", 100, "Efectivo", { fecha: "2027-01-01T02:59:59Z" }),
      movimiento("enero", 200, "Efectivo", { fecha: "2027-01-01T03:00:00Z" }),
    ]), zona);
    expect(resumen.map(fila => [fila.mes, fila.importe])).toEqual([["2026-12", 100], ["2027-01", 200]]);
  });

  it("agrupa diferencias de mayúsculas y espacios, conserva nombres personalizados y los centavos", () => {
    const prueba = datos([
      movimiento("uno", 0.1, "  efectivo  "), movimiento("dos", 0.2, "EFECTIVO"),
      movimiento("tres", 0.15, " QR   propio "), movimiento("cuatro", 0.05, " "),
    ]);
    prueba.configuracion = { ...CONFIGURACION_FINANCIERA_INICIAL, medios: ["Efectivo", "QR propio"] };
    const resumen = resumirMediosPago(prueba, zona)[0];
    expect(resumen.importe).toBe(0.5);
    expect(resumen.medios.map(fila => [fila.medio, fila.importe, fila.porcentaje])).toEqual([["Efectivo", 0.3, 60], ["QR propio", 0.15, 30], ["Sin especificar", 0.05, 10]]);
  });

  it("devuelve una colección vacía sin ingresos en lugar de porcentajes inválidos", () => {
    expect(resumirMediosPago(datos([]), zona)).toEqual([]);
    expect(resumirMediosPago(datos([movimiento("solo-egreso", 10, "Efectivo", { tipo: "egreso" })]), zona)).toEqual([]);
  });

  it("usa el mismo corte temporal que el resumen de caja sin perder correcciones posteriores", () => {
    const prueba = datos([
      movimiento("vigente", 200, "Efectivo"),
      movimiento("futuro", 100, "Transferencia", { fecha: "2026-11-12T12:00:00Z" }),
      movimiento("erroneo", 300, "Efectivo"),
      movimiento("correccion", 300, "Efectivo", { tipo: "egreso", compensacion_de: "erroneo", fecha: "2026-11-12T12:00:00Z" }),
    ]);
    const resumen = resumirMediosPago(prueba, zona, prueba.ahora);
    expect(resumen).toMatchObject([{ importe: 200, cantidad: 1, medios: [{ medio: "Efectivo", porcentaje: 100 }] }]);
  });
});
