import { TituloTarjeta } from "@/componentes/comunes/titulo-tarjeta";
import { UserRound, UserCog } from "lucide-react";
import type { Metadata } from "next";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { FormularioPaciente } from "@/componentes/pacientes/formulario-paciente";
import { AccionesEstadoPaciente } from "@/componentes/pacientes/acciones-estado";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { Card, CardContent, CardDescription, CardHeader } from "@/componentes/ui/card";

export const metadata: Metadata = { title: "Editar paciente" };

export default async function PaginaEditarPaciente({ params }: PageProps<"/panel/pacientes/[pacienteId]/editar">) {
  const { pacienteId } = await params;
  const { paciente } = await requerirPacienteDelConsultorio(pacienteId);

  return (
    <div className="space-y-6">
      <EncabezadoPagina nivel={2} titulo="Editar paciente" descripcion="Actualizá sus datos personales y de contacto." />
      <Card>
        <CardHeader>
          <TituloTarjeta icono={UserRound}>Datos personales</TituloTarjeta>
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
      <Card>
        <CardHeader>
          <TituloTarjeta icono={UserCog}>Estado del paciente</TituloTarjeta>
          <CardDescription className="sm:pl-12">{paciente.estado === "activo" ? "Podés desactivar su ficha y conservar la historia para futuras consultas." : "Reactivá su ficha para retomar el seguimiento."}</CardDescription>
        </CardHeader>
        <CardContent><AccionesEstadoPaciente pacienteId={paciente.id} estado={paciente.estado} /></CardContent>
      </Card>
    </div>
  );
}
