import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Salad, Users } from "lucide-react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaUuid } from "@/esquemas/comunes";
import { listarPacientesActivos } from "@/servicios/pacientes";
import { listarPlanesDelConsultorio } from "@/servicios/planes";
import { listarPlantillasPlanes } from "@/servicios/planes-visuales";
import { estadoDelPlan } from "@/componentes/planes/estado-plan";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { FilaRecurso } from "@/componentes/comunes/fila-recurso";
import { Badge } from "@/componentes/ui/badge";
import { nombreNatural } from "@/lib/antropometria";
import { Button } from "@/componentes/ui/button";
import { FiltroPlanes } from "@/componentes/planes/filtro-planes";
import { CatalogoPlantillas } from "@/componentes/planes/catalogo-plantillas";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Planes" };
export default function PaginaPlanes({ searchParams }: PageProps<"/panel/planes">) {
  return <div className="space-y-7"><EncabezadoPagina titulo="Planes alimentarios" descripcion="Tus ideas, organizadas. El acompañamiento de cada paciente, siempre personal." /><Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}><Contenido parametros={searchParams} /></Suspense></div>;
}
async function Contenido({ parametros }: { parametros: PageProps<"/panel/planes">["searchParams"] }) {
  const contexto = await requerirProfesional();
  const consulta = await parametros;
  const elegido = Array.isArray(consulta.paciente) ? consulta.paciente[0] : consulta.paciente;
  const pacienteId = esquemaUuid.safeParse(elegido).success ? elegido : undefined;
  const cliente = await crearClienteServidor();
  const [pacientes, planes, plantillas] = await Promise.all([
    listarPacientesActivos(cliente, contexto.consultorio.id), listarPlanesDelConsultorio(cliente, contexto.consultorio.id, pacienteId), listarPlantillasPlanes(cliente),
  ]);
  const paciente = pacientes.find(p => p.id === pacienteId);
  const disponible = plantillas.length > 0;
  const entregas = !disponible || consulta.vista === "entregas" || (!!pacienteId && consulta.vista !== "plantillas");
  const sufijo = pacienteId ? `&paciente=${pacienteId}` : "";
  return <div className="space-y-6">
    {disponible && <nav aria-label="Organización de planes" className="flex flex-wrap gap-2 border-b pb-4"><Button asChild variant={!entregas ? "default" : "ghost"} className="min-h-11"><Link href={`/panel/planes?vista=plantillas${sufijo}`} aria-current={!entregas ? "page" : undefined}><BookOpen aria-hidden="true" />Plantillas<Badge variant="secondary">{plantillas.filter(p => p.clase === "plan").length}</Badge></Link></Button><Button asChild variant={entregas ? "default" : "ghost"} className="min-h-11"><Link href={`/panel/planes?vista=entregas${sufijo}`} aria-current={entregas ? "page" : undefined}><Users aria-hidden="true" />Planes de pacientes<Badge variant="secondary">{planes.length}</Badge></Link></Button></nav>}
    {!entregas ? <CatalogoPlantillas plantillas={plantillas} pacientes={pacientes} pacienteId={pacienteId} /> : <div className="space-y-5"><div className="rounded-2xl bg-accent/30 p-5"><h2 className="font-semibold">Cada persona, su propio plan</h2><p className="mt-1 text-sm text-muted-foreground">Retomá un borrador o revisá sus entregas. Cada paciente ve únicamente la última versión que publicaste para él.</p></div><FiltroPlanes pacientes={pacientes} pacienteId={pacienteId} />{planes.length === 0 ? <EstadoVacio icono={Salad} titulo={paciente ? `No hay planes de ${nombreNatural(paciente)}` : "Todavía no hay planes de pacientes"} descripcion="Empezá desde su ficha o elegí una plantilla para crear un borrador personalizado." accion={<Button asChild variant="outline"><Link href={paciente ? `/panel/pacientes/${paciente.id}/planes/nuevo` : "/panel/pacientes"}>{paciente ? "Crear desde cero" : "Elegir paciente"}</Link></Button>} /> : <ul className="divide-y overflow-hidden rounded-2xl border bg-card">{planes.map(plan => <li key={plan.id}><FilaRecurso href={`/panel/pacientes/${plan.paciente_id}/planes/${plan.id}`} icono={Salad} titulo={plan.titulo} descripcion={plan.pacientes ? nombreNatural(plan.pacientes) : "Paciente"} detalle={<Badge variant="outline">{estadoDelPlan(plan.cambios_sin_publicar, plan.planes_publicaciones.length)}</Badge>} /></li>)}</ul>}</div>}
  </div>;
}
