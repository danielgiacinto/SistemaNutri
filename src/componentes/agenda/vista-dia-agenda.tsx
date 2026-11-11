"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { ArrowUpRight, CalendarCheck2, CalendarPlus, Clock3, LayoutList, Rows3 } from "lucide-react";
import { DIAS_SEMANA, ETIQUETAS_TIPO_CONSULTA, type VistaAgenda } from "@/configuracion/clinica";
import { nombreNatural } from "@/lib/antropometria";
import { formatearFechaIso, horaCortaEnZona, isoDiaSemana, minutosEntre } from "@/lib/fechas";
import { cn } from "@/lib/utilidades";
import { dineroFinanzas } from "@/tipos/finanzas";
import type { TurnoConPaciente } from "@/servicios/turnos";
import { InsigniaCobro, InsigniaTurno } from "@/componentes/comunes/insignia-estado";
import { CobroRapido } from "@/componentes/finanzas/cobro-rapido";
import { Button } from "@/componentes/ui/button";
import { contarTurnosPorDia, diasDeTiraAgenda, enlaceAgenda, enlaceTurnoAgenda } from "./filtrar-periodo";

type Propiedades = {
  fecha: string;
  fechaHoy: string;
  zonaHoraria: string;
  profesionalId: string;
  turnos: TurnoConPaciente[];
  turnosDelRango: TurnoConPaciente[];
  parametros: string;
  mostrarHorarios: boolean;
  alCambiarPresentacion: (horarios: boolean) => void;
  children: ReactNode;
};

