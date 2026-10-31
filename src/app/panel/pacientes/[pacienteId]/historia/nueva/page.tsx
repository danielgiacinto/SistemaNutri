import type { Metadata } from "next";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarTurnosDelPaciente } from "@/servicios/turnos";
import { FormularioEvolucion } from "@/componentes/clinica/formulario-evolucion";
import { Volver } from "@/componentes/comunes/volver";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";

export const metadata: Metadata = { title: "Nueva evolución" };

export default async function PaginaNuevaEvolucion({
  params,
  searchParams,
}: PageProps<"/panel/pacientes/[pacienteId]/historia/nueva">) {
  const { pacienteId } = await params;
  const consulta = await searchParams;
  const turnoId = typeof consulta.turno === "string" ? consulta.turno : "";
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const turnos = await listarTurnosDelPaciente(cliente, contexto.consultorio.id, paciente.id);

  return (
    <div className="space-y-4">
      <Volver href={`/panel/pacientes/${paciente.id}/historia`} etiqueta="Historia" />
      <Card>
      <CardHeader>
        <CardTitle>Nueva evolución</CardTitle>
        <CardDescription>La nota nace privada y en borrador. Compartirla requiere una acción explícita.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioEvolucion
          modo="alta"
          pacienteId={paciente.id}
          zonaHoraria={contexto.consultorio.zonaHoraria}
          turnos={turnos}
          inicial={{ turnoId, esBorrador: true, visibleParaPaciente: false }}
        />
      </CardContent>
    </Card>
    </div>
  );
}
