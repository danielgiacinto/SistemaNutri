import type { Metadata } from "next";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { FormularioAltaPlan } from "@/componentes/planes/formulario-alta-plan";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";

export const metadata: Metadata = { title: "Nuevo plan" };

export default async function PaginaNuevoPlan({ params }: PageProps<"/panel/pacientes/[pacienteId]/planes/nuevo">) {
  const { pacienteId } = await params;
  const { paciente } = await requerirPacienteDelConsultorio(pacienteId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo plan</CardTitle>
        <CardDescription>Nace como borrador. El paciente no lo ve hasta que lo publiques.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioAltaPlan pacienteId={paciente.id} />
      </CardContent>
    </Card>
  );
}
