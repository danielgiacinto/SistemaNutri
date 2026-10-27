import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { obtenerEntornoPublico } from "@/configuracion/entorno";
import { MENSAJE_ERROR_INESPERADO, mensajeDeNegocio, registrarError } from "@/lib/errores";
import { traducirErrorAutenticacion } from "@/servicios/autenticacion";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { InvitacionPaciente } from "@/tipos/entidades";
import type { Database } from "@/tipos/base-datos";

const DIAS_VIGENCIA = 7;

const MENSAJES: Record<string, string> = {
  invitacion_invalida: "La invitación no es válida, ya se usó o venció.",
  invitacion_ambigua: "Hay más de una invitación para tu correo. Abrí el enlace que te envió tu nutricionista.",
  cuenta_profesional: "Esta cuenta ya es de un consultorio. Para el portal usá el correo de la invitación.",
  paciente_inactivo: "Tu ficha no está activa. Pedile a tu nutricionista que la reactive.",
  paciente_ya_vinculado: "Esa ficha ya está vinculada a otra cuenta.",
  perfil_inexistente: "No encontramos tu perfil. Volvé a ingresar.",
  no_autenticado: "Tenés que ingresar para aceptar la invitación.",
  duplicado: "Ya hay una invitación pendiente. Volvé a intentar.",
  sin_permiso: "No tenés permiso para invitar a este paciente.",
};

export function huellaInvitacion(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function crearTokenInvitacion(): string {
  return randomBytes(32).toString("base64url");
}

const COLUMNAS_INVITACION =
  "id, consultorio_id, paciente_id, consultorio_nombre, correo, expira_en, creada_por, aceptada_en, revocada_en, creado_en";

export async function obtenerInvitacionPendiente(
  cliente: ClienteSupabase,
  pacienteId: string,
): Promise<InvitacionPaciente | null> {
  const { data, error } = await cliente
    .from("invitaciones_paciente")
    .select(COLUMNAS_INVITACION)
    .eq("paciente_id", pacienteId)
    .is("aceptada_en", null)
    .is("revocada_en", null)
    .gt("expira_en", new Date().toISOString())
    .maybeSingle();

  if (error) {
    registrarError("obtener_invitacion", error);
    throw new Error("No se pudo cargar la invitación.");
  }
  return data;
}

/** Invitaciones pendientes del correo de la sesión (la política RLS las filtra). */
export async function listarInvitacionesPendientes(cliente: ClienteSupabase): Promise<InvitacionPaciente[]> {
  const { data, error } = await cliente
    .from("invitaciones_paciente")
    .select(COLUMNAS_INVITACION)
    .is("aceptada_en", null)
    .is("revocada_en", null)
    .gt("expira_en", new Date().toISOString());

  if (error) {
    registrarError("listar_invitaciones", error);
    throw new Error("No se pudieron cargar las invitaciones.");
  }
  return data;
}

export async function crearInvitacionPaciente(
  cliente: ClienteSupabase,
  consultorioId: string,
  consultorioNombre: string,
  paciente: { id: string; correo: string | null; usuario_id: string | null; nombre: string; apellido: string },
  creadoPor: string,
  urlSitio: string,
): Promise<ResultadoAccion<{ enlace: string; correoEnviado: boolean }>> {
  if (paciente.usuario_id) {
    return { ok: false, mensaje: "Este paciente ya tiene una cuenta vinculada al portal." };
  }
  const correo = paciente.correo?.trim().toLowerCase();
  if (!correo) {
    return { ok: false, mensaje: "Cargá un correo en la ficha antes de invitar." };
  }

  const { error: errorRevocacion } = await cliente
    .from("invitaciones_paciente")
    .update({ revocada_en: new Date().toISOString() })
    .eq("paciente_id", paciente.id)
    .is("aceptada_en", null)
    .is("revocada_en", null);

  if (errorRevocacion) {
    registrarError("revocar_invitacion", errorRevocacion);
    return { ok: false, mensaje: mensajeDeNegocio(errorRevocacion, MENSAJES) ?? MENSAJE_ERROR_INESPERADO };
  }

  const token = crearTokenInvitacion();
  const expira = new Date(Date.now() + DIAS_VIGENCIA * 24 * 60 * 60 * 1000);
  const { error } = await cliente.from("invitaciones_paciente").insert({
    consultorio_id: consultorioId,
    paciente_id: paciente.id,
    consultorio_nombre: consultorioNombre,
    correo,
    token_hash: huellaInvitacion(token),
    expira_en: expira.toISOString(),
    creada_por: creadoPor,
  });

  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES);
    if (!mensaje) registrarError("crear_invitacion", error);
    return { ok: false, mensaje: mensaje ?? MENSAJE_ERROR_INESPERADO };
  }

  const enlace = `${urlSitio}/invitacion/${token}`;
  const envio = await enviarInvitacionPorCorreo(correo, paciente.nombre, paciente.apellido);
  return {
    ok: true,
    mensaje: envio.ok
      ? "Enviamos la invitación al correo de la ficha. Al abrirla va a elegir una contraseña para poder volver a entrar. También podés copiar el enlace."
      : `La invitación quedó creada, pero no pudimos enviar el correo${envio.detalle ? `: ${envio.detalle}` : ""}. Copiá el enlace y compartilo.`,
    datos: { enlace, correoEnviado: envio.ok },
  };
}

