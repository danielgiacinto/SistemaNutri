import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarPlantillasPlanes } from "@/servicios/planes-visuales";
import { esquemaUuid } from "@/esquemas/comunes";
import { EditorPlanVisual } from "@/componentes/planes/editor-plan-visual";
import { Volver } from "@/componentes/comunes/volver";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Editar plantilla" };
export default function PaginaPlantilla({ params }: PageProps<"/panel/planes/plantillas/[plantillaId]">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Contenido params={params} /></Suspense>;
}
async function Contenido({ params }: Pick<PageProps<"/panel/planes/plantillas/[plantillaId]">, "params">) {
  const contexto = await requerirProfesional();
  const { plantillaId } = await params;
  if (!esquemaUuid.safeParse(plantillaId).success) notFound();
  const plantillas = await listarPlantillasPlanes(await crearClienteServidor());
  const plantilla = plantillas.find(p => p.id === plantillaId && !p.base);
  if (!plantilla) notFound();
  return <div className="space-y-5"><Volver href="/panel/planes" etiqueta="Volver a mis plantillas" /><h1 className="sr-only">Editar {plantilla.titulo}</h1><EditorPlanVisual key={plantilla.id} id={plantilla.id} modo="plantilla" revision={plantilla.version} titulo={plantilla.titulo} indicaciones={plantilla.indicaciones} documento={plantilla.documento} profesional={`${contexto.nombre} ${contexto.apellido}`} /></div>;
}
