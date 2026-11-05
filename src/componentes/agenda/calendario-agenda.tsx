import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utilidades";
import { DIAS_SEMANA, ETIQUETAS_ESTADO_TURNO, type VistaAgenda } from "@/configuracion/clinica";
import { agregarDias, fechaEnZona, formatearFechaIso, grillaMes, horaCortaEnZona, inicioDeMes, inicioDeSemana, instanteDesdeLocal, isoDiaSemana, minutosDesdeMedianoche, nombreMes } from "@/lib/fechas";
import { nombreNatural } from "@/lib/antropometria";
import type { BloqueoAgenda, HorarioAtencion } from "@/tipos/entidades";
import type { TurnoConPaciente } from "@/servicios/turnos";
import { distribuirTurnos, formatoMinutos, intervaloDelDia } from "./distribucion-turnos";
import { ContenedorHorarioAgenda, IndicadorHoraAgenda, RelojAgenda } from "./reloj-agenda";

type Propiedades = { vista: VistaAgenda; fecha: string; fechaHoy: string; horaHoy: string; zonaHoraria: string; turnos: TurnoConPaciente[]; horarios: HorarioAtencion[]; bloqueos: BloqueoAgenda[] };
const COLOR_ESTADO: Record<string, string> = {
  programado: "border-primary/25 bg-accent/70 text-accent-foreground",
  confirmado: "border-primary/50 bg-accent text-accent-foreground",
  completado: "border-exito/30 bg-exito/10 text-foreground",
  cancelado: "border-border bg-muted text-muted-foreground line-through",
  ausente: "border-advertencia/40 bg-advertencia/10 text-foreground",
};
function hrefAgenda(vista: VistaAgenda, fecha: string) { return `/panel/agenda?vista=${vista}&fecha=${fecha}`; }
function cambiarFecha(vista: VistaAgenda, fecha: string, direccion: number) {
  if (vista !== "mes") return agregarDias(fecha, direccion * (vista === "semana" ? 7 : 1));
  const [anio, mes] = inicioDeMes(fecha).split("-").map(Number);
  const siguiente = new Date(Date.UTC(anio, mes - 1 + direccion, 1));
  return siguiente.toISOString().slice(0, 10);
}

