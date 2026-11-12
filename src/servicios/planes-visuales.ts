import "server-only";
import type { ClienteSupabase } from "@/lib/supabase/servidor";
import type { Json } from "@/tipos/base-datos";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { PlantillaPlan, GuardadoPlanVisual } from "@/tipos/plan-visual";
import { mensajeDeNegocio, registrarError } from "@/lib/errores";

const MENSAJES = {
  sin_permiso: "No encontramos ese recurso en tu consultorio.",
  version_desactualizada: "Hay una versión más reciente. Conservá tus cambios en esta pantalla y abrí el plan en otra pestaña para compararlos antes de recargar.",
  documento_invalido: "Revisá los títulos, las comidas y las cantidades del documento.",
  referencia_invalida: "Revisá los recursos de Biblioteca y la variante de cada suplemento.",
  destinatario_invalido: "El destinatario ya no está disponible. Revisá su ficha antes de entregar.",
  plan_vacio: "Agregá una comida, un recurso o una sección de texto antes de entregar.",
};
export async function listarPlantillasPlanes(cliente: ClienteSupabase): Promise<PlantillaPlan[]> {
  const { data, error } = await cliente.rpc("consultar_plantillas_planes");
  // Permite publicar el código antes del esquema sin interrumpir los planes actuales.
  if (error?.code === "PGRST202") return [];
  if (error) { registrarError("listar_plantillas_planes", error); throw new Error("No se pudieron cargar las plantillas."); }
  return data as unknown as PlantillaPlan[];
}
export async function modificarPlantillaPlan(cliente: ClienteSupabase, accion: string, datos: unknown): Promise<ResultadoAccion<PlantillaPlan>> {
  const { data, error } = await cliente.rpc("gestionar_plantilla_plan", { p_accion: accion, p_datos: datos as Json });
  if (error) return fallo("guardar_plantilla_plan", error);
  return { ok: true, datos: data as unknown as PlantillaPlan };
}
export async function persistirPlanVisual(cliente: ClienteSupabase, datos: unknown): Promise<ResultadoAccion<GuardadoPlanVisual>> {
  const { data, error } = await cliente.rpc("guardar_plan_visual", { p_datos: datos as Json });
  if (error) return fallo("guardar_plan_visual", error);
  return { ok: true, datos: data as unknown as GuardadoPlanVisual };
}
export async function asignarPlantillaPlan(cliente: ClienteSupabase, plantillaId: string, pacienteId: string): Promise<ResultadoAccion<{ id: string }>> {
  const { data, error } = await cliente.rpc("crear_plan_desde_plantilla", { p_plantilla_id: plantillaId, p_paciente_id: pacienteId });
  if (error) return fallo("asignar_plantilla_plan", error);
  return { ok: true, datos: { id: data } };
}
function fallo<T>(operacion: string, error: { message: string }): ResultadoAccion<T> {
  const mensaje = mensajeDeNegocio(error, MENSAJES);
  if (!mensaje) registrarError(operacion, error);
  return { ok: false, mensaje: mensaje ?? "No pudimos guardar los cambios. Intentá nuevamente." };
}
