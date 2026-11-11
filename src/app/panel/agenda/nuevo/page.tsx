import { Suspense } from "react";
import type { Metadata } from "next";
import PaginaAgenda from "../page";
import { requerirProfesional } from "@/autorizacion/sesion";
import { esFechaIso, hoyEnZona } from "@/lib/fechas";
import { AltaTurnoDialogo } from "@/componentes/agenda/alta-turno-dialogo";
import { CargandoDialogoTurno } from "@/componentes/agenda/dialogo-nuevo-turno";
import { DialogoRuta } from "@/componentes/comunes/dialogo-ruta";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Nuevo turno" };

export default function PaginaNuevoTurno(propiedades: PageProps<"/panel/agenda/nuevo">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Contenido {...propiedades} /></Suspense>;
}

async function Contenido(propiedades: PageProps<"/panel/agenda/nuevo">) {
  const contexto = await requerirProfesional();
  const parametros = await propiedades.searchParams;
  const fecha = typeof parametros.fecha === "string" && esFechaIso(parametros.fecha) ? parametros.fecha : hoyEnZona(contexto.consultorio.zonaHoraria);
  return <>
    <PaginaAgenda {...propiedades} />
    <DialogoRuta titulo="Nuevo turno" descripcion="Elegí paciente, servicio, fecha y horario para agendar la consulta." formulario volverA={`/panel/agenda?vista=dia&fecha=${fecha}`}>
      <Suspense fallback={<CargandoDialogoTurno />}><AltaTurnoDialogo searchParams={propiedades.searchParams} /></Suspense>
    </DialogoRuta>
  </>;
}
