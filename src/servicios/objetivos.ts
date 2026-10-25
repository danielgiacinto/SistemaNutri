import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { MENSAJE_ERROR_INESPERADO, mensajeDeNegocio, registrarError } from "@/lib/errores";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { Objetivo } from "@/tipos/entidades";
import type { DatosAltaObjetivoValidados, DatosEdicionObjetivoValidados } from "@/esquemas/objetivo";

function camposObjetivo(datos: DatosAltaObjetivoValidados) {
  return {
    titulo: datos.titulo,
    descripcion: datos.descripcion,
    categoria: datos.categoria,
    fecha_objetivo: datos.fechaObjetivo,
    estado: datos.estado,
    progreso: datos.progreso,
    valor_inicial: datos.valorInicial,
    valor_objetivo: datos.valorObjetivo,
    unidad: datos.unidad,
    observaciones: datos.observaciones,
    visible_para_paciente: datos.visibleParaPaciente,
  };
}

export async function listarObjetivos(
  cliente: ClienteSupabase,
  consultorioId: string,
  pacienteId: string,
): Promise<Objetivo[]> {
  const { data, error } = await cliente
    .from("objetivos")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .eq("paciente_id", pacienteId)
    .order("creado_en", { ascending: false });

  if (error) {
    registrarError("listar_objetivos", error);
    throw new Error("No se pudieron cargar los objetivos.");
  }
  return data;
}

export async function listarObjetivosActivos(
  cliente: ClienteSupabase,
  consultorioId: string,
  pacienteId: string,
): Promise<Objetivo[]> {
  const { data, error } = await cliente
    .from("objetivos")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .eq("paciente_id", pacienteId)
    .in("estado", ["pendiente", "en_progreso"])
    .order("creado_en", { ascending: false });

  if (error) {
    registrarError("listar_objetivos_activos", error);
    throw new Error("No se pudieron cargar los objetivos.");
  }
  return data;
}

export async function crearObjetivo(
  cliente: ClienteSupabase,
  consultorioId: string,
  datos: DatosAltaObjetivoValidados,
): Promise<ResultadoAccion<{ objetivoId: string }>> {
  const { data, error } = await cliente
    .from("objetivos")
    .insert({ consultorio_id: consultorioId, paciente_id: datos.pacienteId, ...camposObjetivo(datos) })
    .select("id")
    .maybeSingle();

  if (error) {
    const mensaje = mensajeDeNegocio(error, { restriccion: "Revisá los datos del objetivo." });
    if (mensaje) return { ok: false, mensaje };
    registrarError("crear_objetivo", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data) return { ok: false, mensaje: "No tenés permiso para crear objetivos en este consultorio." };
  return { ok: true, datos: { objetivoId: data.id }, mensaje: "Objetivo registrado." };
}

export async function actualizarObjetivo(
  cliente: ClienteSupabase,
  consultorioId: string,
  datos: DatosEdicionObjetivoValidados,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("objetivos")
    .update(camposObjetivo(datos))
    .eq("id", datos.objetivoId)
    .eq("consultorio_id", consultorioId)
    .eq("paciente_id", datos.pacienteId)
    .select("id");

  if (error) {
    const mensaje = mensajeDeNegocio(error, { restriccion: "Revisá los datos del objetivo." });
    if (mensaje) return { ok: false, mensaje };
    registrarError("actualizar_objetivo", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) return { ok: false, mensaje: "No se encontró el objetivo." };
  return { ok: true, mensaje: "Objetivo actualizado." };
}
