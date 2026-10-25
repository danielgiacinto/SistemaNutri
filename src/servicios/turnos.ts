import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { MENSAJE_ERROR_INESPERADO, mensajeDeNegocio, registrarError } from "@/lib/errores";
import { agregarMinutos, instanteDesdeLocal, isoDesdeDate } from "@/lib/fechas";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { Paciente, Turno } from "@/tipos/entidades";
import type { DatosAltaTurnoValidados, DatosEdicionTurnoValidados } from "@/esquemas/turno";

export const MENSAJES_TURNO: Record<string, string> = {
  turno_solapado: "Ya hay un turno en ese horario para este consultorio.",
  turno_fuera_de_horario: "Ese horario está fuera de tu atención. Revisá la disponibilidad.",
  turno_en_bloqueo: "Ese horario está bloqueado en la agenda.",
  paciente_inactivo: "No se pueden agendar turnos a un paciente inactivo.",
  paciente_ajeno: "El paciente no pertenece a este consultorio.",
  turno_cruza_dia: "El turno no puede cruzar la medianoche.",
  turno_ajeno: "El turno no corresponde a este paciente.",
  sin_permiso: "No tenés permiso para modificar este turno.",
  duplicado: "Ya hay un turno en ese horario para este consultorio.",
};

export type TurnoConPaciente = Turno & {
  pacientes: Pick<Paciente, "id" | "nombre" | "apellido" | "documento" | "telefono"> | null;
};

function rangoDesdeFormulario(datos: DatosAltaTurnoValidados, zonaHoraria: string) {
  const inicio = instanteDesdeLocal(datos.fecha, datos.hora, zonaHoraria);
  const fin = agregarMinutos(inicio, datos.duracionMinutos);
  return { inicio: isoDesdeDate(inicio), fin: isoDesdeDate(fin) };
}

export async function listarTurnosEnRango(
  cliente: ClienteSupabase,
  consultorioId: string,
  desde: Date,
  hasta: Date,
): Promise<TurnoConPaciente[]> {
  const { data, error } = await cliente
    .from("turnos")
    .select("*, pacientes ( id, nombre, apellido, documento, telefono )")
    .eq("consultorio_id", consultorioId)
    .gte("inicio", desde.toISOString())
    .lt("inicio", hasta.toISOString())
    .order("inicio");

  if (error) {
    registrarError("listar_turnos", error);
    throw new Error("No se pudo cargar la agenda.");
  }
  return (data ?? []) as TurnoConPaciente[];
}

export async function obtenerTurno(
  cliente: ClienteSupabase,
  consultorioId: string,
  turnoId: string,
): Promise<TurnoConPaciente | null> {
  const { data, error } = await cliente
    .from("turnos")
    .select("*, pacientes ( id, nombre, apellido, documento, telefono )")
    .eq("consultorio_id", consultorioId)
    .eq("id", turnoId)
    .maybeSingle();

  if (error) {
    registrarError("obtener_turno", error);
    throw new Error("No se pudo cargar el turno.");
  }
  return data as TurnoConPaciente | null;
}

export async function listarTurnosDelPaciente(
  cliente: ClienteSupabase,
  consultorioId: string,
  pacienteId: string,
): Promise<Turno[]> {
  const { data, error } = await cliente
    .from("turnos")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .eq("paciente_id", pacienteId)
    .order("inicio", { ascending: false })
    .limit(50);

  if (error) {
    registrarError("listar_turnos_paciente", error);
    throw new Error("No se pudieron cargar los turnos del paciente.");
  }
  return data;
}

