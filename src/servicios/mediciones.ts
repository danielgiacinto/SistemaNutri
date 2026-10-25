import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { MENSAJE_ERROR_INESPERADO, mensajeDeNegocio, registrarError } from "@/lib/errores";
import { instanteDesdeLocal, isoDesdeDate } from "@/lib/fechas";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { Medicion } from "@/tipos/entidades";
import type { DatosAltaMedicionValidados, DatosEdicionMedicionValidados } from "@/esquemas/medicion";

function camposMedicion(datos: DatosAltaMedicionValidados, zonaHoraria: string) {
  return {
    registrado_en: isoDesdeDate(instanteDesdeLocal(datos.fecha, datos.hora, zonaHoraria)),
    peso_kg: datos.pesoKg,
    talla_cm: datos.tallaCm,
    circunferencia_cintura_cm: datos.circunferenciaCinturaCm,
    circunferencia_cadera_cm: datos.circunferenciaCaderaCm,
    porcentaje_grasa: datos.porcentajeGrasa,
    masa_muscular_kg: datos.masaMuscularKg,
    observaciones: datos.observaciones,
    visible_para_paciente: datos.visibleParaPaciente,
  };
}

export async function listarMediciones(
  cliente: ClienteSupabase,
  consultorioId: string,
  pacienteId: string,
): Promise<Medicion[]> {
  const { data, error } = await cliente
    .from("mediciones")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .eq("paciente_id", pacienteId)
    .order("registrado_en", { ascending: true });

  if (error) {
    registrarError("listar_mediciones", error);
    throw new Error("No se pudieron cargar las mediciones.");
  }
  return data;
}

export async function ultimaMedicion(
  cliente: ClienteSupabase,
  consultorioId: string,
  pacienteId: string,
): Promise<Medicion | null> {
  const { data, error } = await cliente
    .from("mediciones")
    .select("*")
    .eq("consultorio_id", consultorioId)
    .eq("paciente_id", pacienteId)
    .order("registrado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    registrarError("ultima_medicion", error);
    throw new Error("No se pudo cargar la última medición.");
  }
  return data;
}

export async function crearMedicion(
  cliente: ClienteSupabase,
  consultorioId: string,
  zonaHoraria: string,
  datos: DatosAltaMedicionValidados,
): Promise<ResultadoAccion<{ medicionId: string }>> {
  const { data, error } = await cliente
    .from("mediciones")
    .insert({ consultorio_id: consultorioId, paciente_id: datos.pacienteId, ...camposMedicion(datos, zonaHoraria) })
    .select("id")
    .maybeSingle();

  if (error) {
    const mensaje = mensajeDeNegocio(error, {
      restriccion: "Registrá al menos una medición con un valor válido.",
    });
    if (mensaje) return { ok: false, mensaje };
    registrarError("crear_medicion", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data) return { ok: false, mensaje: "No tenés permiso para registrar mediciones." };
  return { ok: true, datos: { medicionId: data.id }, mensaje: "Medición registrada." };
}

export async function actualizarMedicion(
  cliente: ClienteSupabase,
  consultorioId: string,
  zonaHoraria: string,
  datos: DatosEdicionMedicionValidados,
): Promise<ResultadoAccion> {
  const { data, error } = await cliente
    .from("mediciones")
    .update(camposMedicion(datos, zonaHoraria))
    .eq("id", datos.medicionId)
    .eq("consultorio_id", consultorioId)
    .eq("paciente_id", datos.pacienteId)
    .select("id");

  if (error) {
    const mensaje = mensajeDeNegocio(error, {
      restriccion: "Registrá al menos una medición con un valor válido.",
    });
    if (mensaje) return { ok: false, mensaje };
    registrarError("actualizar_medicion", error);
    return { ok: false, mensaje: MENSAJE_ERROR_INESPERADO };
  }
  if (!data || data.length === 0) return { ok: false, mensaje: "No se encontró la medición." };
  return { ok: true, mensaje: "Medición actualizada." };
}
