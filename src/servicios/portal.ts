import type { ClienteSupabase } from "@/lib/supabase/servidor";
import { registrarError } from "@/lib/errores";
import type { Evolucion, Medicion, Objetivo, Turno } from "@/tipos/entidades";

export type FichaPortal = {
  pacienteId: string;
  nombre: string;
  apellido: string;
  consultorioNombre: string;
  zonaHoraria: string;
};

/** Datos que la persona puede ver: la base ya excluye lo privado y lo de otros consultorios. */
export async function obtenerFichaPortal(cliente: ClienteSupabase): Promise<FichaPortal | null> {
  const { data: paciente, error: errorPaciente } = await cliente
    .from("pacientes")
    .select("id, nombre, apellido, consultorio_id")
    .limit(1)
    .maybeSingle();

  if (errorPaciente) {
    registrarError("portal_ficha", errorPaciente);
    throw new Error("No se pudo cargar tu ficha.");
  }
  if (!paciente) return null;

  const { data: consultorio, error: errorConsultorio } = await cliente
    .from("consultorios")
    .select("nombre, zona_horaria")
    .eq("id", paciente.consultorio_id)
    .maybeSingle();

  if (errorConsultorio) {
    registrarError("portal_consultorio", errorConsultorio);
    throw new Error("No se pudo cargar tu consultorio.");
  }

  return {
    pacienteId: paciente.id,
    nombre: paciente.nombre,
    apellido: paciente.apellido,
    consultorioNombre: consultorio?.nombre ?? "Tu consultorio",
    zonaHoraria: consultorio?.zona_horaria ?? "America/Argentina/Cordoba",
  };
}

export async function listarMisTurnos(cliente: ClienteSupabase): Promise<Turno[]> {
  const { data, error } = await cliente.from("turnos").select("*").order("inicio", { ascending: false }).limit(40);
  if (error) {
    registrarError("portal_turnos", error);
    throw new Error("No se pudieron cargar tus turnos.");
  }
  return data;
}

export async function listarMisEvoluciones(cliente: ClienteSupabase): Promise<Evolucion[]> {
  const { data, error } = await cliente.from("evoluciones").select("*").order("creado_en", { ascending: false }).limit(20);
  if (error) {
    registrarError("portal_evoluciones", error);
    throw new Error("No se pudieron cargar tus notas.");
  }
  return data;
}

export async function listarMisObjetivos(cliente: ClienteSupabase): Promise<Objetivo[]> {
  const { data, error } = await cliente.from("objetivos").select("*").order("creado_en", { ascending: false });
  if (error) {
    registrarError("portal_objetivos", error);
    throw new Error("No se pudieron cargar tus objetivos.");
  }
  return data;
}

export async function listarMisMediciones(cliente: ClienteSupabase): Promise<Medicion[]> {
  const { data, error } = await cliente.from("mediciones").select("*").order("registrado_en", { ascending: false }).limit(24);
  if (error) {
    registrarError("portal_mediciones", error);
    throw new Error("No se pudieron cargar tus mediciones.");
  }
  return data;
}
