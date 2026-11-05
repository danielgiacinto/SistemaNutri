import 'server-only';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import type { ClienteSupabase } from '@/lib/supabase/servidor';
import { dineroFinanzas } from '@/tipos/finanzas';

const esquemaAviso=z.object({correo:z.email(),paciente:z.string(),consulta:z.string(),original:z.number(),abonado:z.number(),saldo:z.number().positive(),moneda:z.string(),nombre_remitente:z.string(),instrucciones:z.string(),texto:z.string(),zona:z.string()});
export async function despacharRecordatoriosCobro(cliente:ClienteSupabase) {
  const personalizado=[process.env.CORREO_COBROS_HOST,process.env.CORREO_COBROS_USUARIO,process.env.CORREO_COBROS_CLAVE,process.env.CORREO_COBROS_REMITENTE].some(v=>v?.trim());
  const host=personalizado?process.env.CORREO_COBROS_HOST?.trim():'smtp.gmail.com';
  const usuario=(personalizado?process.env.CORREO_COBROS_USUARIO:process.env.CORREO_COMERCIAL_USUARIO)?.trim();
  const clave=(personalizado?process.env.CORREO_COBROS_CLAVE:process.env.CORREO_COMERCIAL_CLAVE_APLICACION)?.replace(/\s/g,'');
  const remitente=personalizado?process.env.CORREO_COBROS_REMITENTE?.trim():usuario;
  if(!host||!usuario||!clave||!remitente) return {configurado:false,enviados:0,fallidos:0};
  const transporte=nodemailer.createTransport({host,port:Number(process.env.CORREO_COBROS_PUERTO??465),secure:process.env.CORREO_COBROS_TLS!=='false',requireTLS:process.env.CORREO_COBROS_TLS==='false',auth:{user:usuario,pass:clave},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
  const {error:preparacion}=await cliente.rpc('preparar_recordatorios_cobro');if(preparacion)throw preparacion;
  const {data,error}=await cliente.rpc('reclamar_recordatorios_cobro');if(error)throw error;
  const reclamos=z.array(z.object({id:z.uuid(),reclamado_en:z.string()})).parse(data);
  let enviados=0;let fallidos=0;
  for(const reclamo of reclamos) {
    let resultado='incierto';let mensaje='';
    try {
      const validacion=await cliente.rpc('validar_recordatorio_cobro',{p_id:reclamo.id});if(validacion.error)throw validacion.error;
      const aviso=esquemaAviso.safeParse(validacion.data);
      if(!aviso.success)resultado='cancelado';
      else {
        const a=aviso.data;const dinero=(n:number)=>dineroFinanzas(n,a.moneda);
        const envio=await transporte.sendMail({from:{name:a.nombre_remitente,address:remitente},to:a.correo,subject:`Recordatorio de pago pendiente — ${a.nombre_remitente}`,messageId:`<cobro-${reclamo.id}@${remitente.split('@')[1]}>`,text:`Hola, ${a.paciente}:\n\n${a.texto}\n\nConsulta: ${new Intl.DateTimeFormat('es-AR',{dateStyle:'long',timeZone:a.zona}).format(new Date(a.consulta))}\nImporte original: ${dinero(a.original)}\nTotal abonado: ${dinero(a.abonado)}\nSaldo pendiente: ${dinero(a.saldo)}\n\n${a.instrucciones}\n\nSi ya realizaste el pago, comunicate con el consultorio para confirmar su registro.\n\n${a.nombre_remitente}`});
        if(!envio.accepted.includes(a.correo))throw new Error('rechazo');
        resultado='enviado';mensaje=envio.messageId;enviados++;
      }
    } catch(error) {
      const codigo=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';
      // Solo se reintentan fallas previas a la conexión. Un timeout SMTP puede
      // haber ocurrido después de la entrega: se conserva para revisión manual.
      const comando=typeof error==='object'&&error!==null&&'command' in error?String(error.command):'';
      resultado=(['EDNS','ECONNREFUSED'].includes(codigo)||(codigo==='ECONNECTION'&&comando==='CONN'))?'fallido':'incierto';fallidos++;
    }
    const confirmacion=await cliente.rpc('confirmar_recordatorio_cobro',{p_id:reclamo.id,p_reclamado:reclamo.reclamado_en,p_resultado:resultado,p_mensaje:mensaje});
    if(confirmacion.error)throw confirmacion.error;
  }
  return {configurado:true,enviados,fallidos};
}
