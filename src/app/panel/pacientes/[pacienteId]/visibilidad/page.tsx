import type { Metadata } from "next";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarEvoluciones } from "@/servicios/evoluciones";
import { listarObjetivos } from "@/servicios/objetivos";
import { listarMediciones } from "@/servicios/mediciones";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";

export const metadata: Metadata = { title: "Visibilidad para el paciente" };

export default async function PaginaVisibilidad({ params }: PageProps<"/panel/pacientes/[pacienteId]/visibilidad">) {
  const { pacienteId } = await params;
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const [evoluciones, objetivos, mediciones] = await Promise.all([
    listarEvoluciones(cliente, contexto.consultorio.id, paciente.id),
    listarObjetivos(cliente, contexto.consultorio.id, paciente.id),
    listarMediciones(cliente, contexto.consultorio.id, paciente.id),
  ]);

  const compartidas = {
    evoluciones: evoluciones.filter((item) => item.visible_para_paciente && !item.es_borrador).length,
    objetivos: objetivos.filter((item) => item.visible_para_paciente).length,
    mediciones: mediciones.filter((item) => item.visible_para_paciente).length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qué verá el paciente</CardTitle>
        <CardDescription>
          Nada se comparte por defecto. El portal (fase 3) solo mostrará lo marcado como visible. Las notas en borrador nunca se
          publican.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <Dato etiqueta="Evoluciones compartidas" valor={compartidas.evoluciones} total={evoluciones.length} />
        <Dato etiqueta="Objetivos visibles" valor={compartidas.objetivos} total={objetivos.length} />
        <Dato etiqueta="Mediciones visibles" valor={compartidas.mediciones} total={mediciones.length} />
      </CardContent>
    </Card>
  );
}

function Dato({ etiqueta, valor, total }: { etiqueta: string; valor: number; total: number }) {
  return (
    <div className="rounded-2xl border p-4">
      <p className="text-3xl font-bold tabular-nums">{valor}</p>
      <p className="text-sm text-muted-foreground">
        {etiqueta} de {total}
      </p>
    </div>
  );
}
