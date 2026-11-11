import { Suspense } from "react";
import type { Metadata } from "next";
import { AltaTurnoDialogo } from "@/componentes/agenda/alta-turno-dialogo";
import { CargandoDialogoTurno } from "@/componentes/agenda/dialogo-nuevo-turno";

export const metadata: Metadata = { title: "Nuevo turno" };

export default function PaginaNuevoTurnoSuperpuesto({ searchParams }: PageProps<"/panel/agenda/nuevo">) {
  return <Suspense fallback={<CargandoDialogoTurno />}><AltaTurnoDialogo searchParams={searchParams} /></Suspense>;
}
