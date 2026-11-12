import type { Metadata } from "next";
import { Suspense } from "react";
import CargandoSeccionPaciente from "../../loading";
import { notFound } from "next/navigation";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarComidas, listarPublicaciones, obtenerPlan } from "@/servicios/planes";
import { EliminarBorradorPlan } from "@/componentes/planes/eliminar-borrador";
import { FormularioPlan } from "@/componentes/planes/formulario-plan";
import { EditorPlanVisual } from "@/componentes/planes/editor-plan-visual";
import { documentoDesdeComidas } from "@/lib/planes-visuales";
import { nombreNatural } from "@/lib/antropometria";
import type { DocumentoPlan } from "@/tipos/plan-visual";
import Link from "next/link";
import { Button } from "@/componentes/ui/button";
import { Volver } from "@/componentes/comunes/volver";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { esquemaUuid } from "@/esquemas/comunes";
import { formatearFechaHora } from "@/lib/fechas";

export const metadata: Metadata = { title: "Plan alimentario" };

export default function PaginaPlan({
  params,
}: PageProps<"/panel/pacientes/[pacienteId]/planes/[planId]">) {
  return <Suspense fallback={<CargandoSeccionPaciente />}><ContenidoPlan params={params} /></Suspense>;
}

async function ContenidoPlan({
  params,
}: Pick<PageProps<"/panel/pacientes/[pacienteId]/planes/[planId]">, "params">) {
  const { pacienteId, planId } = await params;
  if (!esquemaUuid.safeParse(planId).success) notFound();
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const plan = await obtenerPlan(cliente, contexto.consultorio.id, planId);
  if (!plan || plan.paciente_id !== paciente.id) notFound();

  const [comidas, publicaciones] = await Promise.all([
    listarComidas(cliente, contexto.consultorio.id, plan.id),
    listarPublicaciones(cliente, contexto.consultorio.id, plan.id),
  ]);

  return (
    <div className="space-y-6">
      <Volver href={`/panel/pacientes/${paciente.id}/planes`} etiqueta="Planes" />
      <h1 className="sr-only">Editar plan de {nombreNatural(paciente)}</h1>
      {plan.revision == null ? <Card><CardHeader><CardTitle>{plan.titulo}</CardTitle></CardHeader><CardContent><FormularioPlan pacienteId={paciente.id} planId={plan.id} titulo={plan.titulo} indicaciones={plan.indicaciones ?? ""} comidas={comidas.map(c => ({ momento: c.momento, detalle: c.detalle }))} puedeBorrar={!publicaciones.length} /></CardContent></Card> : <EditorPlanVisual key={plan.id} id={plan.id} modo="paciente" revision={plan.revision} titulo={plan.titulo} indicaciones={plan.indicaciones ?? ""} documento={(plan.documento as unknown as DocumentoPlan) ?? documentoDesdeComidas(comidas)} pacienteId={paciente.id} paciente={nombreNatural(paciente)} profesional={`${contexto.nombre} ${contexto.apellido}`} ultimaVersion={publicaciones[0]?.numero} />}
      {plan.revision != null && publicaciones.length === 0 && <EliminarBorradorPlan planId={plan.id} pacienteId={paciente.id} />}
      {publicaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Versiones publicadas</CardTitle>
            <CardDescription>Cada publicación queda guardada. El paciente ve la más reciente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {publicaciones.map((version) => (
              <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/30 p-3 text-sm"><p>
                Versión {version.numero} · {formatearFechaHora(new Date(version.publicada_en), contexto.consultorio.zonaHoraria)}
                {version.numero === publicaciones[0]?.numero ? " · La que ve el paciente" : ""}
              </p><Button asChild variant="outline" className="min-h-10"><Link href={`/planes/impresion/${version.id}`} target="_blank">Ver / guardar PDF<span className="sr-only"> de la versión {version.numero}, abre en otra pestaña</span></Link></Button></div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
