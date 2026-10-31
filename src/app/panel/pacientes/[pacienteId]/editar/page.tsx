import type { Metadata } from "next";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { FormularioPaciente } from "@/componentes/pacientes/formulario-paciente";
import { AccionesEstadoPaciente } from "@/componentes/pacientes/acciones-estado";
import { Volver } from "@/componentes/comunes/volver";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";

export const metadata: Metadata = { title: "Editar paciente" };

export default async function PaginaEditarPaciente({ params }: PageProps<"/panel/pacientes/[pacienteId]/editar">) {
  const { pacienteId } = await params;
  const { paciente } = await requerirPacienteDelConsultorio(pacienteId);

  return (
    <div className="space-y-6">
      <Volver href={`/panel/pacientes/${paciente.id}`} etiqueta="Ficha" />
      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
          <CardDescription>Los cambios quedan auditados en el consultorio cuando corresponde.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioPaciente
            modo="edicion"
            pacienteId={paciente.id}
            inicial={{
              nombre: paciente.nombre,
              apellido: paciente.apellido,
              correo: paciente.correo ?? "",
              telefono: paciente.telefono ?? "",
              documento: paciente.documento ?? "",
              fechaNacimiento: paciente.fecha_nacimiento ?? "",
              notasAdministrativas: paciente.notas_administrativas ?? "",
              estado: paciente.estado,
            }}
          />
        </CardContent>
      </Card>
      <AccionesEstadoPaciente pacienteId={paciente.id} estado={paciente.estado} />
    </div>
  );
}
