import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardPen, UserRound } from "lucide-react";
import { requerirTurnoDelConsultorio } from "@/autorizacion/clinica";
import { listarPacientesActivos } from "@/servicios/pacientes";
import { obtenerDatosConsultorio } from "@/servicios/consultorios";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { FormularioTurno } from "@/componentes/agenda/formulario-turno";
import { AccionesTurno } from "@/componentes/agenda/acciones-turno";
import { InsigniaTurno } from "@/componentes/comunes/insignia-estado";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent } from "@/componentes/ui/card";
import { fechaEnZona, formatearFechaHora, horaCortaEnZona, minutosEntre } from "@/lib/fechas";
import { nombreNatural } from "@/lib/antropometria";
import { DURACION_TURNO_PREDETERMINADA, DURACIONES_TURNO_MINUTOS } from "@/configuracion/clinica";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Turno" };

export default function PaginaTurno({ params }: PageProps<"/panel/agenda/[turnoId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: PageProps<"/panel/agenda/[turnoId]">["params"] }) {
  const { turnoId } = await params;
  const { turno, paciente, contexto, cliente } = await requerirTurnoDelConsultorio(turnoId);
  const [pacientes, consultorio] = await Promise.all([
    listarPacientesActivos(cliente, contexto.consultorio.id),
    obtenerDatosConsultorio(cliente, contexto.consultorio.id),
  ]);
  const inicio = new Date(turno.inicio);
  const duracion = minutosEntre(inicio, new Date(turno.fin));
  const duracionValida = (DURACIONES_TURNO_MINUTOS as readonly number[]).includes(duracion)
    ? duracion
    : (consultorio?.duracion_turno_minutos ?? DURACION_TURNO_PREDETERMINADA);

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo={turno.pacientes ? nombreNatural(turno.pacientes) : "Turno"}
        descripcion={formatearFechaHora(inicio, contexto.consultorio.zonaHoraria)}
        acciones={<InsigniaTurno estado={turno.estado} />}
        volverA="/panel/agenda"
        etiquetaVolver="Agenda"
      />
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/panel/pacientes/${paciente.id}`}>
            <UserRound aria-hidden="true" />
            Abrir ficha
          </Link>
        </Button>
        {turno.estado !== "cancelado" && (
          <Button asChild variant="outline">
            <Link href={`/panel/pacientes/${paciente.id}/historia/nueva?turno=${turno.id}`}>
              <ClipboardPen aria-hidden="true" />
              Registrar evolución
            </Link>
          </Button>
        )}
      </div>
      <AccionesTurno turnoId={turno.id} estado={turno.estado} />
      <Card>
        <CardContent>
          <FormularioTurno
            modo="edicion"
            pacientes={pacientes.some((item) => item.id === paciente.id) ? pacientes : [{ id: paciente.id, nombre: paciente.nombre, apellido: paciente.apellido }, ...pacientes]}
            duracionPredeterminada={duracionValida}
            inicial={{
              turnoId: turno.id,
              pacienteId: turno.paciente_id,
              fecha: fechaEnZona(inicio, contexto.consultorio.zonaHoraria),
              hora: horaCortaEnZona(inicio, contexto.consultorio.zonaHoraria),
              duracionMinutos: duracionValida,
              tipo: turno.tipo,
              motivo: turno.motivo ?? "",
              notasAdministrativas: turno.notas_administrativas ?? "",
              estado: turno.estado,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
