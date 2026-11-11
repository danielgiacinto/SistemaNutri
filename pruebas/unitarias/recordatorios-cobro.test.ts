import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { despacharRecordatoriosCobro } from '@/servicios/recordatorios-cobro';
import type { ClienteSupabase } from '@/lib/supabase/servidor';
const {enviar}=vi.hoisted(()=>({enviar:vi.fn()}));
vi.mock('nodemailer',()=>({default:{createTransport:()=>({sendMail:enviar})}}));
const id='11111111-1111-4111-8111-111111111111';
let saldo=15000;
let valido=true;
const confirmar=vi.fn<(datos:unknown)=>void>();
const rpc=vi.fn<(nombre:string,datos?:unknown)=>Promise<{data:unknown;error:null}>>();
beforeEach(()=>{
 vi.clearAllMocks();saldo=15000;valido=true;
 vi.stubEnv('CORREO_COMERCIAL_USUARIO','');vi.stubEnv('CORREO_COMERCIAL_CLAVE_APLICACION','');
 for(const nombre of ['HOST','USUARIO','CLAVE','REMITENTE'])vi.stubEnv('CORREO_COBROS_'+nombre,nombre==='REMITENTE'?'consultorio@prueba.test':'prueba');
 enviar.mockResolvedValue({accepted:['paciente@prueba.test'],messageId:'mensaje-prueba'});
 rpc.mockImplementation(async(nombre,datos)=>{
  if(nombre==='reclamar_recordatorios_cobro')return{data:[{id,reclamado_en:'2026-11-05T12:00:00Z'}],error:null};
  if(nombre==='validar_recordatorio_cobro')return{data:valido?{correo:'paciente@prueba.test',paciente:'Ana',consulta:'2026-11-04T12:00:00Z',original:25000,abonado:10000,saldo,moneda:'ARS',nombre_remitente:'Consultorio',texto:'Tu saldo está pendiente.',instrucciones:'Comunicate para coordinar el pago.',zona:'America/Argentina/Buenos_Aires'}:null,error:null};
  if(nombre==='confirmar_recordatorio_cobro')confirmar(datos);
  return{data:null,error:null};
 });
});
afterEach(()=>vi.unstubAllEnvs());
describe('despacho de recordatorios de pacientes',()=>{
 it('comprueba el saldo actualizado antes de enviar sin contenido clínico',async()=>{
  saldo=5000;const resultado=await despacharRecordatoriosCobro({rpc} as unknown as ClienteSupabase);
  expect(resultado.enviados).toBe(1);expect(enviar.mock.calls[0][0].text).toContain('Saldo pendiente:');expect(enviar.mock.calls[0][0].text).toContain('5.000');
  expect(enviar.mock.calls[0][0].html).toContain('5.000');expect(enviar.mock.calls[0][0].html).toContain('En nombre de Consultorio');
  expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({p_resultado:'enviado',p_mensaje:'mensaje-prueba'}));
 });
 it('cancela sin enviar si el pago o la autorización cambiaron',async()=>{
  valido=false;await despacharRecordatoriosCobro({rpc} as unknown as ClienteSupabase);expect(enviar).not.toHaveBeenCalled();expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({p_resultado:'cancelado'}));
 });
 it('marca fallas de conexión para reintentar y timeouts como inciertos',async()=>{
  enviar.mockRejectedValueOnce({code:'ECONNECTION',command:'CONN'});await despacharRecordatoriosCobro({rpc} as unknown as ClienteSupabase);expect(confirmar).toHaveBeenLastCalledWith(expect.objectContaining({p_resultado:'fallido'}));
  enviar.mockRejectedValueOnce({code:'ETIMEDOUT'});await despacharRecordatoriosCobro({rpc} as unknown as ClienteSupabase);expect(confirmar).toHaveBeenLastCalledWith(expect.objectContaining({p_resultado:'incierto'}));
 });
 it('no reclama correos sin credenciales configuradas',async()=>{
  vi.stubEnv('CORREO_COBROS_CLAVE','');expect((await despacharRecordatoriosCobro({rpc} as unknown as ClienteSupabase)).configurado).toBe(false);expect(rpc).not.toHaveBeenCalled();
 });
 it('reutiliza el SMTP comercial existente cuando no se configuró uno específico',async()=>{
  for(const nombre of ['HOST','USUARIO','CLAVE','REMITENTE'])vi.stubEnv('CORREO_COBROS_'+nombre,'');
  vi.stubEnv('CORREO_COMERCIAL_USUARIO','consultorio@prueba.test');vi.stubEnv('CORREO_COMERCIAL_CLAVE_APLICACION','clave-prueba');
  expect((await despacharRecordatoriosCobro({rpc} as unknown as ClienteSupabase)).configurado).toBe(true);
  expect(enviar).toHaveBeenCalledWith(expect.objectContaining({from:{name:'Consultorio',address:'consultorio@prueba.test'}}));
 });
});
