import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarVersionesEvolucion, obtenerEvolucion } from "@/servicios/evoluciones";
import { listarTurnosDelPaciente } from "@/servicios/turnos";
import { FormularioEvolucion } from "@/componentes/clinica/formulario-evolucion";
import { Volver } from "@/componentes/comunes/volver";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { formatearFechaHora } from "@/lib/fechas";
import { esquemaUuid } from "@/esquemas/comunes";

export const metadata: Metadata = { title: "Evolución" };

export default async function PaginaEvolucion({
  params,
}: PageProps<"/panel/pacientes/[pacienteId]/historia/[evolucionId]">) {
  const { pacienteId, evolucionId } = await params;
  if (!esquemaUuid.safeParse(evolucionId).success) notFound();
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const evolucion = await obtenerEvolucion(cliente, contexto.consultorio.id, evolucionId);
  if (!evolucion || evolucion.paciente_id !== paciente.id) notFound();
  const [turnos, versiones] = await Promise.all([
    listarTurnosDelPaciente(cliente, contexto.consultorio.id, paciente.id),
    listarVersionesEvolucion(cliente, contexto.consultorio.id, evolucion.id),
  ]);
  const fueEditada = evolucion.actualizado_en !== evolucion.creado_en;

  return (
    <div className="space-y-6">
      <Volver href={`/panel/pacientes/${paciente.id}/historia`} etiqueta="Historia" />
      <Card>
        <CardHeader>
          <CardTitle>{evolucion.titulo || "Evolución clínica"}</CardTitle>
          <CardDescription>
            Creada el {formatearFechaHora(new Date(evolucion.creado_en), contexto.consultorio.zonaHoraria)}
            {fueEditada
              ? ` · Última modificación el ${formatearFechaHora(new Date(evolucion.actualizado_en), contexto.consultorio.zonaHoraria)}`
              : " · Sin modificaciones posteriores"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioEvolucion
            modo="edicion"
            pacienteId={paciente.id}
            zonaHoraria={contexto.consultorio.zonaHoraria}
            turnos={turnos}
            inicial={{
              evolucionId: evolucion.id,
              pacienteId: paciente.id,
              turnoId: evolucion.turno_id ?? "",
              titulo: evolucion.titulo ?? "",
              contenido: evolucion.contenido,
              observaciones: evolucion.observaciones ?? "",
              indicaciones: evolucion.indicaciones ?? "",
              esBorrador: evolucion.es_borrador,
              visibleParaPaciente: evolucion.visible_para_paciente,
            }}
          />
        </CardContent>
      </Card>

      {versiones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de cambios</CardTitle>
            <CardDescription>Cada edición guarda el contenido anterior. La fecha es la del cambio, no la del alta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {versiones.map((version) => (
              <article key={version.id} className="rounded-xl border p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {formatearFechaHora(new Date(version.creado_en), contexto.consultorio.zonaHoraria)}
                  {version.es_borrador ? " · Borrador" : ""}
                </p>
                <p className="mt-1 font-medium">{version.titulo || "Sin título"}</p>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{version.contenido}</p>
              </article>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
