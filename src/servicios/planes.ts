import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { MENSAJE_ERROR_INESPERADO, mensajeDeNegocio, registrarError } from "@/lib/errores";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { ComidaPlan, ComidaPublicada, PlanAlimentario, PublicacionPlan } from "@/tipos/entidades";
import type { DatosAltaPlanValidados, DatosPlanValidados } from "@/esquemas/plan";

const MENSAJES: Record<string, string> = {
  plan_inexistente: "No encontramos ese plan.",
  plan_sin_comidas: "Agregá al menos una comida antes de publicar.",
  comidas_invalidas: "Revisá las comidas: cada una necesita un momento y un detalle.",
  titulo_invalido: "El título tiene que tener entre 1 y 160 caracteres.",
  indicaciones_invalidas: "Las indicaciones son demasiado largas.",
  sin_permiso: "No tenés permiso para modificar este plan.",
  no_autenticado: "Tenés que ingresar para guardar el plan.",
};

export type PlanConPaciente = PlanAlimentario & {
  pacientes: { id: string; nombre: string; apellido: string } | null;
  planes_publicaciones: { numero: number }[];
};

export async function listarPlanesDelConsultorio(
  cliente: ClienteSupabase,
  consultorioId: string,
  pacienteId?: string,
): Promise<PlanConPaciente[]> {
  let consulta = cliente
    .from("planes_alimentarios")
    .select("*, pacientes ( id, nombre, apellido ), planes_publicaciones ( numero )")
    .eq("consultorio_id", consultorioId)
    .order("actualizado_en", { ascending: false });

  if (pacienteId) consulta = consulta.eq("paciente_id", pacienteId);

  const { data, error } = await consulta;

  if (error) {
    registrarError("listar_planes", error);
    throw new Error("No se pudieron cargar los planes.");
  }
  return data as PlanConPaciente[];
}

export async function listarPlanesDelPaciente(
  cliente: ClienteSupabase,
  consultorioId: string,
  pacienteId: string,
): Promise<(PlanAlimentario & { planes_publicaciones: { numero: number }[] })[]> {
  const { data, error } = await cliente
    .from("planes_alimentarios")
    .select("*, planes_publicaciones ( numero )")
    .eq("consultorio_id", consultorioId)
    .eq("paciente_id", pacienteId)
    .order("actualizado_en", { ascending: false });

  if (error) {
    registrarError("listar_planes_paciente", error);
    throw new Error("No se pudieron cargar los planes.");
  }
  return data as (PlanAlimentario & { planes_publicaciones: { numero: number }[] })[];
}

export async function obtenerPlan(
  cliente: ClienteSupabase,
  consultorioId: string,
  planId: string,
): Promise<PlanAlimentario | null> {
  const { data, error } = await cliente
    .from("planes_alimentarios")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    registrarError("obtener_plan", error);
    throw new Error("No se pudo cargar el plan.");
  }
  return data;
}

export async function listarComidas(
  cliente: ClienteSupabase,
  consultorioId: string,
  planId: string,
): Promise<ComidaPlan[]> {
  const { data, error } = await cliente
    .from("planes_comidas")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .eq("plan_id", planId)
    .order("orden");

  if (error) {
    registrarError("listar_comidas", error);
    throw new Error("No se pudieron cargar las comidas.");
  }
  return data;
}

export async function listarPublicaciones(
  cliente: ClienteSupabase,
  consultorioId: string,
  planId: string,
): Promise<PublicacionPlan[]> {
  const { data, error } = await cliente
    .from("planes_publicaciones")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .eq("plan_id", planId)
    .order("numero", { ascending: false });

  if (error) {
    registrarError("listar_publicaciones", error);
    throw new Error("No se pudo cargar el historial del plan.");
  }
  return data;
}

export async function crearPlan(
  cliente: ClienteSupabase,
  consultorioId: string,
  datos: DatosAltaPlanValidados,
): Promise<ResultadoAccion<{ planId: string }>> {
  const { data, error } = await cliente
    .from("planes_alimentarios")
    .insert({
      consultorio_id: consultorioId,
      paciente_id: datos.pacienteId,
      titulo: datos.titulo,
      indicaciones: datos.indicaciones,
    })
    .select("id")
    .single();

  if (error || !data) {
    const mensaje = error ? mensajeDeNegocio(error, MENSAJES) : undefined;
    if (!mensaje && error) registrarError("crear_plan", error);
    return { ok: false, mensaje: mensaje ?? MENSAJE_ERROR_INESPERADO };
  }
  return { ok: true, datos: { planId: data.id } };
}

export async function guardarPlan(
  cliente: ClienteSupabase,
  datos: DatosPlanValidados,
): Promise<ResultadoAccion> {
  const { error } = await cliente.rpc("guardar_plan", {
    p_plan_id: datos.planId,
    p_titulo: datos.titulo,
    p_indicaciones: datos.indicaciones,
    p_comidas: datos.comidas.map((comida) => ({ momento: comida.momento, detalle: comida.detalle })),
  });
  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES);
    if (!mensaje) registrarError("guardar_plan", error);
    return { ok: false, mensaje: mensaje ?? MENSAJE_ERROR_INESPERADO };
  }

  if (!datos.publicar) return { ok: true, mensaje: "Borrador guardado. El paciente sigue viendo la última versión publicada." };

  const publicado = await cliente.rpc("publicar_plan", { p_plan_id: datos.planId });
  if (publicado.error) {
    const mensaje = mensajeDeNegocio(publicado.error, MENSAJES);
    if (!mensaje) registrarError("publicar_plan", publicado.error);
    return { ok: false, mensaje: mensaje ?? MENSAJE_ERROR_INESPERADO };
  }
  return { ok: true, mensaje: `Publicamos la versión ${publicado.data}. El paciente ya puede verla.` };
}

export async function eliminarPlanSinPublicar(
  cliente: ClienteSupabase,
  consultorioId: string,
  planId: string,
): Promise<ResultadoAccion> {
  const { error, count } = await cliente
    .from("planes_alimentarios")
    .delete({ count: "exact" })
    .eq("consultorio_id", consultorioId)
    .eq("id", planId);

  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES);
    if (!mensaje) registrarError("eliminar_plan", error);
    return { ok: false, mensaje: mensaje ?? "No se puede borrar un plan que ya se publicó." };
  }
  if (!count) return { ok: false, mensaje: "No se puede borrar un plan que ya se publicó." };
  return { ok: true, mensaje: "Plan eliminado." };
}

export type PlanPublicado = PublicacionPlan & { comidas: ComidaPublicada[] };

/** La última publicación de cada plan que la sesión puede ver. */
export async function listarPlanesPublicados(cliente: ClienteSupabase): Promise<PlanPublicado[]> {
  const { data, error } = await cliente
    .from("planes_publicaciones")
    .select("*, planes_publicaciones_comidas ( * )")
    .order("numero", { ascending: false });

  if (error) {
    registrarError("listar_planes_publicados", error);
    throw new Error("No se pudieron cargar los planes.");
  }

  const vistos = new Set<string>();
  const actuales: PlanPublicado[] = [];
  for (const fila of data) {
    if (vistos.has(fila.plan_id)) continue;
    vistos.add(fila.plan_id);
    const comidas = [...(fila.planes_publicaciones_comidas ?? [])].sort((a, b) => a.orden - b.orden);
    actuales.push({ ...fila, comidas });
  }
  return actuales;
}