export function CalendarioAgenda(propiedades: Propiedades) {
  const { vista, fecha, fechaHoy, horaHoy, zonaHoraria, turnos } = propiedades;
  const dias = Array.from({ length: 7 }, (_, indice) => agregarDias(inicioDeSemana(fecha), indice));
  const cantidad = turnos.filter((turno) => turno.estado !== "cancelado" && (vista !== "mes" || fechaEnZona(new Date(turno.inicio), zonaHoraria).startsWith(fecha.slice(0, 7)))).length;
  return (
    <section className="min-w-0 space-y-5" aria-label="Calendario de turnos">
      <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Vista de la agenda" className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1 sm:w-64">
            {(["dia", "semana", "mes"] as const).map((opcion) => <Link key={opcion} href={hrefAgenda(opcion, fecha)} aria-current={vista === opcion ? "page" : undefined} className={cn("rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors", vista === opcion ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{opcion === "dia" ? "Día" : opcion === "semana" ? "Semana" : "Mes"}</Link>)}
          </nav>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Link href={hrefAgenda(vista, fechaHoy)} className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-accent">Hoy</Link>
            <div className="flex items-center gap-1">
              <Link href={hrefAgenda(vista, cambiarFecha(vista, fecha, -1))} aria-label="Período anterior" className="flex size-9 items-center justify-center rounded-lg border hover:bg-accent"><ChevronLeft className="size-4" aria-hidden="true" /></Link>
              <Link href={hrefAgenda(vista, cambiarFecha(vista, fecha, 1))} aria-label="Período siguiente" className="flex size-9 items-center justify-center rounded-lg border hover:bg-accent"><ChevronRight className="size-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><h2 className="text-lg font-semibold tracking-tight first-letter:uppercase sm:text-xl">{vista === "mes" ? nombreMes(fecha) : vista === "semana" ? `${formatearFechaIso(dias[0])} – ${formatearFechaIso(dias[6])}` : formatearFechaIso(fecha, "full")}</h2><p className="mt-1 text-xs text-muted-foreground">{cantidad} {cantidad === 1 ? "turno en este período" : "turnos en este período"}{vista === "semana" ? " · Elegí un día para ver sus horarios" : ""}</p></div>
          <div className="shrink-0"><RelojAgenda zona={zonaHoraria} fechaInicial={fechaHoy} horaInicial={horaHoy} /></div>
        </div>
      </div>
      {vista === "mes" ? <VistaMes {...propiedades} /> : vista === "semana" ? <><div className="xl:hidden"><ResumenSemana {...propiedades} dias={dias} /></div><div className="hidden xl:block"><GrillaHoraria {...propiedades} dias={dias} /></div></> : <GrillaHoraria {...propiedades} dias={[fecha]} />}
      {vista !== "mes" ? <p className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" />Hora actual</span><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground/30" />Fuera de horario o pasado</span><span>Seleccioná un espacio libre para agendar.</span></p> : null}
    </section>
  );
}

function VistaMes({ fecha, fechaHoy, zonaHoraria, turnos }: Propiedades) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="grid grid-cols-7">
        {DIAS_SEMANA.map((dia) => <div key={dia.iso} className="border-b bg-muted/40 py-3 text-center text-[0.65rem] font-semibold text-muted-foreground sm:text-xs"><span className="sm:hidden">{dia.corto}</span><span className="hidden sm:inline">{dia.etiqueta}</span></div>)}
        {grillaMes(fecha).map((dia) => {
          const eventos = turnos.filter((turno) => fechaEnZona(new Date(turno.inicio), zonaHoraria) === dia && turno.estado !== "cancelado");
          const hoy = dia === fechaHoy;
          return <Link key={dia} href={hrefAgenda("dia", dia)} aria-current={hoy ? "date" : undefined} aria-label={`${formatearFechaIso(dia, "full")}, ${eventos.length} ${eventos.length === 1 ? "turno" : "turnos"}`} className={cn("min-h-20 min-w-0 border-r border-b border-border/60 p-1.5 transition-colors nth-[7n]:border-r-0 hover:bg-accent/40 sm:min-h-32 sm:p-2", !dia.startsWith(fecha.slice(0, 7)) && "bg-muted/20 text-muted-foreground", hoy && "bg-accent/35")}>
            <span className={cn("mx-auto flex size-7 items-center justify-center rounded-full text-xs font-semibold sm:mx-0", hoy && "bg-primary text-primary-foreground")}>{Number(dia.slice(8))}</span>
            <div className="mt-1.5 hidden space-y-1 sm:block">{eventos.slice(0, 2).map((turno) => <p key={turno.id} className="truncate rounded-md bg-accent px-1.5 py-1 text-[0.65rem] text-accent-foreground"><span className="font-semibold tabular-nums">{horaCortaEnZona(new Date(turno.inicio), zonaHoraria)}</span> {turno.pacientes ? nombreNatural(turno.pacientes) : "Turno"}<span className="block">{turno.estadoEconomico ?? "Sin configurar"}</span></p>)}{eventos.length > 2 ? <p className="px-1 text-[0.65rem] text-muted-foreground">+{eventos.length - 2} más</p> : null}</div>
            {eventos.length ? <span className="mt-2 flex items-center justify-center gap-1 text-[0.6rem] font-medium text-primary sm:hidden"><span className="size-1 rounded-full bg-primary" />{eventos.length}</span> : null}
          </Link>;
        })}
      </div>
    </div>
  );
}

