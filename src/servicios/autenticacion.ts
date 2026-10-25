import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { registrarError } from "@/lib/errores";
import type { ResultadoAccion } from "@/tipos/acciones";

const MENSAJES_ERROR_AUTENTICACION: Record<string, string> = {
  invalid_credentials: "El correo o la contraseña no son correctos.",
  email_not_confirmed: "Todavía no confirmaste tu correo. Revisá tu bandeja de entrada (y la carpeta de spam).",
  user_already_exists: "Ya existe una cuenta con ese correo.",
  email_exists: "Ya existe una cuenta con ese correo.",
  weak_password: "La contraseña es demasiado débil. Usá al menos 8 caracteres con letras y números.",
  same_password: "La nueva contraseña tiene que ser distinta de la anterior.",
  over_email_send_rate_limit: "Se enviaron demasiados correos. Esperá unos minutos antes de volver a intentar.",
  over_request_rate_limit: "Hubo demasiados intentos. Esperá unos minutos antes de volver a intentar.",
  signup_disabled: "El registro de cuentas nuevas está deshabilitado temporalmente.",
  otp_expired: "El enlace venció o ya fue utilizado. Pedí uno nuevo.",
  flow_state_expired: "El enlace venció. Volvé a intentarlo.",
  flow_state_not_found: "El enlace no es válido o ya fue utilizado.",
  bad_code_verifier: "El enlace se abrió en otro navegador. Volvé a intentarlo desde el mismo navegador.",
  session_not_found: "Tu sesión expiró. Ingresá nuevamente.",
  reauthentication_needed: "Por seguridad, volvé a ingresar antes de cambiar la contraseña.",
  sin_conexion: "No pudimos conectarnos con el servidor. Revisá tu conexión e intentá nuevamente.",
};

/** Traduce un código de error de Supabase Auth a un mensaje en español apto para el usuario. */
export function traducirErrorAutenticacion(codigo: string | undefined): string {
  return (codigo && MENSAJES_ERROR_AUTENTICACION[codigo]) || "No pudimos completar la operación. Intentá nuevamente.";
}

function fallo(contexto: string, error: { code?: string; name?: string; message?: string }): ResultadoAccion<never> {
  const codigo = error.code ?? (error.name === "AuthRetryableFetchError" ? "sin_conexion" : undefined);
  // Los errores esperables (credenciales, límites) no se registran como fallas del sistema.
  if (!codigo || codigo === "sin_conexion" || !(codigo in MENSAJES_ERROR_AUTENTICACION)) registrarError(contexto, error);
  return { ok: false, mensaje: traducirErrorAutenticacion(codigo) };
}

export async function ingresarConContrasena(
  cliente: ClienteSupabase,
  datos: { correo: string; contrasena: string },
): Promise<ResultadoAccion> {
  const { error } = await cliente.auth.signInWithPassword({ email: datos.correo, password: datos.contrasena });
  if (error) return fallo("ingresar", error);
  return { ok: true };
}

export async function registrarCuenta(
  cliente: ClienteSupabase,
  datos: { nombre: string; apellido: string; correo: string; contrasena: string },
  urlConfirmacion: string,
): Promise<ResultadoAccion<{ sesionIniciada: boolean }>> {
  const { data, error } = await cliente.auth.signUp({
    email: datos.correo,
    password: datos.contrasena,
    options: {
      emailRedirectTo: urlConfirmacion,
      // Solo datos descriptivos: el rol nunca se toma de estos metadatos.
      data: { nombre: datos.nombre, apellido: datos.apellido },
    },
  });

  // Con la confirmación de correo activa, Supabase no revela si el correo ya
  // estaba registrado; se responde siempre igual para evitar enumerar cuentas.
  if (error && error.code !== "user_already_exists" && error.code !== "email_exists") {
    return fallo("registrarse", error);
  }
  return { ok: true, datos: { sesionIniciada: Boolean(data?.session) } };
}

export async function iniciarIngresoConGoogle(
  cliente: ClienteSupabase,
  urlRetorno: string,
): Promise<ResultadoAccion<{ url: string }>> {
  const { data, error } = await cliente.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: urlRetorno },
  });
  if (error || !data.url) return fallo("ingresar_google", error ?? { message: "Sin URL de Google" });
  return { ok: true, datos: { url: data.url } };
}

export async function solicitarRecuperacionContrasena(
  cliente: ClienteSupabase,
  correo: string,
  urlRetorno: string,
): Promise<ResultadoAccion> {
  const { error } = await cliente.auth.resetPasswordForEmail(correo, { redirectTo: urlRetorno });
  // Solo se informan los límites de envío; cualquier otro caso responde igual
  // para no revelar qué correos tienen cuenta.
  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return fallo("recuperar_contrasena", error);
  }
  if (error) registrarError("recuperar_contrasena", error);
  return { ok: true };
}

export async function cambiarContrasena(cliente: ClienteSupabase, contrasena: string): Promise<ResultadoAccion> {
  const { error } = await cliente.auth.updateUser({ password: contrasena });
  if (error) return fallo("cambiar_contrasena", error);
  return { ok: true };
}

export async function cerrarSesionActual(cliente: ClienteSupabase): Promise<void> {
  const { error } = await cliente.auth.signOut();
  if (error) registrarError("cerrar_sesion", error);
}