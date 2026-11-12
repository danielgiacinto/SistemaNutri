'use server';
import { z } from 'zod';
import { crearClienteServicio } from '@/lib/supabase/servicio';
import { despacharRecordatoriosCobro } from '@/servicios/recordatorios-cobro';
import { esquemaUuid } from '@/esquemas/comunes';
import { refresh } from 'next/cache';
import { requerirProfesional } from '@/autorizacion/sesion';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { esquemaFinanzas, esquemaPresentacionCatalogo } from '@/esquemas/finanzas';
import { consultarFinanzas } from '@/servicios/finanzas';

export async function cargarFinanzas(turnoId: string) {
  await requerirProfesional();
  const turno = esquemaUuid.parse(turnoId);
  return consultarFinanzas(await crearClienteServidor(), {p_turno:turno});
}
export async function guardarFinanzas(datos: unknown) {
  await requerirProfesional();
  const accionCatalogo=z.object({accion:z.enum(['servicio_catalogo','nota_precios'])}).safeParse(datos);
  if(accionCatalogo.success) {
    const validacion=esquemaPresentacionCatalogo.safeParse(datos);
    if(!validacion.success)return {ok:false,mensaje:'Revisá nombre, precio, duración y longitud de los textos del catálogo.'};
    const {accion,...campos}=validacion.data;
    const cliente=await crearClienteServidor();
    const {error}=await cliente.rpc('gestionar_presentacion_catalogo',{p_datos:{...campos,tipo:accion==='servicio_catalogo'?'servicio':'nota'}});
    if(error)return {ok:false,mensaje:['PGRST202','42883'].includes(error.code)?'Esta mejora del catálogo todavía no está habilitada en este entorno.':'No se pudo guardar el catálogo. Revisá los datos e intentá de nuevo.'};
    refresh();return {ok:true,mensaje:'Catálogo actualizado.'};
  }
  const inmediato=z.object({accion:z.literal('enviar_recordatorio'),turno:esquemaUuid,clave:esquemaUuid}).safeParse(datos);
  if(inmediato.success) {
    const servicio=crearClienteServicio();
    const personalizado=[process.env.CORREO_COBROS_HOST,process.env.CORREO_COBROS_USUARIO,process.env.CORREO_COBROS_CLAVE,process.env.CORREO_COBROS_REMITENTE].some(v=>v?.trim());
    const configurado=personalizado?[process.env.CORREO_COBROS_HOST,process.env.CORREO_COBROS_USUARIO,process.env.CORREO_COBROS_CLAVE,process.env.CORREO_COBROS_REMITENTE].every(v=>v?.trim()):!!(process.env.CORREO_COMERCIAL_USUARIO?.trim()&&process.env.CORREO_COMERCIAL_CLAVE_APLICACION?.trim());
    if(!servicio||!configurado)return {ok:false,mensaje:'El envío de correos todavía no está configurado.'};
    const cliente=await crearClienteServidor();
    const {data,error}=await cliente.rpc('reclamar_recordatorio_manual',{p_turno:inmediato.data.turno,p_clave:inmediato.data.clave});
    if(error)return {ok:false,mensaje:error.message==='esperar_recordatorio'?'Esperá un minuto antes de enviar otro aviso.':'No se pudo enviar. Verificá que la consulta haya finalizado, tenga saldo y autorización.'};
    const reclamo=z.object({id:z.uuid(),reclamado_en:z.string().nullable(),estado:z.string()}).parse(data);
    if(reclamo.estado==='enviado')return {ok:true,mensaje:'Este recordatorio ya fue enviado.'};
    if(reclamo.estado!=='reclamado'||!reclamo.reclamado_en)return {ok:false,mensaje:'Este intento ya fue procesado. Revisá el historial antes de volver a enviar.'};
    const resultado=await despacharRecordatoriosCobro(servicio,{id:reclamo.id,reclamado_en:reclamo.reclamado_en});
    refresh();
    return {ok:resultado.enviados===1,mensaje:resultado.enviados===1?'Recordatorio enviado por correo.':'No se confirmó el envío. Revisá el historial antes de reintentar.'};
  }
  const validacion=esquemaFinanzas.safeParse(datos);
  if (!validacion.success) return {ok:false,mensaje:'Revisá los campos obligatorios, las fechas y los importes. Usá importes en pesos argentinos con hasta dos decimales.'};
  const cliente=await crearClienteServidor();
  const {accion,...campos}=validacion.data;
  const {error}=await cliente.rpc('gestionar_finanzas',{p_accion:accion,p_datos:accion==='configuracion'?{...campos,plazos:[24]}:campos});
  if (error) {
    const mensajes: Record<string,string>={importe_invalido:'El importe debe ser positivo y no superar el saldo.',descuento_invalido:'El descuento no puede superar el importe sin pagar.',sin_consentimiento:'Registrá primero la autorización del paciente.',consulta_no_atendida:'Solo se recuerda una consulta atendida con saldo pendiente.',operacion_historica:'El turno ya tiene un precio histórico. Usá un ajuste para modificar su importe.',precio_sin_configurar:'Asigná un servicio antes de registrar el cobro.',turno_no_cobrable:'El turno está cancelado o ausente.',medio_invalido:'Elegí un medio de pago habilitado.',sin_saldo:'La consulta no tiene saldo pendiente.',fecha_futura:'La fecha de pago no puede estar en el futuro.'};
    return {ok:false,mensaje:mensajes[error.message]??'No se pudo guardar la operación. Revisá los datos y volvé a intentar.'};
  }
  refresh();
  return {ok:true,mensaje:'Operación guardada.'};
}
