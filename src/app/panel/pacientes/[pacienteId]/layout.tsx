import { Suspense } from "react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { EncabezadoFicha } from "@/componentes/pacientes/encabezado-ficha";
import { listarTurnosDelPaciente } from "@/servicios/turnos";
import { Skeleton } from "@/componentes/ui/skeleton";

export default async function LayoutFicha({ children, params }: LayoutProps<"/panel/pacientes/[pacienteId]">) {
  return (
    <div className="space-y-8">
      <Suspense fallback={<Skeleton className="h-40" />}>
        <Cabecera params={params} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96" />}>{children}</Suspense>
    </div>
  );
}

async function Cabecera({ params }: { params: LayoutProps<"/panel/pacientes/[pacienteId]">["params"] }) {
  const { pacienteId } = await params;
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const turnos = await listarTurnosDelPaciente(cliente, contexto.consultorio.id, paciente.id);
  const ahora = new Date();
  const proximo = turnos.find(
    (turno) => ["programado", "confirmado"].includes(turno.estado) && new Date(turno.inicio).getTime() >= ahora.getTime(),
  );
  const ultima = turnos.find((turno) => turno.estado === "completado");

  return (
    <EncabezadoFicha
      paciente={paciente}
      zonaHoraria={contexto.consultorio.zonaHoraria}
      proximoTurnoInicio={proximo?.inicio ?? null}
      ultimaConsultaInicio={ultima?.inicio ?? null}
    />
  );
}
