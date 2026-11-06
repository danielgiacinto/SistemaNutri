import { Suspense } from "react";
import CargandoSeccionPaciente from "../loading";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/componentes/ui/badge";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Salad } from "lucide-react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarPlanesDelPaciente } from "@/servicios/planes";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { Button } from "@/componentes/ui/button";
import { estadoDelPlan } from "@/componentes/planes/estado-plan";

export const metadata: Metadata = { title: "Planes alimentarios" };

export default function PaginaPlanesPaciente({ params }: PageProps<"/panel/pacientes/[pacienteId]/planes">) {
  return <Suspense fallback={<CargandoSeccionPaciente />}><ContenidoSeccion params={params} /></Suspense>;
}

async function ContenidoSeccion({ params }: Pick<PageProps<"/panel/pacientes/[pacienteId]/planes">, "params">) {
  const { pacienteId } = await params;
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const planes = await listarPlanesDelPaciente(cliente, contexto.consultorio.id, paciente.id);

  return (
    <div className="space-y-6">
      <EncabezadoPagina nivel={2}
        titulo="Planes alimentarios"
        descripcion="El borrador se puede cambiar tranquilo. El paciente ve solo la versión que publiques."
        acciones={
          <Button asChild>
            <Link href={`/panel/pacientes/${paciente.id}/planes/nuevo`}>
              <Plus aria-hidden="true" />
              Nuevo plan
            </Link>
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
              <Link href={`/panel/pacientes/${paciente.id}/planes/nuevo`}>
                <Plus aria-hidden="true" />
                Crear borrador
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {planes.map((plan) => (
            <li key={plan.id}>
              <Link href={`/panel/pacientes/${paciente.id}/planes/${plan.id}`} className="group flex h-full items-start gap-3 rounded-2xl border bg-card p-5 transition-colors outline-none hover:border-primary/30 hover:bg-accent/20 focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Salad className="size-5" aria-hidden="true" /></span><div className="min-w-0 flex-1 space-y-2"><h2 className="font-semibold wrap-anywhere">{plan.titulo}</h2>
                <Badge variant={plan.planes_publicaciones.length ? "secondary" : "outline"} className="h-auto whitespace-normal">{estadoDelPlan(plan.cambios_sin_publicar, plan.planes_publicaciones.length)}</Badge></div><ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
