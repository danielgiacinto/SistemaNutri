import { Suspense } from "react";
import CargandoSeccionPaciente from "../loading";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarPlus, ArrowUpRight } from "lucide-react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarTurnosDelPaciente } from "@/servicios/turnos";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { InsigniaTurno } from "@/componentes/comunes/insignia-estado";
import { Button } from "@/componentes/ui/button";
import { ETIQUETAS_TIPO_CONSULTA } from "@/configuracion/clinica";
import { formatearFechaHora } from "@/lib/fechas";

export const metadata: Metadata = { title: "Turnos del paciente" };

export default function PaginaTurnosPaciente({ params }: PageProps<"/panel/pacientes/[pacienteId]/turnos">) {
  return <Suspense fallback={<CargandoSeccionPaciente />}><ContenidoSeccion params={params} /></Suspense>;
}

async function ContenidoSeccion({ params }: Pick<PageProps<"/panel/pacientes/[pacienteId]/turnos">, "params">) {
  const { pacienteId } = await params;
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const turnos = await listarTurnosDelPaciente(cliente, contexto.consultorio.id, paciente.id);

  return (
    <div className="space-y-6">
      <EncabezadoPagina nivel={2} titulo="Turnos" descripcion="Consultá las próximas citas y el historial de consultas." acciones={
        <Button asChild>
          <Link href={`/panel/agenda/nuevo?paciente=${paciente.id}`}>
            <CalendarPlus aria-hidden="true" />
            Agendar turno
          </Link>
        </Button>
      } />
      {turnos.length === 0 ? (
        <EstadoVacio icono={CalendarDays} titulo="Sin turnos" descripcion="Agendá la primera consulta para este paciente." />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {turnos.map((turno) => (
            <li key={turno.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><CalendarDays className="size-4" aria-hidden="true" /></span>
                <div className="min-w-0"><p className="font-medium wrap-anywhere">{formatearFechaHora(new Date(turno.inicio), contexto.consultorio.zonaHoraria)}</p>
                <p className="text-sm text-muted-foreground">{ETIQUETAS_TIPO_CONSULTA[turno.tipo]}</p></div>
              </div>
              <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
                <InsigniaTurno estado={turno.estado} />
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/panel/agenda/${turno.id}`}>
                    <ArrowUpRight aria-hidden="true" />
                    Ver
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
