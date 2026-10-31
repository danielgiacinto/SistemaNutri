import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarPlus, ClipboardList, ClipboardPen, Scale, Target } from "lucide-react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarObjetivosActivos } from "@/servicios/objetivos";
import { ultimaMedicion } from "@/servicios/mediciones";
import { listarEvoluciones } from "@/servicios/evoluciones";
import { calcularImc } from "@/lib/antropometria";
import { formatearFechaHora } from "@/lib/fechas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { InsigniaObjetivo } from "@/componentes/comunes/insignia-estado";

export const metadata: Metadata = { title: "Ficha del paciente" };

export default async function PaginaResumenPaciente({ params }: PageProps<"/panel/pacientes/[pacienteId]">) {
  return (
    <Suspense fallback={<Skeleton className="h-80" />}>
      <Contenido params={params} />
    </Suspense>
  );
}

async function Contenido({ params }: { params: PageProps<"/panel/pacientes/[pacienteId]">["params"] }) {
  const { pacienteId } = await params;
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const [objetivos, medicion, evoluciones] = await Promise.all([
    listarObjetivosActivos(cliente, contexto.consultorio.id, paciente.id),
    ultimaMedicion(cliente, contexto.consultorio.id, paciente.id),
    listarEvoluciones(cliente, contexto.consultorio.id, paciente.id),
  ]);
  const imc = medicion ? calcularImc(medicion.peso_kg, medicion.talla_cm) : null;
  const ultimaEvolucion = evoluciones[0];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-4" aria-hidden="true" />
            Objetivos activos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {objetivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay objetivos en curso.</p>
          ) : (
            objetivos.slice(0, 3).map((objetivo) => (
              <div key={objetivo.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{objetivo.titulo}</p>
                  {objetivo.descripcion && <p className="text-sm text-muted-foreground">{objetivo.descripcion}</p>}
                </div>
                <InsigniaObjetivo estado={objetivo.estado} />
              </div>
            ))
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/panel/pacientes/${paciente.id}/objetivos`}>
              <Target aria-hidden="true" />
              Ver objetivos
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-4" aria-hidden="true" />
            Última medición
          </CardTitle>
          <CardDescription>
            {medicion ? formatearFechaHora(new Date(medicion.registrado_en), contexto.consultorio.zonaHoraria) : "Sin registros"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {medicion ? (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Peso</dt>
                <dd className="text-lg font-semibold tabular-nums">{medicion.peso_kg != null ? `${medicion.peso_kg} kg` : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">IMC</dt>
                <dd className="text-lg font-semibold tabular-nums">{imc ?? "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Registrá peso y talla para ver la evolución.</p>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/panel/pacientes/${paciente.id}/mediciones`}>
              <Scale aria-hidden="true" />
              Ver mediciones
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-4" aria-hidden="true" />
            Última evolución
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ultimaEvolucion ? (
            <>
              <p className="font-medium">{ultimaEvolucion.titulo || "Evolución clínica"}</p>
              <p className="line-clamp-3 text-sm text-muted-foreground">{ultimaEvolucion.contenido}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Todavía no hay notas clínicas.</p>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href={`/panel/pacientes/${paciente.id}/historia`}>
              <ClipboardList aria-hidden="true" />
              Abrir historia
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-4" aria-hidden="true" />
            Acciones rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/panel/agenda/nuevo?paciente=${paciente.id}`}>
              <CalendarPlus aria-hidden="true" />
              Agendar turno
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/panel/pacientes/${paciente.id}/historia/nueva`}>
              <ClipboardPen aria-hidden="true" />
              Nueva evolución
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
