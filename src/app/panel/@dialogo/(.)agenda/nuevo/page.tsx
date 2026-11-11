import { Suspense } from "react";
import type { Metadata } from "next";
import { AltaTurnoDialogo } from "@/componentes/agenda/alta-turno-dialogo";
import { CargandoDialogoTurno } from "@/componentes/agenda/dialogo-nuevo-turno";
import { DialogoRuta } from "@/componentes/comunes/dialogo-ruta";

export const metadata: Metadata = { title: "Nuevo turno" };

export default function PaginaNuevoTurnoSuperpuesto({ searchParams }: PageProps<"/panel/agenda/nuevo">) {
  return <DialogoRuta titulo="Nuevo turno" descripcion="Elegí paciente, servicio, fecha y horario para agendar la consulta." formulario>
    <Suspense fallback={<CargandoDialogoTurno />}><AltaTurnoDialogo searchParams={searchParams} /></Suspense>
  </DialogoRuta>;
}