export function VistaDiaAgenda({ fecha, fechaHoy, zonaHoraria, profesionalId, turnos, turnosDelRango, parametros, mostrarHorarios, alCambiarPresentacion, children }: Propiedades) {
  const tira = useRef<HTMLDivElement>(null);
  const seleccionado = useRef<HTMLAnchorElement>(null);
  const dias = diasDeTiraAgenda(fecha);
  const cantidades = contarTurnosPorDia(turnosDelRango, zonaHoraria);
  const ordenados = turnos.toSorted((a, b) => a.inicio.localeCompare(b.inicio));
  const cancelados = turnos.filter(turno => turno.estado === "cancelado").length;
  const cantidad = turnos.length - cancelados;

  useEffect(() => {
    const contenedor = tira.current;
    const dia = seleccionado.current;
    if (!contenedor || !dia) return;
    contenedor.scrollLeft = dia.offsetLeft - contenedor.offsetLeft - (contenedor.clientWidth - dia.offsetWidth) / 2;
  }, [fecha]);

  return <div className="min-w-0 space-y-5">
    <div className="rounded-2xl border bg-card p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
        <span className="font-medium">Tu agenda, día por día</span>
        <span>{formatearFechaIso(dias[0])} – {formatearFechaIso(dias[13])}</span>
      </div>
      <div ref={tira} className="relative overflow-x-auto pb-2 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]" role="navigation" aria-label="Elegir día de la agenda">
        <div className="grid auto-cols-[minmax(3.5rem,1fr)] grid-flow-col gap-1.5">
          {dias.map(dia => {
            const activo = dia === fecha;
            const hoy = dia === fechaHoy;
            const consultas = cantidades.get(dia) ?? 0;
            return <Link key={dia} ref={activo ? seleccionado : undefined} href={enlaceAgenda("dia", dia, parametros)} scroll={false} aria-current={activo ? "date" : undefined} aria-label={`${formatearFechaIso(dia, "full")}${hoy ? ", hoy" : ""}: ${consultas} ${consultas === 1 ? "consulta" : "consultas"}${activo ? ", seleccionado" : ""}`} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring", activo ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/70 bg-background/50 hover:border-primary/40 hover:bg-accent", hoy && !activo && "border-primary text-primary")}>
              <span className="text-[0.65rem] font-medium">{hoy ? "Hoy" : DIAS_SEMANA[isoDiaSemana(dia) - 1].corto}</span>
              <span className="text-xl font-semibold leading-none tabular-nums">{Number(dia.slice(8))}</span>
              <span className={cn("text-[0.6rem]", activo ? "text-primary-foreground/80" : "text-muted-foreground")}>{consultas} {consultas === 1 ? "turno" : "turnos"}</span>
            </Link>;
          })}
        </div>
      </div>
      <p className="mt-2 px-1 text-[0.65rem] text-muted-foreground">Los contadores excluyen los turnos cancelados. Deslizá para ver más días.</p>
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h3 className="flex items-center gap-2 font-semibold"><CalendarCheck2 className="size-4 text-primary" aria-hidden="true" />Consultas del día<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs tabular-nums text-primary">{cantidad}</span></h3><p className="mt-1 text-xs text-muted-foreground">{mostrarHorarios ? "Duraciones, disponibilidad y bloqueos en tu grilla horaria." : "En orden de horario, con la atención y el cobro a la vista."}{cancelados ? ` · ${cancelados} ${cancelados === 1 ? "cancelado" : "cancelados"}` : ""}</p></div>
      <div role="group" aria-label="Presentación del día" className="flex w-fit shrink-0 gap-1 rounded-xl border bg-card p-1">
        <button type="button" aria-pressed={!mostrarHorarios} onClick={() => alCambiarPresentacion(false)} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors", !mostrarHorarios ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}><LayoutList className="size-3.5" aria-hidden="true" />Consultas</button>
        <button type="button" aria-pressed={mostrarHorarios} onClick={() => alCambiarPresentacion(true)} className={cn("flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors", mostrarHorarios ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}><Rows3 className="size-3.5" aria-hidden="true" />Horarios</button>
      </div>
    </div>

    {mostrarHorarios ? children : ordenados.length ? <ol className="space-y-3" aria-label="Consultas ordenadas por horario">
      {ordenados.map(turno => <li key={turno.id}><TarjetaConsulta turno={turno} fecha={fecha} zona={zonaHoraria} propia={turno.profesional_id === profesionalId} parametros={parametros} /></li>)}
    </ol> : <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-5 py-10 text-center sm:py-12">
      <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CalendarPlus className="size-6" aria-hidden="true" /></span>
      <h4 className="font-semibold">Un día con espacio para tus pacientes</h4>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">No hay consultas para esta fecha. Agendá un turno o mirá los horarios disponibles.</p>
      <Button asChild className="mt-5 rounded-xl"><Link href={`/panel/agenda/nuevo?fecha=${fecha}`}><CalendarPlus aria-hidden="true" />Agendar un turno</Link></Button>
    </div>}
  </div>;
}

