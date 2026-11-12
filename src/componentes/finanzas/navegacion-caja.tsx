"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { esFechaIso } from "@/lib/fechas";
import { desplazarMesCaja } from "@/lib/caja-consultorio";
import { enlaceAgenda } from "@/componentes/agenda/filtrar-periodo";
import { Button } from "@/componentes/ui/button";

export function NavegacionCaja({ mes, parametros, cambiarMes, mesActual, acciones }: { mes: string; parametros: string; cambiarMes: (mes: string) => void; mesActual: string; acciones?: ReactNode }) {
  const consulta = new URLSearchParams(parametros);
  const fecha = consulta.get("fechaAgenda") ?? "";
  const vista = consulta.get("vistaAgenda");
  const detalle = consulta.get("detalleAgenda") === "horarios" ? "detalle=horarios" : "";
  const origenValido = esFechaIso(fecha);
  return <section aria-label="Período de Finanzas" className="space-y-3">
    {origenValido && <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <Button asChild variant="ghost" size="sm"><Link href={enlaceAgenda(vista === "semana" || vista === "mes" ? vista : "dia", fecha, detalle)}><ArrowLeft aria-hidden="true" />Volver a mi agenda</Link></Button>
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto">
        <Button variant="outline" size="sm" className="col-span-3 w-fit" onClick={() => cambiarMes(mesActual)}>Este mes</Button>
        <Button variant="outline" size="icon-sm" aria-label="Mes anterior de Finanzas" onClick={() => cambiarMes(desplazarMesCaja(mes, -1))}><ChevronLeft aria-hidden="true" /></Button>
        <input type="month" aria-label="Elegir mes de Finanzas" value={mes} onChange={evento => cambiarMes(evento.target.value)} className="w-full min-w-0 rounded-lg border bg-background px-2 py-1.5 text-xs sm:w-auto" />
        <Button variant="outline" size="icon-sm" aria-label="Mes siguiente de Finanzas" onClick={() => cambiarMes(desplazarMesCaja(mes, 1))}><ChevronRight aria-hidden="true" /></Button>
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  </section>;
}
