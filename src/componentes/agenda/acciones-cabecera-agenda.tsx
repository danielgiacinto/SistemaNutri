"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarPlus, Clock, Tags } from "lucide-react";
import { esFechaIso } from "@/lib/fechas";
import { Button } from "@/componentes/ui/button";

export function AccionesCabeceraAgenda() {
  const parametros = useSearchParams();
  const fecha = parametros.get("fecha");
  return <>
    <Button asChild variant="outline"><Link href="/panel/configuracion/servicios"><Tags aria-hidden="true" />Servicios y precios</Link></Button>
    <Button asChild variant="outline"><Link href="/panel/agenda/disponibilidad"><Clock aria-hidden="true" />Horarios</Link></Button>
    <Button asChild><Link href={fecha && esFechaIso(fecha) ? `/panel/agenda/nuevo?fecha=${fecha}` : "/panel/agenda/nuevo"}><CalendarPlus aria-hidden="true" />Nuevo turno</Link></Button>
  </>;
}
