import 'server-only';
import type { ClienteSupabase } from '@/lib/supabase/servidor';
import type { DatosFinanzas, OperacionConsultorio, ServicioConsultorio } from '@/tipos/finanzas';
import { registrarError } from '@/lib/errores';

export async function consultarFinanzas(cliente: ClienteSupabase, filtros: {p_turno?:string;p_paciente?:string} = {}): Promise<DatosFinanzas> {
  const { data, error } = await cliente.rpc('consultar_finanzas', filtros);
  if (error) {
    registrarError('consultar_finanzas', error);
    throw new Error('No se pudieron cargar las finanzas.');
  }
  return data as unknown as DatosFinanzas;
}

export async function consultarEconomiaTurnos(cliente: ClienteSupabase, turnos: string[]): Promise<OperacionConsultorio[]> {
  if (!turnos.length) return [];
  const {data,error}=await cliente.rpc('consultar_economia_turnos',{p_turnos:turnos});
  if(error) {
    registrarError('consultar_economia_turnos', error);
    throw new Error('No se pudieron cargar los estados económicos.');
  }
  return data as unknown as OperacionConsultorio[];
}

export async function listarServicios(cliente: ClienteSupabase): Promise<ServicioConsultorio[]> {
  const { data, error } = await cliente.from('servicios_consultorio').select('id,nombre,descripcion,precio,moneda,duracion_minutos,activo').order('nombre');
  if (error) {
    registrarError('listar_servicios', error);
    throw new Error('No se pudieron cargar los servicios.');
  }
  return data;
}

export async function listarServiciosActivos(cliente: ClienteSupabase) {
  const {data,error}=await cliente.from('servicios_consultorio').select('id,nombre,precio,moneda,duracion_minutos').eq('activo',true).order('nombre');
  if(error) {
    registrarError('listar_servicios_activos', error);
    throw new Error('No se pudieron cargar los servicios.');
  }
  return data;
}