export async function crearTurno(
  cliente: ClienteSupabase,
  consultorioId: string,
  zonaHoraria: string,
  datos: DatosAltaTurnoValidados,
): Promise<ResultadoAccion<{ turnoId: string }>> {
  const rango = rangoDesdeFormulario(datos, zonaHoraria);
  const { data, error } = await cliente
    .from("turnos")
    .insert({
      consultorio_id: consultorioId,
      paciente_id: datos.pacienteId,
      inicio: rango.inicio,
      fin: rango.fin,
      tipo: datos.tipo,
      motivo: datos.motivo,
      notas_administrativas: datos.notasAdministrativas,
      estado: "programado",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES_TURNO);
    if (mensaje) return { ok: false, mensaje };
    registrarError("crear_turno", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data) return { ok: false, mensaje: MENSAJES_TURNO.sin_permiso };
  return { ok: true, datos: { turnoId: data.id }, mensaje: "Turno agendado." };
}

export async function actualizarTurno(
  cliente: ClienteSupabase,
  consultorioId: string,
  zonaHoraria: string,
  datos: DatosEdicionTurnoValidados,
): Promise<ResultadoAccion> {
  const rango = rangoDesdeFormulario(datos, zonaHoraria);
  const esCancelado = datos.estado === "cancelado";
  const { data, error } = await cliente
    .from("turnos")
    .update({
      paciente_id: datos.pacienteId,
      inicio: rango.inicio,
      fin: rango.fin,
      tipo: datos.tipo,
      motivo: datos.motivo,
      notas_administrativas: datos.notasAdministrativas,
      estado: datos.estado,
      cancelado_en: esCancelado ? new Date().toISOString() : null,
      motivo_cancelacion: esCancelado ? datos.motivo : null,
    })
    .eq("id", datos.turnoId)
    .eq("consultorio_id", consultorioId)
    .select("id");

  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES_TURNO);
    if (mensaje) return { ok: false, mensaje };
    registrarError("actualizar_turno", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) return { ok: false, mensaje: MENSAJES_TURNO.sin_permiso };
  return { ok: true, mensaje: "Turno actualizado." };
}

export async function cancelarTurno(
  cliente: ClienteSupabase,
  consultorioId: string,
  turnoId: string,
  motivoCancelacion: string | null,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("turnos")
    .update({
      estado: "cancelado",
      cancelado_en: new Date().toISOString(),
      motivo_cancelacion: motivoCancelacion,
    })
    .eq("id", turnoId)
    .eq("consultorio_id", consultorioId)
    .select("id");

  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES_TURNO);
    if (mensaje) return { ok: false, mensaje };
    registrarError("cancelar_turno", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) return { ok: false, mensaje: MENSAJES_TURNO.sin_permiso };
  return { ok: true, mensaje: "Turno cancelado." };
}

export async function actualizarEstadoTurno(
  cliente: ClienteSupabase,
  consultorioId: string,
  turnoId: string,
  estado: Exclude<Turno["estado"], "cancelado">,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("turnos")
    .update({ estado, cancelado_en: null, motivo_cancelacion: null })
    .eq("id", turnoId)
    .eq("consultorio_id", consultorioId)
    .select("id");

  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES_TURNO);
    if (mensaje) return { ok: false, mensaje };
    registrarError("actualizar_estado_turno", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) return { ok: false, mensaje: MENSAJES_TURNO.sin_permiso };
  return { ok: true, mensaje: "Estado del turno actualizado." };
}

export async function obtenerProximoTurno(
  cliente: ClienteSupabase,
  consultorioId: string,
): Promise<TurnoConPaciente | null> {
  const { data, error } = await cliente
    .from("turnos")
    .select("*, pacientes ( id, nombre, apellido, documento, telefono )")
    .eq("consultorio_id", consultorioId)
    .in("estado", ["programado", "confirmado"])
    .gte("inicio", new Date().toISOString())
    .order("inicio")
    .limit(1)
    .maybeSingle();

  if (error) {
    registrarError("proximo_turno", error);
    throw new Error("No se pudo cargar el próximo turno.");
  }
  return data as TurnoConPaciente | null;
}

export async function obtenerTurnoEnCurso(
  cliente: ClienteSupabase,
  consultorioId: string,
): Promise<TurnoConPaciente | null> {
  const ahora = new Date().toISOString();
  const { data, error } = await cliente
    .from("turnos")
    .select("*, pacientes ( id, nombre, apellido, documento, telefono )")
    .eq("consultorio_id", consultorioId)
    .in("estado", ["programado", "confirmado"])
    .lte("inicio", ahora)
    .gt("fin", ahora)
    .order("inicio")
    .limit(1)
    .maybeSingle();

  if (error) {
    registrarError("turno_en_curso", error);
    throw new Error("No se pudo cargar el turno en curso.");
  }
  return data as TurnoConPaciente | null;
}
