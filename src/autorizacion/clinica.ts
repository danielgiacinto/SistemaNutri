import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaUuid } from "@/esquemas/comunes";
import { obtenerPaciente } from "@/servicios/pacientes";
import { obtenerTurno } from "@/servicios/turnos";
import { obtenerEvolucion } from "@/servicios/evoluciones";
import type { ContextoProfesional } from "@/autorizacion/contexto";
import type { Evolucion, Paciente } from "@/tipos/entidades";
import type { TurnoConPaciente } from "@/servicios/turnos";
import type { ClienteSupabase } from "@/lib/supabase/servidor";

export type RecursoPaciente = {
  contexto: ContextoProfesional;
  cliente: ClienteSupabase;
  paciente: Paciente;
};

function idO404(valor: string): string {
  if (!esquemaUuid.safeParse(valor).success) notFound();
  return valor;
}

/** Carga un paciente del consultorio de la sesión. Un id ajeno responde 404. */
export const requerirPacienteDelConsultorio = cache(async (pacienteId: string): Promise<RecursoPaciente> => {
  const contexto = await requerirProfesional();
  const cliente = await crearClienteServidor();
  const paciente = await obtenerPaciente(cliente, contexto.consultorio.id, idO404(pacienteId));
  if (!paciente) notFound();
  return { contexto, cliente, paciente };
});

export const requerirTurnoDelConsultorio = cache(
  async (
    turnoId: string,
  ): Promise<RecursoPaciente & { turno: TurnoConPaciente }> => {
    const contexto = await requerirProfesional();
    const cliente = await crearClienteServidor();
    const turno = await obtenerTurno(cliente, contexto.consultorio.id, idO404(turnoId));
    if (!turno) notFound();
    const paciente = await obtenerPaciente(cliente, contexto.consultorio.id, turno.paciente_id);
    if (!paciente) notFound();
    return { contexto, cliente, paciente, turno };
  },
);

export const requerirEvolucionDelConsultorio = cache(
  async (
    evolucionId: string,
  ): Promise<RecursoPaciente & { evolucion: Evolucion }> => {
    const contexto = await requerirProfesional();
    const cliente = await crearClienteServidor();
    const evolucion = await obtenerEvolucion(cliente, contexto.consultorio.id, idO404(evolucionId));
    if (!evolucion) notFound();
    const paciente = await obtenerPaciente(cliente, contexto.consultorio.id, evolucion.paciente_id);
    if (!paciente) notFound();
    return { contexto, cliente, paciente, evolucion };
  },
);
