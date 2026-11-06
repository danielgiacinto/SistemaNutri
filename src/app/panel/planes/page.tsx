import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Salad } from "lucide-react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaUuid } from "@/esquemas/comunes";
import { listarPacientesActivos } from "@/servicios/pacientes";
import { listarPlanesDelConsultorio } from "@/servicios/planes";
import { estadoDelPlan } from "@/componentes/planes/estado-plan";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { FilaRecurso } from "@/componentes/comunes/fila-recurso";
import { Badge } from "@/componentes/ui/badge";
import { nombreNatural } from "@/lib/antropometria";
import { Button } from "@/componentes/ui/button";
import { FiltroPlanes } from "@/componentes/planes/filtro-planes";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Planes" };

export default function PaginaPlanes({ searchParams }: PageProps<"/panel/planes">) {
  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Planes"
        descripcion="Organizá los planes de tus pacientes y compartí cada versión cuando esté lista."
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Contenido parametros={searchParams} />
      </Suspense>
    </div>
  );
}

async function Contenido({ parametros }: { parametros: PageProps<"/panel/planes">["searchParams"] }) {
  const contexto = await requerirProfesional();
  const consulta = await parametros;
  const elegido = primerValor(consulta.paciente);
  const pacienteId = esquemaUuid.safeParse(elegido).success ? elegido : undefined;
  const cliente = await crearClienteServidor();
  const [pacientes, planes] = await Promise.all([
    listarPacientesActivos(cliente, contexto.consultorio.id),
    listarPlanesDelConsultorio(cliente, contexto.consultorio.id, pacienteId),
  ]);
  const paciente = pacientes.find((item) => item.id === pacienteId);

  return (
    <div className="space-y-6">
      <FiltroPlanes pacientes={pacientes} pacienteId={pacienteId} />

      {planes.length === 0 ? (
        <EstadoVacio
          icono={Salad}
          titulo={paciente ? `No hay planes de ${nombreNatural(paciente)}` : "Todavía no hay planes"}
          descripcion={
            paciente
              ? "Probá con otro paciente o creá un borrador desde su ficha."
              : "Entrá a la ficha de un paciente y creá el primer borrador."
          }
          accion={<Button asChild variant="outline"><Link href={paciente ? `/panel/pacientes/${paciente.id}/planes` : "/panel/pacientes"}>{paciente ? "Ver planes del paciente" : "Elegir paciente"}</Link></Button>}
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {planes.map((plan) => (
            <li key={plan.id}>
              <FilaRecurso href={`/panel/pacientes/${plan.paciente_id}/planes/${plan.id}`} icono={Salad} titulo={plan.titulo} descripcion={plan.pacientes ? nombreNatural(plan.pacientes) : "Paciente"} detalle={<Badge variant="outline">{estadoDelPlan(plan.cambios_sin_publicar, plan.planes_publicaciones.length)}</Badge>} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}
