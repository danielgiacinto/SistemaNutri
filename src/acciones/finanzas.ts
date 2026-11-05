'use server';
import { esquemaUuid } from '@/esquemas/comunes';
import { refresh } from 'next/cache';
import { requerirProfesional } from '@/autorizacion/sesion';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { esquemaFinanzas } from '@/esquemas/finanzas';
import { consultarFinanzas } from '@/servicios/finanzas';

export async function cargarFinanzas(turnoId: string) {
  await requerirProfesional();
  const turno = esquemaUuid.parse(turnoId);
  return consultarFinanzas(await crearClienteServidor(), {p_turno:turno});
}
export async function guardarFinanzas(datos: unknown) {
  await requerirProfesional();
  const validacion=esquemaFinanzas.safeParse(datos);
  if (!validacion.success) return {ok:false,mensaje:'Revisá los campos obligatorios, las fechas y los importes. Usá importes en pesos argentinos con hasta dos decimales.'};
  const cliente=await crearClienteServidor();
  const {accion,...campos}=validacion.data;
  const {error}=await cliente.rpc('gestionar_finanzas',{p_accion:accion,p_datos:campos});
  if (error) {
    const mensajes: Record<string,string>={importe_invalido:'El importe debe ser positivo y no superar el saldo.',descuento_invalido:'El descuento no puede superar el importe sin pagar.',sin_consentimiento:'Registrá primero la autorización del paciente.',consulta_no_atendida:'Solo se recuerda una consulta atendida con saldo pendiente.',operacion_historica:'El turno ya tiene un precio histórico. Usá un ajuste para modificar su importe.',precio_sin_configurar:'Asigná un servicio antes de registrar el cobro.',turno_no_cobrable:'El turno está cancelado o ausente.',medio_invalido:'Elegí un medio de pago habilitado.',sin_saldo:'La consulta no tiene saldo pendiente.',fecha_futura:'La fecha de pago no puede estar en el futuro.'};
    return {ok:false,mensaje:mensajes[error.message]??'No se pudo guardar la operación. Revisá los datos y volvé a intentar.'};
  }
  refresh();
  return {ok:true,mensaje:'Operación guardada.'};
}