function ResumenSemana({ dias, ...propiedades }: Propiedades & { dias: string[] }) {
  return <div className="space-y-3">{dias.map((dia) => {
    const turnos = propiedades.turnos.filter((turno) => fechaEnZona(new Date(turno.inicio), propiedades.zonaHoraria) === dia);
    const hoy = dia === propiedades.fechaHoy;
    return <article key={dia} className={cn("min-w-0 rounded-2xl border bg-card p-4", hoy && "border-primary/35")}>
      <div className="mb-3 flex items-center justify-between gap-2"><Link href={hrefAgenda("dia", dia)} className="flex min-w-0 items-center gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-lg font-semibold tabular-nums", hoy ? "bg-primary text-primary-foreground" : "bg-muted/70")}>{Number(dia.slice(8))}</span><span><span className="block text-sm font-semibold capitalize">{DIAS_SEMANA[isoDiaSemana(dia) - 1].etiqueta}{hoy ? " · Hoy" : ""}</span><span className="text-xs text-muted-foreground">{turnos.length} {turnos.length === 1 ? "turno" : "turnos"}</span></span></Link><Link href={hrefAgenda("dia", dia)} aria-label={`Ver horarios del ${formatearFechaIso(dia)}`} className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-accent"><ChevronRight className="size-4" aria-hidden="true" /></Link></div>
      {turnos.length ? <ul className="space-y-2">{turnos.map((turno) => <li key={turno.id}><Link href={`/panel/agenda/${turno.id}`} className={cn("flex min-w-0 items-start gap-3 rounded-xl border p-3", COLOR_ESTADO[turno.estado])}><span className="shrink-0 text-xs font-semibold tabular-nums">{horaCortaEnZona(new Date(turno.inicio), propiedades.zonaHoraria)}<span className="mt-1 block font-normal opacity-70">{horaCortaEnZona(new Date(turno.fin), propiedades.zonaHoraria)}</span></span><span className="min-w-0"><span className="block wrap-anywhere text-sm font-semibold">{turno.pacientes ? nombreNatural(turno.pacientes) : "Turno"}</span><span className="text-xs opacity-75">{ETIQUETAS_ESTADO_TURNO[turno.estado]} · {turno.estadoEconomico ?? "Sin configurar"}</span></span></Link></li>)}</ul> : <p className="rounded-xl bg-muted/35 px-3 py-3 text-xs text-muted-foreground">Sin turnos programados</p>}
    </article>;
  })}</div>;
}

