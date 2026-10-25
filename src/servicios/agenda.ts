import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { MENSAJE_ERROR_INESPERADO, mensajeDeNegocio, registrarError } from "@/lib/errores";
import { instanteDesdeLocal, isoDesdeDate } from "@/lib/fechas";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { BloqueoAgenda, HorarioAtencion } from "@/tipos/entidades";
import type { DatosBloqueoAgenda, DatosHorarioAtencionValidados } from "@/esquemas/agenda";

export async function listarHorarios(
  cliente: ClienteSupabase,
  consultorioId: string,
): Promise<HorarioAtencion[]> {
  const { data, error } = await cliente
    .from("horarios_atencion")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .order("dia_semana")
    .order("hora_inicio");

  if (error) {
    registrarError("listar_horarios", error);
    throw new Error("No se pudieron cargar los horarios de atención.");
  }
  return data;
}

export async function crearHorario(
  cliente: ClienteSupabase,
  consultorioId: string,
  datos: DatosHorarioAtencionValidados,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("horarios_atencion")
    .insert({
      consultorio_id: consultorioId,
      dia_semana: datos.diaSemana,
      hora_inicio: datos.horaInicio,
      hora_fin: datos.horaFin,
    })
    .select("id");

  if (error) {
    const mensaje = mensajeDeNegocio(error, {
      duplicado: "Ya existe un horario que empieza a esa hora en ese día.",
      "23505": "Ya existe un horario que empieza a esa hora en ese día.",
      restriccion: "La hora de fin debe ser posterior a la de inicio.",
    });
    if (mensaje) return { ok: false, mensaje };
    registrarError("crear_horario", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) return { ok: false, mensaje: "No tenés permiso para modificar la disponibilidad." };
  return { ok: true, mensaje: "Horario de atención agregado." };
}

export async function eliminarHorario(
  cliente: ClienteSupabase,
  consultorioId: string,
  horarioId: string,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("horarios_atencion")
    .delete()
    .eq("id", horarioId)
    .eq("consultorio_id", consultorioId)
    .select("id");

  if (error) {
    registrarError("eliminar_horario", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) return { ok: false, mensaje: "No se encontró el horario." };
  return { ok: true, mensaje: "Horario eliminado." };
}

export async function listarBloqueos(
  cliente: ClienteSupabase,
  consultorioId: string,
  desde: Date,
): Promise<BloqueoAgenda[]> {
  const { data, error } = await cliente
    .from("bloqueos_agenda")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .gte("fin", desde.toISOString())
    .order("inicio");

  if (error) {
    registrarError("listar_bloqueos", error);
    throw new Error("No se pudieron cargar los bloqueos de agenda.");
  }
  return data;
}

export async function crearBloqueo(
  cliente: ClienteSupabase,
  consultorioId: string,
  zonaHoraria: string,
  datos: DatosBloqueoAgenda,
): Promise<ResultadoAccion> {
  const inicio = instanteDesdeLocal(datos.fecha, datos.horaInicio, zonaHoraria);
  const fin = instanteDesdeLocal(datos.fecha, datos.horaFin, zonaHoraria);
  const { data, error } = await cliente
    .from("bloqueos_agenda")
    .insert({
      consultorio_id: consultorioId,
      inicio: isoDesdeDate(inicio),
      fin: isoDesdeDate(fin),
      motivo: datos.motivo,
    })
    .select("id");

  if (error) {
    registrarError("crear_bloqueo", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) return { ok: false, mensaje: "No tenés permiso para bloquear la agenda." };
  return { ok: true, mensaje: "Bloqueo de agenda creado." };
}

export async function eliminarBloqueo(
  cliente: ClienteSupabase,
  consultorioId: string,
  bloqueoId: string,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("bloqueos_agenda")
    .delete()
    .eq("id", bloqueoId)
    .eq("consultorio_id", consultorioId)
    .select("id");

  if (error) {
    registrarError("eliminar_bloqueo", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) return { ok: false, mensaje: "No se encontró el bloqueo." };
  return { ok: true, mensaje: "Bloqueo eliminado." };
}
