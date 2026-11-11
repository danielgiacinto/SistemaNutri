"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { esFechaIso, nombreMes } from "@/lib/fechas";
import { desplazarMesCaja } from "@/lib/caja-consultorio";
import { enlaceAgenda } from "@/componentes/agenda/filtrar-periodo";
import { Button } from "@/componentes/ui/button";

export function NavegacionCaja({ mes, parametros, cambiarMes, mesActual }: { mes: string; parametros: string; cambiarMes: (mes: string) => void; mesActual: string }) {
  const consulta = new URLSearchParams(parametros);
  const fecha = consulta.get("fechaAgenda") ?? "";
  const vista = consulta.get("vistaAgenda");
  const detalle = consulta.get("detalleAgenda") === "horarios" ? "detalle=horarios" : "";
  const origenValido = esFechaIso(fecha);
  return <section aria-label="Período de Finanzas" className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
    {origenValido && <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
      <Button asChild variant="ghost" size="sm"><Link href={enlaceAgenda(vista === "semana" || vista === "mes" ? vista : "dia", fecha, detalle)}><ArrowLeft aria-hidden="true" />Volver a mi agenda</Link></Button>
      <nav aria-label="Vista de la agenda" className="flex gap-1 rounded-xl bg-muted/50 p-1">
        {([{ valor: "dia", etiqueta: "Día", icono: CalendarClock }, { valor: "semana", etiqueta: "Semana", icono: CalendarRange }, { valor: "mes", etiqueta: "Mes", icono: CalendarDays }] as const).map(({ valor, etiqueta, icono: Icono }) => <Link key={valor} href={enlaceAgenda(valor, fecha, detalle)} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-accent"><Icono className="size-3.5" aria-hidden="true" />{etiqueta}</Link>)}
        <span aria-current="page" className="flex items-center gap-1.5 rounded-lg bg-card px-2 py-2 text-xs font-medium shadow-sm"><Wallet className="size-3.5" aria-hidden="true" />Caja</span>
      </nav>
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs text-muted-foreground">Mes seleccionado</p><h2 className="mt-1 text-lg font-semibold" aria-live="polite">{nombreMes(`${mes}-01`)}</h2></div>
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto">
        <Button variant="outline" size="sm" className="col-span-3 w-fit" onClick={() => cambiarMes(mesActual)}>Este mes</Button>
        <Button variant="outline" size="icon-sm" aria-label="Mes anterior de caja" onClick={() => cambiarMes(desplazarMesCaja(mes, -1))}><ChevronLeft aria-hidden="true" /></Button>
        <input type="month" aria-label="Elegir mes de Finanzas" value={mes} onChange={evento => cambiarMes(evento.target.value)} className="w-full min-w-0 rounded-lg border bg-background px-2 py-1.5 text-xs sm:w-auto" />
        <Button variant="outline" size="icon-sm" aria-label="Mes siguiente de caja" onClick={() => cambiarMes(desplazarMesCaja(mes, 1))}><ChevronRight aria-hidden="true" /></Button>
      </div>
    </div>
  </section>;
}