function GrillaHoraria({ dias, ...propiedades }: Propiedades & { dias: string[] }) {
  const { zonaHoraria: zona, fechaHoy, horaHoy, turnos, horarios, bloqueos } = propiedades;
  let inicio = 7 * 60;
  let fin = 21 * 60;
  for (const dia of dias) {
    for (const evento of [...turnos, ...bloqueos]) {
      const intervalo = intervaloDelDia(evento, dia, zona);
      if (intervalo) { inicio = Math.min(inicio, Math.floor(intervalo.desde / 60) * 60); fin = Math.max(fin, Math.ceil(intervalo.hasta / 60) * 60); }
    }
    for (const horario of horarios.filter((horario) => horario.dia_semana === isoDiaSemana(dia))) {
      inicio = Math.min(inicio, Math.floor(minutosDesdeMedianoche(horario.hora_inicio) / 60) * 60);
      fin = Math.max(fin, Math.ceil(minutosDesdeMedianoche(horario.hora_fin) / 60) * 60);
    }
  }
  const minutosPorPixel = 60 / 96;
  const alto = (fin - inicio) / minutosPorPixel;
  const franjas = Array.from({ length: (fin - inicio) / 30 }, (_, indice) => inicio + indice * 30);
  const esDia = dias.length === 1;
  const primerTurno = dias.flatMap((dia) => distribuirTurnos(turnos, dia, zona)).sort((a, b) => a.desde - b.desde)[0];
  const minutoDestacado = dias.includes(fechaHoy) ? minutosDesdeMedianoche(horaHoy) : primerTurno?.desde ?? inicio;
  return <ContenedorHorarioAgenda referencia={dias.join(",")} desplazamientoInicial={(minutoDestacado - inicio) / minutosPorPixel}>
    <div className="grid min-w-0" style={{ gridTemplateColumns: `3.5rem repeat(${dias.length}, minmax(0, 1fr))` }}>
      <div className="sticky top-0 z-30 flex items-center justify-center border-b bg-card py-3 text-[0.6rem] font-semibold text-muted-foreground">HORA</div>
      {dias.map((dia) => <Link key={dia} href={hrefAgenda("dia", dia)} aria-current={dia === fechaHoy ? "date" : undefined} className={cn("sticky top-0 z-30 flex items-center justify-center gap-2 border-b border-l px-1 py-3 text-xs", dia === fechaHoy ? "bg-accent text-accent-foreground" : "bg-card")}><CalendarDays className="size-3.5 shrink-0" aria-hidden="true" /><span className="font-medium">{esDia ? "Tus horarios" : DIAS_SEMANA[isoDiaSemana(dia) - 1].corto}</span>{!esDia ? <span className={cn("flex size-6 items-center justify-center rounded-full font-semibold", dia === fechaHoy && "bg-primary text-primary-foreground")}>{Number(dia.slice(8))}</span> : null}</Link>)}
      <div className="relative bg-card" style={{ height: alto }}>{franjas.map((minutos) => <span key={minutos} className={cn("absolute right-2 text-[0.65rem] tabular-nums", minutos % 60 === 0 ? "font-semibold text-foreground" : "text-muted-foreground")} style={{ top: (minutos - inicio) / minutosPorPixel + 7 }}>{formatoMinutos(minutos)}</span>)}</div>
      {dias.map((dia) => <div key={dia} className={cn("relative min-w-0 border-l", dia === fechaHoy && "bg-accent/10")} style={{ height: alto }}>
        {franjas.map((minutos) => {
          const hora = formatoMinutos(minutos);
          const instante = instanteDesdeLocal(dia, hora, zona).getTime();
          const final = instante + 30 * 60_000;
          const ocupado = turnos.some((turno) => turno.estado !== "cancelado" && new Date(turno.inicio).getTime() < final && new Date(turno.fin).getTime() > instante);
          const bloqueado = bloqueos.some((bloqueo) => new Date(bloqueo.inicio).getTime() < final && new Date(bloqueo.fin).getTime() > instante);
          const disponible = horarios.length === 0 || horarios.some((horario) => horario.dia_semana === isoDiaSemana(dia) && minutosDesdeMedianoche(horario.hora_inicio) <= minutos && minutosDesdeMedianoche(horario.hora_fin) >= minutos + 30);
          const pasado = dia < fechaHoy || (dia === fechaHoy && hora <= horaHoy);
          const clase = cn("absolute right-0 left-0 border-t", minutos % 60 === 0 ? "border-border/70" : "border-border/35", (bloqueado || !disponible || pasado) && "bg-muted/35");
          const estilo = { top: (minutos - inicio) / minutosPorPixel, height: 30 / minutosPorPixel };
          return ocupado || bloqueado || !disponible || pasado ? <div key={hora} className={clase} style={estilo}>{bloqueado && esDia ? <span className="px-3 text-[0.65rem] leading-10 text-muted-foreground">Horario bloqueado</span> : null}</div> : <Link key={hora} href={`/panel/agenda/nuevo?fecha=${dia}&hora=${hora}`} aria-label={`Agendar el ${formatearFechaIso(dia)} a las ${hora}`} className={cn(clase, "group flex items-center justify-center text-muted-foreground/40 transition-colors hover:bg-accent hover:text-primary")} style={estilo}><Plus className="size-4 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" /></Link>;
        })}
        {distribuirTurnos(turnos, dia, zona).map(({ turno, desde, hasta, carril, carriles }, indice) => <Link key={turno.id} data-primer-turno={indice === 0 || undefined} href={`/panel/agenda/${turno.id}`} title={`${horaCortaEnZona(new Date(turno.inicio), zona)} – ${horaCortaEnZona(new Date(turno.fin), zona)} · ${turno.pacientes ? nombreNatural(turno.pacientes) : "Turno"} · ${ETIQUETAS_ESTADO_TURNO[turno.estado]} · ${turno.estadoEconomico ?? "Sin configurar"}`} className={cn("absolute z-10 overflow-hidden rounded-lg border border-l-[3px] px-2 py-1.5 shadow-xs transition-shadow hover:z-20 hover:shadow-md focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring", COLOR_ESTADO[turno.estado])} style={{ top: (desde - inicio) / minutosPorPixel + 2, height: Math.max((hasta - desde) / minutosPorPixel - 4, 24), left: `calc(${carril / carriles * 100}% + 3px)`, width: `calc(${100 / carriles}% - 6px)` }}>
          <span className="block truncate text-[0.65rem] font-semibold tabular-nums">{horaCortaEnZona(new Date(turno.inicio), zona)} – {horaCortaEnZona(new Date(turno.fin), zona)}</span>
          <span className={cn("block truncate font-semibold", esDia ? "text-sm" : "text-xs")}>{turno.pacientes ? nombreNatural(turno.pacientes) : "Turno"}</span>
          {hasta - desde >= 45 ? <span className="mt-1 flex items-center gap-1 text-[0.65rem] opacity-75"><Users className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{ETIQUETAS_ESTADO_TURNO[turno.estado]} · {turno.estadoEconomico ?? "Sin configurar"}</span></span> : null}
        </Link>)}
        <IndicadorHoraAgenda dia={dia} inicio={inicio} fin={fin} zona={zona} fechaInicial={fechaHoy} horaInicial={horaHoy} />
      </div>)}
    </div>
  </ContenedorHorarioAgenda>;
}
