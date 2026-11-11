import { Suspense } from "react";
import type { Metadata } from "next";
import PaginaAgenda from "../page";
import { AltaTurnoDialogo } from "@/componentes/agenda/alta-turno-dialogo";
import { CargandoDialogoTurno } from "@/componentes/agenda/dialogo-nuevo-turno";

export const metadata: Metadata = { title: "Nuevo turno" };

export default function PaginaNuevoTurno(propiedades: PageProps<"/panel/agenda/nuevo">) {
  return <>
    <PaginaAgenda {...propiedades} />
    <Suspense fallback={<CargandoDialogoTurno volverA="/panel/agenda" />}>
      <AltaTurnoDialogo searchParams={propiedades.searchParams} entradaDirecta />
    </Suspense>
  </>;
}
