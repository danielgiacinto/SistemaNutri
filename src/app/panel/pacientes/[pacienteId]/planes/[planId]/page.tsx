import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarComidas, listarPublicaciones, obtenerPlan } from "@/servicios/planes";
import { FormularioPlan } from "@/componentes/planes/formulario-plan";
import { estadoDelPlan } from "@/componentes/planes/estado-plan";
import { Volver } from "@/componentes/comunes/volver";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { esquemaUuid } from "@/esquemas/comunes";
import { formatearFechaHora } from "@/lib/fechas";

export const metadata: Metadata = { title: "Plan alimentario" };

export default async function PaginaPlan({
  params,
}: PageProps<"/panel/pacientes/[pacienteId]/planes/[planId]">) {
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
      <Card>
        <CardHeader>
          <CardTitle>{plan.titulo}</CardTitle>
          <CardDescription>{estadoDelPlan(plan.cambios_sin_publicar, publicaciones.length)}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioPlan
            pacienteId={paciente.id}
            planId={plan.id}
            titulo={plan.titulo}
            indicaciones={plan.indicaciones ?? ""}
            comidas={comidas.map((comida) => ({ momento: comida.momento, detalle: comida.detalle }))}
            puedeBorrar={publicaciones.length === 0}
          />
        </CardContent>
      </Card>
      {publicaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Versiones publicadas</CardTitle>
            <CardDescription>Cada publicación queda guardada. El paciente ve la más reciente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {publicaciones.map((version) => (
              <p key={version.id} className="text-sm">
                Versión {version.numero} · {formatearFechaHora(new Date(version.publicada_en), contexto.consultorio.zonaHoraria)}
                {version.numero === publicaciones[0]?.numero ? " · La que ve el paciente" : ""}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
