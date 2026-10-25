import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarSeccionPendiente, seccionesPendientes } from "@/configuracion/navegacion";
import { SeccionEnConstruccion } from "@/componentes/comunes/seccion-en-construccion";

export function generateStaticParams() {
  return seccionesPendientes("paciente").map(({ segmento }) => ({ seccion: segmento }));
}

export async function generateMetadata({ params }: PageProps<"/portal/[seccion]">): Promise<Metadata> {
  const { seccion } = await params;
  return { title: buscarSeccionPendiente("paciente", seccion)?.titulo };
}

export default async function PaginaSeccionPendientePortal({ params }: PageProps<"/portal/[seccion]">) {
  const { seccion } = await params;
  const elemento = buscarSeccionPendiente("paciente", seccion);
  if (!elemento) notFound();
  return <SeccionEnConstruccion seccion={elemento} />;
}
