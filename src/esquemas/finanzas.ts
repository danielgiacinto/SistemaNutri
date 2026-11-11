import { z } from 'zod';
const id = z.uuid();
const texto = z.string().trim().max(1000);
const dinero = z.number().finite().min(0).max(999999999999).refine(n=>Math.abs(n*100-Math.round(n*100))<0.001,'Usá hasta dos decimales.');
const moneda = z.literal('ARS');
const fecha = z.iso.datetime({offset:true});
const camposServicio = {id:z.union([id,z.literal('')]),nombre:z.string().trim().min(1).max(100),descripcion:texto,precio:dinero,moneda,duracion:z.union([z.literal(''),z.coerce.number().int().min(10).max(240)]),activo:z.boolean()};
export const esquemaPresentacionCatalogo = z.discriminatedUnion('accion',[
  z.object({accion:z.literal('servicio_catalogo'),...camposServicio,aclaracion:z.string().trim().max(300)}),
  z.object({accion:z.literal('nota_precios'),nota:texto}),
]);
export const esquemaFinanzas = z.discriminatedUnion('accion',[
  z.object({accion:z.literal('servicio'),...camposServicio}),
  z.object({accion:z.literal('asignar'),turno:id,servicio:id}),
  z.object({accion:z.literal('pago'),turno:id,clave:id,importe:dinero.refine(n=>n>0),fecha,medio:z.string().min(1).max(100),referencia:texto.max(200),observaciones:texto}),
  z.object({accion:z.literal('ajuste'),turno:id,tipo:z.enum(['fijo','porcentaje']),descuento:dinero,bonificado:z.boolean(),motivo:texto,vence:z.union([fecha,z.literal('')])}).refine(d=>d.tipo!=='porcentaje'||d.descuento<=100,'El porcentaje no puede superar 100.'),
  z.object({accion:z.literal('reversion'),turno:id,pago:id,clave:id,motivo:texto.min(3),tipo:z.enum(['error','devolucion'])}),
  z.object({accion:z.literal('recordatorio'),turno:id,clave:id}),
  z.object({accion:z.literal('consentimiento'),paciente:id,autorizado:z.boolean()}),
  z.object({accion:z.literal('movimiento'),clave:id,tipo:z.enum(['ingreso','egreso']),categoria:texto.min(1).max(100),descripcion:texto.min(1).max(500),importe:dinero.refine(n=>n>0),moneda,medio:texto.min(1).max(100),fecha}),
  z.object({accion:z.literal('revertir_movimiento'),id,clave:id,motivo:texto.min(3).max(500)}),
  z.object({accion:z.literal('configuracion'),moneda,dias:z.number().int().min(0).max(365),recordatorios:z.boolean(),plazos:z.array(z.number().int().min(1).max(8760)).min(1).max(5),instrucciones:texto.max(2000),texto:texto.min(1).max(2000),nombre:texto.min(1).max(100),medios:z.array(z.string().trim().min(1).max(100)).min(1).max(20)}),
]);
