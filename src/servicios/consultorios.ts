import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { registrarError, MENSAJE_ERROR_INESPERADO } from "@/lib/errores";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { DatosConsultorioValidados } from "@/esquemas/consultorio";
import type { Fila } from "@/tipos/entidades";

/** Errores de negocio lanzados por las funciones de la base (RAISE EXCEPTION '<clave>'). */
const MENSAJES_ERROR_CONSULTORIO: Record<string, string> = {
  consultorio_existente: "Tu cuenta ya tiene un consultorio configurado.",
  cuenta_de_paciente: "Esta cuenta está registrada como paciente. Usá otro correo para crear un consultorio.",
  perfil_inexistente: "No encontramos el perfil de tu cuenta. Cerrá sesión y volvé a ingresar.",
  no_autenticado: "Tu sesión expiró. Ingresá nuevamente.",
};

export async function crearConsultorioInicial(
  cliente: ClienteSupabase,
  datos: { nombre: string; zonaHoraria: string },
): Promise<ResultadoAccion<{ consultorioId: string }>> {
  const { data, error } = await cliente.rpc("crear_consultorio_inicial", {
    p_nombre: datos.nombre,
    p_zona_horaria: datos.zonaHoraria,
  });

  if (error) {
    const mensajeNegocio = MENSAJES_ERROR_CONSULTORIO[error.message];
    if (mensajeNegocio) return { ok: false, mensaje: mensajeNegocio };
    registrarError("crear_consultorio_inicial", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  return { ok: true, datos: { consultorioId: data } };
}

export type DatosConsultorioEditables = Pick<
  Fila<"consultorios">,
  "id" | "nombre" | "zona_horaria" | "telefono" | "direccion" | "duracion_turno_minutos"
>;

export async function obtenerDatosConsultorio(
  cliente: ClienteSupabase,
  consultorioId: string,
): Promise<DatosConsultorioEditables | null> {
  const { data, error } = await cliente
    .from("consultorios")
    .select("id, nombre, zona_horaria, telefono, direccion, duracion_turno_minutos")
    .eq("id", consultorioId)
    .maybeSingle();

  if (error) {
    registrarError("obtener_consultorio", error);
    throw new Error("No se pudieron cargar los datos del consultorio.");
  }
  return data;
}

export async function actualizarDatosConsultorio(
  cliente: ClienteSupabase,
  consultorioId: string,
  datos: DatosConsultorioValidados,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("consultorios")
    .update({
      nombre: datos.nombre,
      zona_horaria: datos.zonaHoraria,
      telefono: datos.telefono,
      direccion: datos.direccion,
      duracion_turno_minutos: datos.duracionTurnoMinutos,
    })
    .eq("id", consultorioId)
    .select("id");

  if (error) {
    registrarError("actualizar_consultorio", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  // RLS filtra silenciosamente: cero filas significa que no hay permiso.
  if (!data || data.length === 0) {
    return { ok: false, mensaje: "No tenés permiso para modificar este consultorio." };
  }
  return { ok: true, mensaje: "Datos del consultorio actualizados." };
}
