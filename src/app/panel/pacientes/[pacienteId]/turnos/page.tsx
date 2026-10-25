import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarTurnosDelPaciente } from "@/servicios/turnos";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { InsigniaTurno } from "@/componentes/comunes/insignia-estado";
import { Button } from "@/componentes/ui/button";
import { ETIQUETAS_TIPO_CONSULTA } from "@/configuracion/clinica";
import { formatearFechaHora } from "@/lib/fechas";

export const metadata: Metadata = { title: "Turnos del paciente" };

export default async function PaginaTurnosPaciente({ params }: PageProps<"/panel/pacientes/[pacienteId]/turnos">) {
  const { pacienteId } = await params;
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const turnos = await listarTurnosDelPaciente(cliente, contexto.consultorio.id, paciente.id);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href={`/panel/agenda/nuevo?paciente=${paciente.id}`}>Agendar turno</Link>
        </Button>
      </div>
      {turnos.length === 0 ? (
        <EstadoVacio icono={CalendarDays} titulo="Sin turnos" descripcion="Agendá la primera consulta para este paciente." />
      ) : (
        <ul className="divide-y rounded-2xl border">
          {turnos.map((turno) => (
            <li key={turno.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{formatearFechaHora(new Date(turno.inicio), contexto.consultorio.zonaHoraria)}</p>
                <p className="text-sm text-muted-foreground">{ETIQUETAS_TIPO_CONSULTA[turno.tipo]}</p>
              </div>
              <div className="flex items-center gap-3">
                <InsigniaTurno estado={turno.estado} />
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/panel/agenda/${turno.id}`}>Ver</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
