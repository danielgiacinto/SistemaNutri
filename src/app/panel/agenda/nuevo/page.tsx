import { TituloTarjeta } from "@/componentes/comunes/titulo-tarjeta";
import { CalendarPlus, Info } from "lucide-react";
import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarPacientesActivos } from "@/servicios/pacientes";
import { obtenerDatosConsultorio } from "@/servicios/consultorios";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { FormularioTurno } from "@/componentes/agenda/formulario-turno";
import { Card, CardContent, CardHeader, CardDescription } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { esFechaIso } from "@/lib/fechas";
import { DURACION_TURNO_PREDETERMINADA } from "@/configuracion/clinica";
import { esquemaUuid } from "@/esquemas/comunes";

export const metadata: Metadata = { title: "Nuevo turno" };

export default function PaginaNuevoTurno({ searchParams }: PageProps<"/panel/agenda/nuevo">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/panel/agenda/nuevo">["searchParams"] }) {
  const contexto = await requerirProfesional();
  const parametros = await searchParams;
  const cliente = await crearClienteServidor();
  const [pacientes, consultorio] = await Promise.all([
    listarPacientesActivos(cliente, contexto.consultorio.id),
    obtenerDatosConsultorio(cliente, contexto.consultorio.id),
  ]);
  const fecha = typeof parametros.fecha === "string" && esFechaIso(parametros.fecha) ? parametros.fecha : "";
  const hora = typeof parametros.hora === "string" && /^\d{2}:\d{2}$/.test(parametros.hora) ? parametros.hora : "09:00";
  const paciente =
    typeof parametros.paciente === "string" && esquemaUuid.safeParse(parametros.paciente).success ? parametros.paciente : "";

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Nuevo turno"
        descripcion="Elegí paciente, día y horario."
        volverA="/panel/agenda"
        etiquetaVolver="Agenda"
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <Card>
          <CardHeader>
            <TituloTarjeta icono={CalendarPlus}>Datos del turno</TituloTarjeta>
            <CardDescription className="sm:pl-12">Definí los detalles de la consulta.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormularioTurno
              modo="alta"
              pacientes={pacientes}
              duracionPredeterminada={consultorio?.duracion_turno_minutos ?? DURACION_TURNO_PREDETERMINADA}
              inicial={{ fecha, hora, pacienteId: paciente }}
            />
          </CardContent>
        </Card>
        <aside className="space-y-3 rounded-2xl border bg-card p-5 sm:p-6">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Info className="size-4" aria-hidden="true" /></span>
          <h2 className="font-semibold">Antes de guardar</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">La fecha y la hora corresponden a la zona horaria de tu consultorio. Las notas administrativas son privadas.</p>
        </aside>
      </div>
    </div>
  );
}