function TarjetaConsulta({ turno, fecha, zona, propia, vista = "dia", parametros = "" }: { turno: TurnoConPaciente; fecha: string; zona: string; propia: boolean; vista?: VistaAgenda; parametros?: string }) {
  const nombre = turno.pacientes ? nombreNatural(turno.pacientes) : "Paciente no disponible";
  const resumen = turno.resumenEconomico;
  const sinAsistencia = turno.estado === "cancelado" || turno.estado === "ausente";
  const anticipo = sinAsistencia && resumen && resumen.abonado > 0;
  const enlaceConsulta = enlaceTurnoAgenda(turno.id, vista, fecha, parametros);

  return <article className={cn("overflow-hidden rounded-2xl border bg-card transition-colors hover:border-primary/35", turno.estado === "confirmado" && "border-primary/30", turno.estado === "cancelado" && "bg-muted/20")} aria-label={`Consulta de ${nombre}`}>
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:gap-5 sm:p-5">
      <div className="flex shrink-0 items-center gap-3 sm:w-20 sm:flex-col sm:items-start sm:gap-1 sm:border-r sm:pr-4">
        <time dateTime={turno.inicio} className="text-xl font-semibold tracking-tight tabular-nums">{horaCortaEnZona(new Date(turno.inicio), zona)}</time>
        <span className="text-xs tabular-nums text-muted-foreground">hasta {horaCortaEnZona(new Date(turno.fin), zona)}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground sm:mt-2 sm:ml-0"><Clock3 className="size-3" aria-hidden="true" />{minutosEntre(new Date(turno.inicio), new Date(turno.fin))} min</span>
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="wrap-anywhere text-base font-semibold tracking-tight sm:text-lg"><Link href={enlaceConsulta} className="rounded-sm hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">{nombre}</Link></h4>
        <p className="mt-1 wrap-anywhere text-sm text-muted-foreground">{resumen?.nombreServicio ?? ETIQUETAS_TIPO_CONSULTA[turno.tipo]}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2"><InsigniaTurno estado={turno.estado} /><InsigniaCobro estado={turno.estadoEconomico ?? (propia ? "Sin configurar" : "Cobro de otro profesional")} /></div>
      </div>
      <div className="min-w-0 border-t pt-3 sm:max-w-52 sm:border-t-0 sm:pt-0 sm:text-right">
        {resumen ? sinAsistencia ? <><p className="text-xs text-muted-foreground">{anticipo ? "Anticipo a resolver" : "Sin deuda exigible"}</p>{anticipo ? <p className="mt-1 text-lg font-semibold tabular-nums">{dineroFinanzas(resumen.abonado, resumen.moneda)}</p> : null}</> : <><p className="text-xs text-muted-foreground">Total de la consulta</p><p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{dineroFinanzas(resumen.importe, resumen.moneda)}</p><p className={cn("mt-1 text-xs", resumen.saldo > 0 ? "text-advertencia-foreground dark:text-advertencia" : "text-muted-foreground")}>{resumen.saldo > 0 ? `Saldo: ${dineroFinanzas(resumen.saldo, resumen.moneda)}` : "Sin saldo pendiente"}</p></> : <p className="text-xs text-muted-foreground">{propia ? "Importe sin configurar" : "Gestión económica del profesional a cargo"}</p>}
      </div>
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-3 sm:px-5">
      <Button asChild variant="ghost" size="sm" className="rounded-xl"><Link href={enlaceConsulta} aria-label={`Ver consulta de ${nombre}`}>Ver consulta<ArrowUpRight aria-hidden="true" /></Link></Button>
      {propia ? <CobroRapido turnoId={turno.id} zona={zona} mostrarEstado={false} estado={turno.estadoEconomico} /> : <span className="text-xs text-muted-foreground">Otro profesional</span>}
    </footer>
  </article>;
}

export function DiaSeleccionadoMes({ fecha, zona, profesionalId, turnos, parametros }: { fecha: string; zona: string; profesionalId: string; turnos: TurnoConPaciente[]; parametros: string }) {
  return <section className="space-y-4" aria-label="Consultas del día seleccionado en el mes">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4"><div><h3 className="font-semibold">Día seleccionado · {formatearFechaIso(fecha)}</h3><p className="mt-1 text-xs text-muted-foreground">{turnos.filter(turno => turno.estado !== "cancelado").length} {turnos.filter(turno => turno.estado !== "cancelado").length === 1 ? "consulta" : "consultas"} · Los cancelados se conservan en el listado.</p></div><div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><Link href={enlaceAgenda("dia", fecha, parametros)}>Ver día completo</Link></Button><Button asChild size="sm"><Link href={`/panel/agenda/nuevo?fecha=${fecha}`}><CalendarPlus aria-hidden="true" />Agendar</Link></Button></div></header>
    {turnos.length ? <ol className="space-y-3">{turnos.toSorted((a, b) => a.inicio.localeCompare(b.inicio)).map(turno => <li key={turno.id}><TarjetaConsulta turno={turno} fecha={fecha} zona={zona} propia={turno.profesional_id === profesionalId} vista="mes" parametros={parametros} /></li>)}</ol> : <p className="rounded-xl border border-dashed bg-card p-5 text-sm text-muted-foreground">No hay consultas en el día seleccionado.</p>}
  </section>;
}
