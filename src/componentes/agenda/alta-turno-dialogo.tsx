import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarPacientesActivos } from "@/servicios/pacientes";
import { listarServiciosActivos } from "@/servicios/finanzas";
import { obtenerDatosConsultorio } from "@/servicios/consultorios";
import { DURACION_TURNO_PREDETERMINADA } from "@/configuracion/clinica";
import { esquemaHora, esquemaUuid } from "@/esquemas/comunes";
import { esFechaIso, hoyEnZona } from "@/lib/fechas";
import { DialogoNuevoTurno } from "./dialogo-nuevo-turno";

export async function AltaTurnoDialogo({ searchParams, entradaDirecta = false }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  entradaDirecta?: boolean;
}) {
  const contexto = await requerirProfesional();
  const parametros = await searchParams;
  const cliente = await crearClienteServidor();
  const [pacientes, servicios, consultorio] = await Promise.all([
    listarPacientesActivos(cliente, contexto.consultorio.id),
    listarServiciosActivos(cliente),
    obtenerDatosConsultorio(cliente, contexto.consultorio.id),
  ]);
  const fecha = typeof parametros.fecha === "string" && esFechaIso(parametros.fecha) ? parametros.fecha : hoyEnZona(contexto.consultorio.zonaHoraria);
  const hora = typeof parametros.hora === "string" && esquemaHora.safeParse(parametros.hora).success ? parametros.hora : "09:00";
  const pacienteId = typeof parametros.paciente === "string" && esquemaUuid.safeParse(parametros.paciente).success ? parametros.paciente : "";

  return <DialogoNuevoTurno pacientes={pacientes} servicios={servicios} fechaPredeterminada={hoyEnZona(contexto.consultorio.zonaHoraria)}
    duracionPredeterminada={consultorio?.duracion_turno_minutos ?? DURACION_TURNO_PREDETERMINADA}
    zonaHoraria={contexto.consultorio.zonaHoraria} inicial={{ fecha, hora, pacienteId }}
    volverA={entradaDirecta ? `/panel/agenda?vista=dia&fecha=${fecha}` : undefined} />;
}
