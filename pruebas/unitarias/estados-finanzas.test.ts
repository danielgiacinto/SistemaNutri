import { describe,it,expect } from 'vitest';
import { estadoEconomico,coincideEstadoCobro,deudaExigible,saldoOperacion,movimientosEfectivos,type OperacionConsultorio,type DatosFinanzas,type MovimientoConsultorio,type PagoConsultorio } from '@/tipos/finanzas';
const operacion:OperacionConsultorio={id:'operacion',turno_id:'turno',paciente_id:'paciente',paciente:'Ana',servicio_nombre:'Seguimiento',moneda:'ARS',original:25000,descuento:0,abonado:0,bonificado:false,motivo:null,vence_en:null,inicio:'2026-11-05T12:00:00Z',atendido_en:'2026-11-05T12:45:00Z',estado_turno:'completado'};
describe('estados económicos y estadísticas',()=>{
 it('distingue gratuidad y bonificación de pagos reales',()=>{
  expect(estadoEconomico({...operacion,original:0})).toBe('Sin cargo');
  expect(estadoEconomico({...operacion,descuento:25000,bonificado:true})).toBe('Bonificado');
  expect(estadoEconomico({...operacion,abonado:25000})).toBe('Pagado');
  expect(estadoEconomico(undefined)).toBe('Sin configurar');
 });
 it('los anticipos no constituyen deuda y una cancelación conserva su resolución pendiente',()=>{
  expect(deudaExigible({...operacion,estado_turno:'confirmado'})).toBe(false);
  expect(estadoEconomico({...operacion,abonado:25000,atendido_en:null})).toBe('Pagado anticipadamente');
  expect(estadoEconomico({...operacion,abonado:10000,estado_turno:'cancelado'})).toBe('Anticipo por resolver');
 });
 it('mantiene pagos parciales vencidos compatibles con saldo en unidades monetarias',()=>{
  expect(estadoEconomico({...operacion,abonado:10000})).toBe('Pago parcial');
  expect(saldoOperacion({...operacion,original:0.3,abonado:0.1})).toBe(0.2);
  expect(deudaExigible({...operacion,original:0})).toBe(false);
 });
 it('excluye correcciones por error y conserva devoluciones como salida real',()=>{
  const movimiento:MovimientoConsultorio={id:'ingreso',pago_id:'pago',tipo:'ingreso',categoria:'Consultas',descripcion:'Seguimiento',importe:25000,moneda:'ARS',medio:'Efectivo',fecha:'2026-11-05T12:00:00Z',compensacion_de:null};
  const pago:PagoConsultorio={id:'pago',operacion_id:'operacion',importe:25000,fecha:movimiento.fecha,medio:'Efectivo',referencia:null,observaciones:null,revertido_en:movimiento.fecha,motivo_reversion:'Error',tipo_reversion:'error'};
  const datos:DatosFinanzas={ahora:movimiento.fecha,servicios:[],configuracion:null,consentimientos:[],operaciones:[operacion],pagos:[pago],movimientos:[movimiento,{...movimiento,id:'devolucion',tipo:'egreso'}],ajustes:[],recordatorios:[],intentos:[],atenciones:[]};
  expect(movimientosEfectivos(datos)).toHaveLength(0);
  expect(movimientosEfectivos({...datos,pagos:[{...pago,tipo_reversion:'devolucion'}]})).toHaveLength(2);
  expect(movimientosEfectivos({...datos,pagos:[],movimientos:[{...movimiento,pago_id:null},{...movimiento,id:'compensacion',tipo:'egreso',pago_id:null,compensacion_de:'ingreso'}]})).toHaveLength(0);
 });
});

describe('filtro de estados de cobro',()=>{
 const ahora='2026-11-11T15:00:00Z';
 it('incluye turnos por atender y pagos parciales en Pendientes, sin tratarlos como deuda',()=>{
  for(const estado_turno of ['programado','confirmado','completado']){
   for(const abonado of [0,10000]){
    const o={...operacion,estado_turno,abonado};
    expect(coincideEstadoCobro(o,'pendientes',ahora)).toBe(true);
    expect(coincideEstadoCobro(o,'deuda',ahora)).toBe(estado_turno==='completado');
   }
  }
 });
 it('excluye saldados, cancelados, ausentes, gratuitos y bonificados de Pendientes',()=>{
  for(const cambio of [{abonado:25000},{estado_turno:'cancelado'},{estado_turno:'ausente'},{original:0},{descuento:25000,bonificado:true}]){
   expect(coincideEstadoCobro({...operacion,...cambio},'pendientes',ahora)).toBe(false);
  }
 });
 it('filtra vencimientos solo sobre deudas y mantiene cada estado específico',()=>{
  const o={...operacion,vence_en:'2026-11-10T15:00:00Z'};
  expect(coincideEstadoCobro(o,'vencido',ahora)).toBe(true);
  expect(coincideEstadoCobro({...o,estado_turno:'programado'},'vencido',ahora)).toBe(false);
  expect(coincideEstadoCobro({...o,abonado:25000},'vencido',ahora)).toBe(false);
  expect(coincideEstadoCobro({...o,abonado:25000},'Pagado',ahora)).toBe(true);
  expect(coincideEstadoCobro({...o,abonado:10000},'Pago parcial',ahora)).toBe(true);
  expect(coincideEstadoCobro({...o,abonado:25000},'Pago parcial',ahora)).toBe(false);
  expect(coincideEstadoCobro({...o,estado_turno:'cancelado'},'',ahora)).toBe(true);
 });
});
