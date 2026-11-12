import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { crearBaseDePruebas, crearUsuario, comoUsuario, comoAnonimo } from './base-de-pruebas';
let bd:PGlite;let usuario:string;let ajeno:string;let consultorio:string;let paciente:string;let servicio:string;let gratuito:string;let turno:string;
const accion=(tipo:string,datos:Record<string,unknown>,actor=usuario)=>comoUsuario(bd,actor,tx=>tx.query('select public.gestionar_finanzas($1,$2::jsonb)',[tipo,JSON.stringify(datos)]));
async function crearTurno(servicioId:string|null,fecha='2027-01-04 12:00:00+00') {const r=await comoUsuario(bd,usuario,tx=>tx.query<{id:string}>("insert into public.turnos(consultorio_id,paciente_id,inicio,fin,servicio_id) values($1,$2,$3::timestamptz,$3::timestamptz+interval '45 minutes',$4) returning id",[consultorio,paciente,fecha,servicioId]));return r.rows[0].id;}
const operacion=async(id=turno)=>(await bd.query<{original:number;descuento:number;abonado:number;bonificado:boolean;id:string}>('select * from public.operaciones_consultorio where turno_id=$1',[id])).rows[0];
beforeAll(async()=>{
  bd=await crearBaseDePruebas();usuario=await crearUsuario(bd,'finanzas-a@prueba.test');ajeno=await crearUsuario(bd,'finanzas-b@prueba.test');
  const r=await comoUsuario(bd,usuario,tx=>tx.query<{id:string}>("select public.crear_consultorio_inicial('Finanzas A') as id"));consultorio=r.rows[0].id;
  await comoUsuario(bd,ajeno,tx=>tx.query("select public.crear_consultorio_inicial('Finanzas B')"));
  paciente=(await comoUsuario(bd,usuario,tx=>tx.query<{id:string}>("insert into public.pacientes(consultorio_id,nombre,apellido,correo) values($1,'Ana','Paciente','ana@prueba.test') returning id",[consultorio]))).rows[0].id;
  servicio=randomUUID();gratuito=randomUUID();
  await accion('servicio',{id:servicio,nombre:'Seguimiento',precio:30000,moneda:'ARS',duracion:'45',activo:true});
  await accion('servicio',{id:gratuito,nombre:'Primera gratuita',precio:0,moneda:'ARS',duracion:'45',activo:true});
  turno=await crearTurno(servicio);
},60000);
afterAll(async()=>{await bd?.close();});
describe('finanzas de pacientes',()=>{
  it('guarda precio histórico y no convierte atención en pago',async()=>{
    await accion('servicio',{id:servicio,nombre:'Seguimiento',precio:40000,moneda:'ARS',duracion:'45',activo:true});
    expect(Number((await operacion()).original)).toBe(30000);
    await comoUsuario(bd,usuario,tx=>tx.query("update public.turnos set estado='completado' where id=$1",[turno]));
    expect(Number((await operacion()).abonado)).toBe(0);
  });
  it('registra pagos parciales idempotentes y un solo ingreso por pago',async()=>{
    const datos={turno,clave:randomUUID(),importe:10000,fecha:new Date().toISOString(),medio:'Efectivo'};
    await accion('pago',datos);await accion('pago',datos);
    expect(Number((await operacion()).abonado)).toBe(10000);
    expect((await bd.query('select * from public.movimientos_consultorio')).rows).toHaveLength(1);
    await expect(accion('pago',{...datos,clave:randomUUID(),importe:25000})).rejects.toThrow(/importe_invalido/);
    await expect(accion('pago',{...datos,clave:randomUUID(),importe:-1})).rejects.toThrow(/importe_invalido/);
  });
  it('impide reducir el precio por debajo de lo abonado y deja trazabilidad',async()=>{
    await expect(accion('ajuste',{turno,descuento:25000,tipo:'fijo',bonificado:false})).rejects.toThrow(/descuento_invalido/);
    await accion('ajuste',{turno,descuento:10,tipo:'porcentaje',bonificado:false,motivo:'Promoción'});
    expect(Number((await operacion()).descuento)).toBe(3000);
    expect((await bd.query('select * from public.ajustes_consultorio')).rows).toHaveLength(1);
  });
  it('revierte pagos sin borrar el historial ni duplicar la devolución',async()=>{
    const pago=(await bd.query<{id:string}>('select id from public.pagos_consultorio')).rows[0].id;
    const datos={turno,pago,clave:randomUUID(),motivo:'Error de registro',tipo:'error'};
    await accion('reversion',datos);await accion('reversion',datos);
    expect(Number((await operacion()).abonado)).toBe(0);
    expect((await bd.query('select * from public.pagos_consultorio')).rows).toHaveLength(1);
    expect((await bd.query("select * from public.movimientos_consultorio where tipo='egreso'")).rows).toHaveLength(1);
  });
  it('servicio gratuito y bonificación no generan ingresos',async()=>{
    const t=await crearTurno(gratuito,'2027-01-04 14:00:00+00');
    expect(Number((await operacion(t)).original)).toBe(0);
    await expect(accion('pago',{turno:t,clave:randomUUID(),importe:1,fecha:new Date().toISOString(),medio:'Efectivo'})).rejects.toThrow(/importe_invalido/);
    await accion('ajuste',{turno,bonificado:true,motivo:'Bonificación'});
    expect((await operacion()).bonificado).toBe(true);
    expect(Number((await operacion()).descuento)).toBe(30000);
  });
  it('no confunde un turno sin configurar con una consulta gratuita',async()=>{
    const t=await crearTurno(null,'2027-01-04 15:00:00+00');expect(await operacion(t)).toBeUndefined();
    await expect(accion('pago',{turno:t,clave:randomUUID(),importe:1,fecha:new Date().toISOString(),medio:'Efectivo'})).rejects.toThrow(/precio_sin_configurar/);
  });
  it('conserva el anticipo al cancelar, permite devolverlo y mantiene vínculo al reprogramar',async()=>{
    const t=await crearTurno(servicio,'2027-01-04 16:00:00+00');
    await accion('pago',{turno:t,clave:randomUUID(),importe:5000,fecha:new Date().toISOString(),medio:'Efectivo'});
    await comoUsuario(bd,usuario,tx=>tx.query("update public.turnos set inicio=inicio+interval '1 day',fin=fin+interval '1 day' where id=$1",[t]));
    await comoUsuario(bd,usuario,tx=>tx.query("update public.turnos set estado='cancelado',cancelado_en=now() where id=$1",[t]));
    expect(Number((await operacion(t)).abonado)).toBe(5000);
    const p=(await bd.query<{id:string}>('select id from public.pagos_consultorio where operacion_id=$1',[(await operacion(t)).id])).rows[0].id;
    await accion('reversion',{turno:t,pago:p,clave:randomUUID(),tipo:'devolucion',motivo:'Cancelación del turno'});
    expect(Number((await operacion(t)).abonado)).toBe(0);
  });
  it('aísla finanzas de otros profesionales, incluso colaboradores del mismo consultorio',async()=>{
    const r=await comoUsuario(bd,ajeno,tx=>tx.query('select * from public.operaciones_consultorio'));expect(r.rows).toHaveLength(0);
    await expect(accion('ajuste',{turno,descuento:0,bonificado:false},ajeno)).rejects.toThrow(/sin_permiso/);
    await expect(comoAnonimo(bd,tx=>tx.query('select public.consultar_finanzas()'))).rejects.toThrow(/permission denied/);
    await expect(comoUsuario(bd,usuario,tx=>tx.query('delete from public.pagos_consultorio'))).rejects.toThrow(/permission denied/);
  });
  it('prepara recordatorios sin duplicados y los cancela al saldar la deuda',async()=>{
    const t=await crearTurno(servicio,new Date(Date.now()-7200000).toISOString());
    await comoUsuario(bd,usuario,tx=>tx.query("update public.turnos set estado='completado' where id=$1",[t]));
    await accion('configuracion',{moneda:'ARS',dias:0,recordatorios:true,plazos:[24,48],instrucciones:'Contactar al consultorio',nombre:'Consultorio',texto:'Recordatorio',medios:['Efectivo']});
    await accion('consentimiento',{paciente,autorizado:true});
    await bd.exec('select public.preparar_recordatorios_cobro();select public.preparar_recordatorios_cobro()');
    const id=(await operacion(t)).id;
    expect((await bd.query('select * from public.recordatorios_cobro where operacion_id=$1',[id])).rows).toHaveLength(1);
    await accion('pago',{turno:t,clave:randomUUID(),importe:40000,fecha:new Date().toISOString(),medio:'Efectivo'});
    expect((await bd.query<{estado:string}>('select estado from public.recordatorios_cobro where operacion_id=$1',[id])).rows.every(r=>r.estado==='cancelado')).toBe(true);
  });
  it('rechaza importes no finitos o redondeados silenciosamente desde la API',async()=>{
    for(const precio of ['NaN',1.234,-1])await expect(accion('servicio',{id:randomUUID(),nombre:'Inválido',precio,moneda:'ARS',activo:true})).rejects.toThrow(/importe_invalido/);
  });
  it('serializa cobros simultáneos y conserva el saldo consistente',async()=>{
    const t=await crearTurno(servicio,'2027-01-04 18:00:00+00');
    const resultados=await Promise.allSettled([1,2].map(()=>accion('pago',{turno:t,clave:randomUUID(),importe:30000,fecha:new Date().toISOString(),medio:'Efectivo'})));
    expect(resultados.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(Number((await operacion(t)).abonado)).toBe(30000);
  });
  it('un colaborador del mismo consultorio no accede a la economía de otro profesional',async()=>{
    const colaborador=await crearUsuario(bd,'colaborador-finanzas@prueba.test');
    await bd.query("insert into public.miembros_consultorio(consultorio_id,usuario_id,rol) values($1,$2,'colaborador')",[consultorio,colaborador]);
    expect((await comoUsuario(bd,colaborador,tx=>tx.query('select * from public.operaciones_consultorio'))).rows).toHaveLength(0);
    await expect(accion('ajuste',{turno,descuento:0,bonificado:false},colaborador)).rejects.toThrow(/sin_permiso/);
  });
  it('los recordatorios se reclaman una vez y se revalida el saldo antes del envío',async()=>{
    const t=await crearTurno(servicio,new Date(Date.now()-10800000).toISOString());
    await comoUsuario(bd,usuario,tx=>tx.query("update public.turnos set estado='completado' where id=$1",[t]));
    await bd.exec('select public.preparar_recordatorios_cobro()');
    const id=(await operacion(t)).id;
    await bd.query("update public.recordatorios_cobro set programado_en=now()-interval '1 minute' where operacion_id=$1",[id]);
    const primer=(await bd.query<{lote:{id:string;reclamado_en:string}[]}>('select public.reclamar_recordatorios_cobro() as lote')).rows[0].lote;
    expect(primer).toHaveLength(1);
    expect((await bd.query<{lote:unknown[]}>('select public.reclamar_recordatorios_cobro() as lote')).rows[0].lote).toHaveLength(0);
    await accion('pago',{turno:t,clave:randomUUID(),importe:10000,fecha:new Date().toISOString(),medio:'Efectivo'});
    expect((await bd.query<{datos:{saldo:number}}>('select public.validar_recordatorio_cobro($1) as datos',[primer[0].id])).rows[0].datos.saldo).toBe(30000);
    await accion('pago',{turno:t,clave:randomUUID(),importe:30000,fecha:new Date().toISOString(),medio:'Efectivo'});
    expect((await bd.query<{datos:unknown}>('select public.validar_recordatorio_cobro($1) as datos',[primer[0].id])).rows[0].datos).toBeNull();
  });
  it('una ausencia no se registra como atención ni recibe recordatorios',async()=>{
    const t=await crearTurno(servicio,'2027-01-04 20:00:00+00');
    await comoUsuario(bd,usuario,tx=>tx.query("update public.turnos set estado='ausente' where id=$1",[t]));
    await bd.exec('select public.preparar_recordatorios_cobro()');
    expect((await bd.query('select * from public.recordatorios_cobro where operacion_id=$1',[(await operacion(t)).id])).rows).toHaveLength(0);
    const lectura=await comoUsuario(bd,usuario,tx=>tx.query<{datos:{operaciones:{turno_id:string}[];atenciones:{fecha:string}[]}}>('select public.consultar_finanzas($1,null) as datos',[t]));
    expect(lectura.rows[0].datos.operaciones).toHaveLength(1);expect(lectura.rows[0].datos.atenciones).toHaveLength(0);
  });
});

describe('recordatorios automáticos diarios',()=>{
 it('envía uno por día, no recupera días omitidos y no duplica al repetir el proceso',async()=>{
  const t=await crearTurno(servicio,new Date(Date.now()-4*86400000).toISOString());
  await bd.query("update public.turnos set estado='completado' where id=$1",[t]);
  const id=(await operacion(t)).id;
  await bd.exec('select public.preparar_recordatorios_cobro()');
  await bd.query("update public.recordatorios_cobro set clave='automatico-diario-'||((now() at time zone 'America/Argentina/Buenos_Aires')::date-1),estado='enviado',enviado_en=now()-interval '1 day' where operacion_id=$1",[id]);
  await bd.query("insert into public.recordatorios_cobro(operacion_id,consultorio_id,profesional_id,clave,programado_en) values($1,$2,$3,'automatico-48',now()-interval '2 days')",[id,consultorio,usuario]);
  await bd.exec('select public.preparar_recordatorios_cobro();select public.preparar_recordatorios_cobro()');
  const filas=(await bd.query<{estado:string;clave:string}>("select estado,clave from public.recordatorios_cobro where operacion_id=$1",[id])).rows;
  expect(filas.filter(r=>r.estado==='pendiente')).toHaveLength(1);
  expect(filas.find(r=>r.clave==='automatico-48')?.estado).toBe('cancelado');
  await bd.query("update public.recordatorios_cobro set estado='enviado',enviado_en=now() where operacion_id=$1 and estado='pendiente'",[id]);
  await bd.exec('select public.preparar_recordatorios_cobro()');
  expect((await bd.query("select id from public.recordatorios_cobro where operacion_id=$1 and estado='pendiente'",[id])).rows).toHaveLength(0);
 });
 it('cancela pendientes al desactivar o revocar autorización y restringe la preparación al servicio',async()=>{
  const t=await crearTurno(servicio,new Date(Date.now()-5*86400000).toISOString());
  await bd.query("update public.turnos set estado='completado' where id=$1",[t]);
  await bd.exec('select public.preparar_recordatorios_cobro()');
  const id=(await operacion(t)).id;
  await bd.query('update public.configuracion_financiera set recordatorios=false where profesional_id=$1',[usuario]);
  await bd.exec('select public.preparar_recordatorios_cobro()');
  expect((await bd.query<{estado:string}>('select estado from public.recordatorios_cobro where operacion_id=$1',[id])).rows[0].estado).toBe('cancelado');
  await bd.query('update public.configuracion_financiera set recordatorios=true where profesional_id=$1',[usuario]);
  await accion('consentimiento',{paciente,autorizado:false});
  await bd.exec('select public.preparar_recordatorios_cobro()');
  expect((await bd.query("select id from public.recordatorios_cobro where operacion_id=$1 and estado='pendiente'",[id])).rows).toHaveLength(0);
  await accion('consentimiento',{paciente,autorizado:true});
  await expect(comoUsuario(bd,usuario,tx=>tx.query('select public.preparar_recordatorios_cobro()'))).rejects.toThrow(/permission denied/);
  await expect(comoAnonimo(bd,tx=>tx.query('select public.preparar_recordatorios_cobro()'))).rejects.toThrow(/permission denied/);
 });
});

describe('envío inmediato y resumen para paciente',()=>{
 it('reclama solo el turno propio, evita duplicados y rechaza futuros o ajenos',async()=>{
  const t=await crearTurno(servicio,'2027-01-05 12:00:00+00');
  await accion('consentimiento',{paciente,autorizado:true});
  await expect(comoUsuario(bd,usuario,tx=>tx.query('select public.reclamar_recordatorio_manual($1,$2)',[t,randomUUID()]))).rejects.toThrow(/consulta_no_atendida/);
  await bd.query("update public.turnos set inicio=now()-interval '2 days',fin=now()-interval '2 days'+interval '1 hour',estado='completado' where id=$1",[t]);
  const clave=randomUUID();
  const reclamar=(actor=usuario)=>comoUsuario(bd,actor,tx=>tx.query<{aviso:{id:string;estado:string}}>('select public.reclamar_recordatorio_manual($1,$2) as aviso',[t,clave]));
  await expect(reclamar(ajeno)).rejects.toThrow(/sin_permiso/);
  const a=(await reclamar()).rows[0].aviso;expect(a.estado).toBe('reclamado');
  const b=(await reclamar()).rows[0].aviso;expect(b.id).toBe(a.id);expect(b.estado).toBe('enviando');
  await expect(comoUsuario(bd,usuario,tx=>tx.query('select public.reclamar_recordatorio_manual($1,$2)',[t,randomUUID()]))).rejects.toThrow(/esperar_recordatorio/);
  await expect(comoAnonimo(bd,tx=>tx.query('select public.reclamar_recordatorio_manual($1,$2)',[t,clave]))).rejects.toThrow(/permission denied/);
 });
 it('solo muestra los cobros propios después de la consulta',async()=>{
  const persona=await crearUsuario(bd,'paciente-cobros@prueba.test');
  await bd.transaction(async tx=>{await tx.query("select set_config('privado.vincular_paciente','1',true)");await tx.query('update public.pacientes set usuario_id=$1 where id=$2',[persona,paciente]);});
  const propios=await comoUsuario(bd,persona,tx=>tx.query<{datos:{turno_id:string;abonado:number}[]}>('select public.consultar_mis_cobros() as datos'));
  expect(propios.rows[0].datos.length).toBeGreaterThan(0);
  const visibles=propios.rows[0].datos.map(c=>c.turno_id);
  const futuros=await bd.query<{id:string}>('select id from public.turnos where fin>now()');
  expect(futuros.rows.every(t=>!visibles.includes(t.id))).toBe(true);
  const ajenos=await comoUsuario(bd,ajeno,tx=>tx.query<{datos:unknown[]}>('select public.consultar_mis_cobros() as datos'));expect(ajenos.rows[0].datos).toEqual([]);
  await expect(comoAnonimo(bd,tx=>tx.query('select public.consultar_mis_cobros()'))).rejects.toThrow(/permission denied/);
 });
});
