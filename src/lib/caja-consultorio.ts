import { agregarDias, esFechaIso, fechaEnZona, horaEnZona, instanteDesdeLocal } from "@/lib/fechas";
import { deudaExigible, movimientosEfectivos, saldoOperacion, type DatosFinanzas } from "@/tipos/finanzas";

export function esMesCaja(mes: string): boolean { return /^\d{4}-\d{2}$/.test(mes) && esFechaIso(`${mes}-01`); }
export function desplazarMesCaja(mes: string, cantidad: number): string {
  const [anio, numero] = mes.split("-").map(Number);
  return new Date(Date.UTC(anio, numero - 1 + cantidad, 1)).toISOString().slice(0, 7);
}

/** Importes en centavos; ingresos brutos de consultas, con devoluciones como egresos. */
export function resumirCaja(datos: DatosFinanzas, mes: string, zona: string) {
  const ahora = new Date(datos.ahora);
  const hoy = fechaEnZona(ahora, zona);
  const fechaLocal = (fecha: string) => fechaEnZona(new Date(fecha), zona);
  const centavos = (importe: number) => Math.round(importe * 100);
  const operaciones = new Map(datos.operaciones.map(operacion => [operacion.id, operacion]));
  const pagos = new Map(datos.pagos.map(pago => [pago.id, pago]));
  const efectivos = movimientosEfectivos(datos).filter(movimiento => movimiento.moneda === "ARS" && new Date(movimiento.fecha) <= ahora);
  const movimientosMes = efectivos.filter(movimiento => fechaLocal(movimiento.fecha).startsWith(mes));
  const cobros = efectivos.flatMap(movimiento => {
    const pago = movimiento.pago_id ? pagos.get(movimiento.pago_id) : undefined;
    const operacion = pago ? operaciones.get(pago.operacion_id) : undefined;
    return movimiento.tipo === "ingreso" && operacion?.moneda === "ARS" ? [{ movimiento, operacion }] : [];
  });
  const cobrosMes = cobros.filter(cobro => fechaLocal(cobro.movimiento.fecha).startsWith(mes));
  const totalCentavos = cobrosMes.reduce((suma, cobro) => suma + centavos(cobro.movimiento.importe), 0);
  const turnos = new Set(cobrosMes.map(cobro => cobro.operacion.turno_id));
  const deudas = datos.operaciones.filter(operacion => operacion.moneda === "ARS" && deudaExigible(operacion));
  const deudasMes = deudas.filter(operacion => operacion.atendido_en && fechaLocal(operacion.atendido_en).startsWith(mes));
  const sumarSaldos = (filas: typeof deudas) => filas.reduce((suma, operacion) => suma + centavos(saldoOperacion(operacion)), 0) / 100;
  const anterior = desplazarMesCaja(mes, -1);
  const ultimoDiaAnterior = agregarDias(`${mes}-01`, -1);
  const diaComparacion = Math.min(Number(hoy.slice(8)), Number(ultimoDiaAnterior.slice(8)));
  const corteAnterior = instanteDesdeLocal(`${anterior}-${String(diaComparacion).padStart(2, "0")}`, horaEnZona(zona, ahora), zona).getTime() + ahora.getUTCSeconds() * 1000 + ahora.getUTCMilliseconds();
  const comparable = cobros.filter(cobro => fechaLocal(cobro.movimiento.fecha).startsWith(anterior) && (mes !== hoy.slice(0, 7) || new Date(cobro.movimiento.fecha).getTime() <= corteAnterior));
  const importeAnterior = comparable.reduce((suma, cobro) => suma + centavos(cobro.movimiento.importe), 0) / 100;
  const servicios = new Map<string, { nombre: string; centavos: number; turnos: Set<string> }>();
  const dias = Array.from({ length: Number(agregarDias(`${desplazarMesCaja(mes, 1)}-01`, -1).slice(8)) }, (_, indice) => ({ fecha: `${mes}-${String(indice + 1).padStart(2, "0")}`, centavos: 0 }));
  for (const cobro of cobrosMes) {
    const nombre = cobro.operacion.servicio_nombre;
    const fila = servicios.get(nombre) ?? { nombre, centavos: 0, turnos: new Set<string>() };
    fila.centavos += centavos(cobro.movimiento.importe);
    fila.turnos.add(cobro.operacion.turno_id);
    servicios.set(nombre, fila);
    dias[Number(fechaLocal(cobro.movimiento.fecha).slice(8)) - 1].centavos += centavos(cobro.movimiento.importe);
  }
  const ingresos = movimientosMes.filter(movimiento => movimiento.tipo === "ingreso").reduce((suma, movimiento) => suma + centavos(movimiento.importe), 0) / 100;
  const egresos = movimientosMes.filter(movimiento => movimiento.tipo === "egreso").reduce((suma, movimiento) => suma + centavos(movimiento.importe), 0) / 100;
  return {
    cobrado: totalCentavos / 100, consultas: turnos.size, promedio: turnos.size ? totalCentavos / turnos.size / 100 : null,
    importeAnterior, comparacionParcial: mes === hoy.slice(0, 7),
    deudasMes, deudas, deudaMes: sumarSaldos(deudasMes), deudaAcumulada: sumarSaldos(deudas),
    anticipos: datos.operaciones.filter(operacion => operacion.moneda === "ARS" && ["cancelado", "ausente"].includes(operacion.estado_turno) && operacion.abonado > 0),
    servicios: [...servicios.values()].sort((a, b) => b.centavos - a.centavos).map(fila => ({ nombre: fila.nombre, importe: fila.centavos / 100, cantidad: fila.turnos.size, porcentaje: totalCentavos ? fila.centavos / totalCentavos * 100 : 0 })),
    dias: dias.map(dia => ({ fecha: dia.fecha, importe: dia.centavos / 100 })),
    cobrosMes: cobrosMes.toSorted((a, b) => b.movimiento.fecha.localeCompare(a.movimiento.fecha)), ingresos, egresos, neto: Math.round((ingresos - egresos) * 100) / 100,
  };
}
