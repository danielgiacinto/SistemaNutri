import "server-only";
import type { ClienteSupabase } from "@/lib/supabase/servidor";
import type { DetalleBiblioteca, FiltroBiblioteca, ListadoBiblioteca } from "@/tipos/biblioteca";
import type { Json } from "@/tipos/base-datos";
import { mensajeDeNegocio, registrarError } from "@/lib/errores";
import type { ResultadoAccion } from "@/tipos/acciones";
import { resumirRecursoBiblioteca } from "@/lib/composicion-biblioteca";

const MENSAJES = {
  sin_permiso: "No tenés permiso para acceder a este recurso.",
  version_desactualizada: "Otra persona modificó este recurso. Cerrá y volvé a abrirlo para cargar la última versión.",
  recurso_archivado: "Restaurá el recurso antes de editarlo.",
  referencia_invalida: "Elegí ingredientes o grupos activos de tu consultorio. Las preparaciones solo admiten alimentos.",
  fuente_invalida: "Elegí una fuente activa de tu consultorio.",
  fraccion_invalida: "Las partes deben sumar 100%.",
  composicion_vacia: "Agregá al menos un ingrediente o grupo.",
  datos_invalidos: "Revisá los datos y las cantidades del recurso.",
};
export async function listarBiblioteca(cliente: ClienteSupabase, filtros: FiltroBiblioteca): Promise<ListadoBiblioteca> {
  const { data, error } = await cliente.rpc("consultar_biblioteca", { p_filtros: filtros as unknown as Json });
  if (error) { registrarError("listar_biblioteca", error); throw new Error("No se pudo cargar la biblioteca."); }
  const listado = data as unknown as ListadoBiblioteca;
  return { ...listado, recursos: listado.recursos.map(recurso => {
    const resumen = resumirRecursoBiblioteca(recurso);
    // El aporte por ingrediente se usa solo en el detalle.
    return resumen.calculo ? { ...resumen, calculo: { ...resumen.calculo, ingredientes: [] } } : resumen;
  }) };
}
export async function obtenerRecursoBiblioteca(cliente: ClienteSupabase, id: string, version?: number): Promise<DetalleBiblioteca | null> {
  const { data, error } = await cliente.rpc("obtener_recurso_biblioteca", { p_id: id, ...(version ? { p_version: version } : {}) });
  if (error) { registrarError("recurso_biblioteca", error); throw new Error("No se pudo cargar el recurso."); }
  const detalle = data as unknown as DetalleBiblioteca | null;
  return detalle ? { ...detalle, recurso: resumirRecursoBiblioteca(detalle.recurso, detalle.relaciones) } : null;
}
export async function modificarBiblioteca(cliente: ClienteSupabase, accion: string, datos: Json): Promise<ResultadoAccion<{ id: string }>> {
  const { data, error } = await cliente.rpc("gestionar_biblioteca", { p_accion: accion, p_datos: datos });
  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES);
    if (!mensaje) registrarError("guardar_biblioteca", error);
    return { ok: false, mensaje: mensaje ?? "No pudimos guardar el recurso. Intentá nuevamente." };
  }
  return { ok: true, datos: { id: data } };
}