export async function aceptarInvitacion(
  cliente: ClienteSupabase,
  token: string | null,
): Promise<ResultadoAccion> {
  const { error } = token
    ? await cliente.rpc("aceptar_invitacion", { p_huella: huellaInvitacion(token) })
    : await cliente.rpc("aceptar_invitacion");
  if (error) {
    const mensaje = mensajeDeNegocio(error, MENSAJES);
    if (!mensaje) registrarError("aceptar_invitacion", error);
    return { ok: false, mensaje: mensaje ?? MENSAJE_ERROR_INESPERADO };
  }
  return { ok: true, mensaje: "Listo. Ya podés entrar a tu portal." };
}

/** Avisa por el correo de Auth sin usar la sesión de quien invita. */
async function enviarInvitacionPorCorreo(
  correo: string,
  nombre: string,
  apellido: string,
): Promise<{ ok: boolean; detalle?: string }> {
  const { supabaseUrl, supabaseClavePublica } = obtenerEntornoPublico();
  const suelto = createClient<Database>(supabaseUrl, supabaseClavePublica, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await suelto.auth.signInWithOtp({
    email: correo,
    options: {
      shouldCreateUser: true,
      data: { nombre, apellido, debe_elegir_contrasena: true },
    },
  });
  if (error) {
    registrarError("invitar_paciente_correo", error);
    return { ok: false, detalle: traducirErrorAutenticacion(error.code) };
  }
  return { ok: true };
}

/** True si esta sesión ya puede volver a entrar con contraseña o con Google. */
export async function tieneIngresoPropio(cliente: ClienteSupabase): Promise<boolean> {
  const { data, error } = await cliente.rpc("tiene_ingreso_propio");
  if (error) {
    registrarError("tiene_ingreso_propio", error);
    throw new Error("No se pudo verificar la cuenta.");
  }
  return Boolean(data);
}

/** Nombre del consultorio de una invitación vigente, para el texto del correo. */
export async function nombreConsultorioInvitacion(
  cliente: ClienteSupabase,
  correo: string,
  huella: string | null,
): Promise<string | null> {
  const { data, error } = await cliente.rpc("nombre_consultorio_invitacion", {
    p_correo: huella ? undefined : correo,
    p_huella: huella ?? undefined,
  });
  if (error) {
    registrarError("nombre_consultorio_invitacion", error);
    return null;
  }
  return data;
}
