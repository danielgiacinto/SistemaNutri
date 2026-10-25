import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { registrarError, MENSAJE_ERROR_INESPERADO } from "@/lib/errores";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { PreferenciasApariencia } from "@/esquemas/perfil";

async function actualizarPerfilPropio(
  cliente: ClienteSupabase,
  usuarioId: string,
  cambios: { nombre?: string; apellido?: string; tema?: PreferenciasApariencia["tema"]; paleta?: string },
  contexto: string,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente.from("perfiles").update(cambios).eq("id", usuarioId).select("id");

  if (error) {
    registrarError(contexto, error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) {
    return { ok: false, mensaje: "No se encontró tu perfil. Volvé a ingresar." };
  }
  return { ok: true };
}

export function actualizarDatosPerfil(
  cliente: ClienteSupabase,
  usuarioId: string,
  datos: { nombre: string; apellido: string },
): Promise<ResultadoAccion> {
  return actualizarPerfilPropio(cliente, usuarioId, datos, "actualizar_perfil");
}

export function actualizarPreferencias(
  cliente: ClienteSupabase,
  usuarioId: string,
  preferencias: Partial<PreferenciasApariencia>,
): Promise<ResultadoAccion> {
  if (Object.keys(preferencias).length === 0) return Promise.resolve({ ok: true });
  return actualizarPerfilPropio(cliente, usuarioId, preferencias, "actualizar_preferencias");
}
