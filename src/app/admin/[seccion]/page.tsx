import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarSeccionPendiente, seccionesPendientes } from "@/configuracion/navegacion";
import { SeccionEnConstruccion } from "@/componentes/comunes/seccion-en-construccion";

export function generateStaticParams() {
  return seccionesPendientes("admin").map(({ segmento }) => ({ seccion: segmento }));
}

export async function generateMetadata({ params }: PageProps<"/admin/[seccion]">): Promise<Metadata> {
  const { seccion } = await params;
  return { title: buscarSeccionPendiente("admin", seccion)?.titulo };
}

export default async function PaginaSeccionPendienteAdmin({ params }: PageProps<"/admin/[seccion]">) {
  const { seccion } = await params;
  const elemento = buscarSeccionPendiente("admin", seccion);
  if (!elemento) notFound();
  return <SeccionEnConstruccion seccion={elemento} />;
}
