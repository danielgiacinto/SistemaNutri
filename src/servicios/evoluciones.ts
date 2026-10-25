import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { MENSAJE_ERROR_INESPERADO, mensajeDeNegocio, registrarError } from "@/lib/errores";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { Evolucion, Fila } from "@/tipos/entidades";
import type { DatosAltaEvolucionValidados, DatosEdicionEvolucionValidados } from "@/esquemas/evolucion";

type VersionEvolucion = Fila<"evoluciones_versiones">;

const MENSAJES: Record<string, string> = {
  turno_ajeno: "El turno no corresponde a este paciente.",
  restriccion: "Una nota en borrador no se puede compartir con el paciente.",
  "23514": "Una nota en borrador no se puede compartir con el paciente.",
  sin_permiso: "No tenés permiso para modificar esta evolución.",
};

function camposEvolucion(datos: DatosAltaEvolucionValidados) {
  return {
    turno_id: datos.turnoId,
    titulo: datos.titulo,
    contenido: datos.contenido,
    observaciones: datos.observaciones,
    indicaciones: datos.indicaciones,
    es_borrador: datos.esBorrador,
    visible_para_paciente: datos.visibleParaPaciente,
  };
}

export async function listarEvoluciones(
  cliente: ClienteSupabase,
  consultorioId: string,
  pacienteId: string,
): Promise<Evolucion[]> {
  const { data, error } = await cliente
    .from("evoluciones")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .eq("paciente_id", pacienteId)
    .order("creado_en", { ascending: false });

  if (error) {
    registrarError("listar_evoluciones", error);
    throw new Error("No se pudieron cargar las evoluciones.");
  }
  return data;
}

export async function listarEvolucionesRecientes(
  cliente: ClienteSupabase,
  consultorioId: string,
  limite = 8,
): Promise<(Evolucion & { pacientes: { id: string; nombre: string; apellido: string } | null })[]> {
  const { data, error } = await cliente
    .from("evoluciones")
    .select("*, pacientes ( id, nombre, apellido )")
    .eq("consultorio_id", consultorioId)
    .eq("es_borrador", false)
    .order("actualizado_en", { ascending: false })
    .limit(limite);

  if (error) {
    registrarError("evoluciones_recientes", error);
    throw new Error("No se pudieron cargar las evoluciones recientes.");
  }
  return data as (Evolucion & { pacientes: { id: string; nombre: string; apellido: string } | null })[];
}

export async function obtenerEvolucion(
  cliente: ClienteSupabase,
  consultorioId: string,
  evolucionId: string,
): Promise<Evolucion | null> {
  const { data, error } = await cliente
    .from("evoluciones")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .eq("id", evolucionId)
    .maybeSingle();

  if (error) {
    registrarError("obtener_evolucion", error);
    throw new Error("No se pudo cargar la evolución.");
  }
  return data;
}

export async function listarVersionesEvolucion(
  cliente: ClienteSupabase,
  consultorioId: string,
  evolucionId: string,
): Promise<VersionEvolucion[]> {
  const { data, error } = await cliente
    .from("evoluciones_versiones")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .eq("evolucion_id", evolucionId)
    .order("creado_en", { ascending: false });

  if (error) {
    registrarError("listar_versiones_evolucion", error);
    throw new Error("No se pudo cargar el historial de la evolución.");
  }
  return data;
}

export async function crearEvolucion(
  cliente: ClienteSupabase,
  consultorioId: string,
  datos: DatosAltaEvolucionValidados,
): Promise<ResultadoAccion<{ evolucionId: string }>> {
  const { data, error } = await cliente
    .from("evoluciones")
    .insert({ consultorio_id: consultorioId, paciente_id: datos.pacienteId, ...camposEvolucion(datos) })
    .select("id")
    .maybeSingle();

  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES);
    if (mensaje) return { ok: false, mensaje };
    registrarError("crear_evolucion", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data) return { ok: false, mensaje: MENSAJES.sin_permiso };
  return {
    ok: true,
    datos: { evolucionId: data.id },
    mensaje: datos.esBorrador ? "Borrador guardado." : "Evolución publicada.",
  };
}

export async function actualizarEvolucion(
  cliente: ClienteSupabase,
  consultorioId: string,
  datos: DatosEdicionEvolucionValidados,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("evoluciones")
    .update(camposEvolucion(datos))
    .eq("id", datos.evolucionId)
    .eq("consultorio_id", consultorioId)
    .eq("paciente_id", datos.pacienteId)
    .select("id");

  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES);
    if (mensaje) return { ok: false, mensaje };
    registrarError("actualizar_evolucion", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) return { ok: false, mensaje: MENSAJES.sin_permiso };
  return { ok: true, mensaje: datos.esBorrador ? "Borrador actualizado." : "Evolución actualizada." };
}

export async function eliminarBorradorEvolucion(
  cliente: ClienteSupabase,
  consultorioId: string,
  evolucionId: string,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("evoluciones")
    .delete()
    .eq("id", evolucionId)
    .eq("consultorio_id", consultorioId)
    .eq("es_borrador", true)
    .select("id");

  if (error) {
    registrarError("eliminar_borrador", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) {
    return { ok: false, mensaje: "Solo se pueden eliminar borradores propios." };
  }
  return { ok: true, mensaje: "Borrador eliminado." };
}
