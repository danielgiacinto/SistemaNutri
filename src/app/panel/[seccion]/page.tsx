import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarSeccionPendiente, seccionesPendientes } from "@/configuracion/navegacion";
import { SeccionEnConstruccion } from "@/componentes/comunes/seccion-en-construccion";

// Las rutas definidas explícitamente (por ejemplo /panel/configuracion) tienen prioridad
// sobre este segmento dinámico; al implementar un módulo se agrega su propia carpeta.
export function generateStaticParams() {
  return seccionesPendientes("profesional").map(({ segmento }) => ({ seccion: segmento }));
}

export async function generateMetadata({ params }: PageProps<"/panel/[seccion]">): Promise<Metadata> {
  const { seccion } = await params;
  return { title: buscarSeccionPendiente("profesional", seccion)?.titulo };
}

export default async function PaginaSeccionPendiente({ params }: PageProps<"/panel/[seccion]">) {
  const { seccion } = await params;
  const elemento = buscarSeccionPendiente("profesional", seccion);
  if (!elemento) notFound();
  return <SeccionEnConstruccion seccion={elemento} />;
}
