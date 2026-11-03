import type { Metadata } from "next";
import { FileLock2 } from "lucide-react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { FormularioAltaPlan } from "@/componentes/planes/formulario-alta-plan";
import { Volver } from "@/componentes/comunes/volver";
import { DescripcionConIcono } from "@/componentes/comunes/descripcion-con-icono";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";

export const metadata: Metadata = { title: "Nuevo plan" };

export default async function PaginaNuevoPlan({ params }: PageProps<"/panel/pacientes/[pacienteId]/planes/nuevo">) {
  const { pacienteId } = await params;
  const { paciente } = await requerirPacienteDelConsultorio(pacienteId);

  return (
    <div className="space-y-4">
      <Volver href={`/panel/pacientes/${paciente.id}/planes`} etiqueta="Planes" />
      <Card>
      <CardHeader>
        <CardTitle>Nuevo plan</CardTitle>
        <CardDescription>
          <DescripcionConIcono icono={FileLock2}>Nace como borrador. El paciente no lo ve hasta que lo publiques.</DescripcionConIcono>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioAltaPlan pacienteId={paciente.id} />
      </CardContent>
    </Card>
    </div>
  );
}
