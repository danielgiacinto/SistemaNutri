export type ServicioConsultorio = { id: string; nombre: string; descripcion: string | null; precio: number; moneda: string; duracion_minutos: number | null; activo: boolean };
export type ConfiguracionFinanciera = { moneda: string; dias_vencimiento: number; recordatorios: boolean; plazos: number[]; instrucciones: string; texto_recordatorio: string; nombre_remitente: string; medios: string[] };
export type OperacionConsultorio = { id: string; turno_id: string; paciente_id: string; paciente: string; servicio_nombre: string; moneda: string; original: number; descuento: number; abonado: number; bonificado: boolean; motivo: string | null; vence_en: string | null; inicio: string; atendido_en: string | null; estado_turno: string };
export type PagoConsultorio = { id: string; operacion_id: string; importe: number; fecha: string; medio: string; referencia: string | null; observaciones: string | null; revertido_en: string | null; motivo_reversion: string | null; tipo_reversion: string | null };
export type MovimientoConsultorio = { id: string; pago_id: string | null; tipo: 'ingreso' | 'egreso'; categoria: string; descripcion: string; importe: number; moneda: string; medio: string; fecha: string; compensacion_de: string | null };
export type RecordatorioCobro = { id: string; operacion_id: string; estado: string; programado_en: string; enviado_en: string | null; intentos: number };
export type DatosFinanzas = {
  ahora: string;
  servicios: ServicioConsultorio[];
  configuracion: ConfiguracionFinanciera | null;
  consentimientos: { paciente_id: string; autorizado: boolean }[];
  operaciones: OperacionConsultorio[];
  pagos: PagoConsultorio[];
  movimientos: MovimientoConsultorio[];
  ajustes: { id: string; operacion_id: string; fecha: string; detalle: { anterior: number; nuevo: number; motivo: string; bonificado: boolean } }[];
  recordatorios: RecordatorioCobro[];
  intentos: { id: string; recordatorio_id: string; fecha: string; resultado: string }[];
  atenciones: { paciente_id: string; fecha: string; servicio: string | null }[];
};
export const CONFIGURACION_FINANCIERA_INICIAL: ConfiguracionFinanciera = { moneda: 'ARS', dias_vencimiento: 0, recordatorios: false, plazos: [24,48], instrucciones: '', texto_recordatorio: 'Te recordamos que tenés un saldo pendiente. Comunicate con tu nutricionista para coordinar el pago.', nombre_remitente: 'Consultorio nutricional', medios: ['Efectivo','Transferencia','Tarjeta de débito','Tarjeta de crédito','Billetera virtual','Otro'] };
export function saldoOperacion(operacion: OperacionConsultorio) { return Math.round((operacion.original-operacion.descuento-operacion.abonado)*100)/100; }
export function estadoEconomico(operacion: OperacionConsultorio | undefined): string {
  if (!operacion) return 'Sin configurar';
  if (['cancelado','ausente'].includes(operacion.estado_turno)) return operacion.abonado>0 ? 'Anticipo por resolver' : 'Sin deuda exigible';
  if (operacion.original===0) return 'Sin cargo';
  if (operacion.bonificado || operacion.original===operacion.descuento) return 'Bonificado';
  if (saldoOperacion(operacion)===0) return operacion.atendido_en ? 'Pagado' : 'Pagado anticipadamente';
  return operacion.abonado>0 ? 'Pago parcial' : 'Pendiente';
}
export function deudaExigible(operacion: OperacionConsultorio) { return operacion.estado_turno==='completado' && saldoOperacion(operacion)>0; }
export function dineroFinanzas(importe: number, moneda: string) { return new Intl.NumberFormat('es-AR',{style:'currency',currency:moneda}).format(importe); }

/** Las correcciones por error no representan dinero real; las devoluciones sí. */
export function movimientosEfectivos(datos: DatosFinanzas) {
  const pagosErroneos = new Set(datos.pagos.filter(p=>p.tipo_reversion==='error').map(p=>p.id));
  const compensados = new Set(datos.movimientos.map(m=>m.compensacion_de).filter(Boolean));
  return datos.movimientos.filter(m=>!m.compensacion_de&&!compensados.has(m.id)&&(!m.pago_id||!pagosErroneos.has(m.pago_id)));
}
