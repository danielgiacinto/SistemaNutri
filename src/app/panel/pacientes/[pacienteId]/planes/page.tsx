import type { Metadata } from "next";
import { Salad } from "lucide-react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";

export const metadata: Metadata = { title: "Planes alimentarios" };

export default async function PaginaPlanesPaciente({ params }: PageProps<"/panel/pacientes/[pacienteId]/planes">) {
  await requerirPacienteDelConsultorio((await params).pacienteId);
  return (
    <EstadoVacio
      icono={Salad}
      titulo="Los planes alimentarios llegan en la fase 4"
      descripcion="Van a tener versiones y publicación controlada: guardar un borrador no cambiará lo que ve el paciente."
    />
  );
}
