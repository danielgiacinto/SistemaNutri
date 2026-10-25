import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarPacientesActivos } from "@/servicios/pacientes";
import { obtenerDatosConsultorio } from "@/servicios/consultorios";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { FormularioTurno } from "@/componentes/agenda/formulario-turno";
import { Card, CardContent } from "@/componentes/ui/card";
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
      <EncabezadoPagina titulo="Nuevo turno" descripcion="La agenda rechaza superposiciones, bloqueos y horarios fuera de atención." />
      <Card>
        <CardContent>
          <FormularioTurno
            modo="alta"
            pacientes={pacientes}
            duracionPredeterminada={consultorio?.duracion_turno_minutos ?? DURACION_TURNO_PREDETERMINADA}
            inicial={{ fecha, hora, pacienteId: paciente }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
