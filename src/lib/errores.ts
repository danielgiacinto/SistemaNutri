/**
 * Registro de errores del servidor. Solo guarda el código y el mensaje técnico:
 * nunca los datos enviados por el usuario ni el detalle de PostgreSQL, que
 * pueden contener información personal o clínica.
 */
export function registrarError(contexto: string, error: unknown): void {
  const codigo =
    typeof error === "object" && error !== null && "code" in error && error.code != null ? String(error.code) : undefined;
  const mensaje =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "Error desconocido";

  console.error(`[${contexto}]`, { codigo, mensaje });
}

export const MENSAJE_ERROR_INESPERADO = "Ocurrió un error inesperado. Intentá nuevamente en unos minutos.";

type ErrorSupabase = { message?: string; code?: string };

/** Traduce errores de negocio (`RAISE EXCEPTION 'clave'`) y restricciones conocidas. */
export function mensajeDeNegocio(error: ErrorSupabase, mensajes: Record<string, string>): string | undefined {
  if (error.code === "23505") {
    return mensajes.duplicado ?? mensajes["23505"];
  }
  if (error.code === "23514") {
    return mensajes.restriccion ?? mensajes["23514"];
  }
  if (error.message && mensajes[error.message]) return mensajes[error.message];
  if (error.message?.includes("row-level security")) {
    return mensajes.sin_permiso ?? "No tenés permiso para realizar esta acción.";
  }
  return undefined;
}
