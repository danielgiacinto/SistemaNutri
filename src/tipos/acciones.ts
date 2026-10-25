/**
 * Respuesta estándar de las Server Actions. Nunca incluye detalles internos
 * del error: solo mensajes aptos para mostrar al usuario.
 */
export type ResultadoAccion<T = undefined> =
  | { ok: true; mensaje?: string; datos?: T }
  | { ok: false; mensaje: string; erroresCampos?: Record<string, string[] | undefined> };
