import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { MENSAJE_ERROR_INESPERADO, mensajeDeNegocio, registrarError } from "@/lib/errores";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { ActividadComunidad, Desafio, EstadoDesafio } from "@/tipos/entidades";
import type { DatosActividadValidados, DatosAltaDesafioValidados } from "@/esquemas/comunidad";

const MENSAJES: Record<string, string> = {
  desafio_fechas: "La fecha de fin tiene que ser igual o posterior al inicio.",
  desafio_cerrado: "Ese desafío ya está cerrado.",
  desafio_sin_publicar: "Publicá el desafío antes de cerrarlo.",
  desafio_ya_publicado: "Un desafío publicado no vuelve a borrador.",
  desafio_inexistente: "No encontramos ese desafío.",
  desafio_no_publicado: "Ese desafío no está abierto.",
  sin_ficha: "Solo un paciente del consultorio puede sumarse.",
  participacion_requerida: "Sumate al desafío antes de escribir.",
  duplicado: "Ya estás en este desafío.",
  restriccion: "Revisá el texto: tiene que tener entre 1 y 280 caracteres.",
};

export type ActividadVisible = Pick<ActividadComunidad, "id" | "texto" | "autor_visible" | "creado_en" | "paciente_id">;

export type DesafioConActividad = Desafio & {
  participaciones_desafio: { id: string }[];
  actividades_comunidad: ActividadVisible[];
};

export async function listarDesafios(
  cliente: ClienteSupabase,
  consultorioId?: string,
): Promise<DesafioConActividad[]> {
  let consulta = cliente
    .from("desafios")
    .select("*, participaciones_desafio ( id ), actividades_comunidad ( id, texto, autor_visible, creado_en, paciente_id )")
    .order("inicio", { ascending: false });
  if (consultorioId) consulta = consulta.eq("consultorio_id", consultorioId);

  const { data, error } = await consulta;
  if (error) {
    registrarError("listar_desafios", error);
    throw new Error("No se pudieron cargar los desafíos.");
  }

  const filas = (data ?? []) as DesafioConActividad[];
  return filas.map((fila) => ({
    ...fila,
    actividades_comunidad: [...fila.actividades_comunidad].sort((a, b) => b.creado_en.localeCompare(a.creado_en)),
  }));
}

export async function crearDesafio(
  cliente: ClienteSupabase,
  consultorioId: string,
  datos: DatosAltaDesafioValidados,
): Promise<ResultadoAccion> {
  const { error } = await cliente.from("desafios").insert({
    consultorio_id: consultorioId,
    titulo: datos.titulo,
    consigna: datos.consigna,
    inicio: datos.inicio,
    fin: datos.fin,
  });
  return traducir(error, "crear_desafio", "El desafío quedó en borrador. Publicalo para que lo vean tus pacientes.");
}

export async function cambiarEstadoDesafio(
  cliente: ClienteSupabase,
  consultorioId: string,
  desafioId: string,
  estado: Extract<EstadoDesafio, "publicado" | "cerrado">,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("desafios")
    .update({ estado })
    .eq("id", desafioId)
    .eq("consultorio_id", consultorioId)
    .select("id");

  if (error) return traducir(error, "estado_desafio");
  if (!data?.length) return { ok: false, mensaje: "No encontramos ese desafío." };
  return {
    ok: true,
    mensaje: estado === "publicado" ? "El desafío ya lo pueden ver tus pacientes." : "El desafío quedó cerrado.",
  };
}

export async function eliminarBorrador(
  cliente: ClienteSupabase,
  consultorioId: string,
  desafioId: string,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("desafios")
    .delete()
    .eq("id", desafioId)
    .eq("consultorio_id", consultorioId)
    .eq("estado", "borrador")
    .select("id");

  if (error) return traducir(error, "eliminar_desafio");
  if (!data?.length) return { ok: false, mensaje: "Solo se puede borrar un borrador." };
  return { ok: true, mensaje: "Borrador eliminado." };
}

export async function sumarseADesafio(cliente: ClienteSupabase, desafioId: string): Promise<ResultadoAccion> {
  const { error } = await cliente.from("participaciones_desafio").insert({ desafio_id: desafioId });
  return traducir(error, "sumarse_desafio", "Ya estás en el desafío. Contá cómo te fue.");
}

export async function publicarActividad(
  cliente: ClienteSupabase,
  datos: DatosActividadValidados,
): Promise<ResultadoAccion> {
  const { error } = await cliente.from("actividades_comunidad").insert({
    desafio_id: datos.desafioId,
    texto: datos.texto,
  });
  return traducir(error, "publicar_actividad", "Tu actividad quedó publicada.");
}

export async function borrarActividad(cliente: ClienteSupabase, actividadId: string): Promise<ResultadoAccion> {
  const { data, error } = await cliente.from("actividades_comunidad").delete().eq("id", actividadId).select("id");
  if (error) return traducir(error, "borrar_actividad");
  if (!data?.length) return { ok: false, mensaje: "No se pudo borrar esa actividad." };
  return { ok: true, mensaje: "Actividad borrada." };
}

function traducir(error: { message?: string; code?: string } | null, contexto: string, exito?: string): ResultadoAccion {
  if (!error) return { ok: true, mensaje: exito };
  const mensaje = mensajeDeNegocio(error, MENSAJES);
  if (mensaje) return { ok: false, mensaje };
  registrarError(contexto, error);
  return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
}
