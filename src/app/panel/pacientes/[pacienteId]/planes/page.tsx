import type { Metadata } from "next";
import Link from "next/link";
import { Salad } from "lucide-react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarPlanesDelPaciente } from "@/servicios/planes";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { Button } from "@/componentes/ui/button";
import { estadoDelPlan } from "@/componentes/planes/estado-plan";

export const metadata: Metadata = { title: "Planes alimentarios" };

export default async function PaginaPlanesPaciente({ params }: PageProps<"/panel/pacientes/[pacienteId]/planes">) {
  const { pacienteId } = await params;
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const planes = await listarPlanesDelPaciente(cliente, contexto.consultorio.id, paciente.id);

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Planes alimentarios"
        descripcion="El borrador se puede cambiar tranquilo. El paciente ve solo la versión que publiques."
        acciones={
          <Button asChild>
            <Link href={`/panel/pacientes/${paciente.id}/planes/nuevo`}>Nuevo plan</Link>
          </Button>
        }
      />
      {planes.length === 0 ? (
        <EstadoVacio
          icono={Salad}
          titulo="Todavía no hay un plan"
          descripcion="Creá un borrador, cargá las comidas y publicalo cuando esté listo."
          accion={
            <Button asChild>
              <Link href={`/panel/pacientes/${paciente.id}/planes/nuevo`}>Crear borrador</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y rounded-2xl border">
          {planes.map((plan) => (
            <li key={plan.id}>
              <Link href={`/panel/pacientes/${paciente.id}/planes/${plan.id}`} className="block px-4 py-3 hover:bg-muted/40">
                <p className="font-medium">{plan.titulo}</p>
                <p className="text-sm text-muted-foreground">{estadoDelPlan(plan.cambios_sin_publicar, plan.planes_publicaciones.length)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
