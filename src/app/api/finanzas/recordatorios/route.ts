import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { crearClienteServicio } from '@/lib/supabase/servicio';
import { despacharRecordatoriosCobro } from '@/servicios/recordatorios-cobro';
export const maxDuration=300;
export async function GET(peticion:NextRequest) {
  const secreto=process.env.CRON_SECRET?.trim();const recibido=Buffer.from(peticion.headers.get('authorization')??'');const esperado=Buffer.from(`Bearer ${secreto??''}`);
  if(!secreto||recibido.length!==esperado.length||!timingSafeEqual(recibido,esperado))return Response.json({error:'sin_autorizacion'},{status:401});
  const cliente=crearClienteServicio();if(!cliente)return Response.json({error:'integracion_incompleta'},{status:503});
  try {const resultado=await despacharRecordatoriosCobro(cliente);return Response.json(resultado,{status:!resultado.configurado||resultado.fallidos?503:200});}
  catch {return Response.json({error:'envio_pendiente'},{status:503});}
}
