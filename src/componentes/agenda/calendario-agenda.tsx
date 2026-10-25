import Link from "next/link";
import { cn } from "@/lib/utilidades";
import { DIAS_SEMANA, ETIQUETAS_ESTADO_TURNO, ranurasAgenda, type VistaAgenda } from "@/configuracion/clinica";
import {
  agregarDias,
  fechaEnZona,
  formatearFechaIso,
  grillaMes,
  horaCortaEnZona,
  inicioDeMes,
  inicioDeSemana,
  instanteDesdeLocal,
  isoDiaSemana,
  minutosDesdeMedianoche,
  nombreMes,
} from "@/lib/fechas";
import { nombreNatural } from "@/lib/antropometria";
import type { BloqueoAgenda, HorarioAtencion } from "@/tipos/entidades";
import type { TurnoConPaciente } from "@/servicios/turnos";

type Propiedades = {
  vista: VistaAgenda;
  fecha: string;
  zonaHoraria: string;
  turnos: TurnoConPaciente[];
  horarios: HorarioAtencion[];
  bloqueos: BloqueoAgenda[];
};

const COLOR_ESTADO: Record<string, string> = {
  programado: "border-border bg-card",
  confirmado: "border-primary/40 bg-accent",
  completado: "border-exito/30 bg-exito/10",
  cancelado: "border-border bg-muted text-muted-foreground line-through",
  ausente: "border-advertencia/40 bg-advertencia/10",
};

function hrefAgenda(vista: VistaAgenda, fecha: string) {
  return `/panel/agenda?vista=${vista}&fecha=${fecha}`;
}

export function CalendarioAgenda({ vista, fecha, zonaHoraria, turnos, horarios, bloqueos }: Propiedades) {
  const ranuras = ranurasAgenda();
  const diasSemana = Array.from({ length: 7 }, (_, indice) => agregarDias(inicioDeSemana(fecha), indice));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {(["dia", "semana", "mes"] as const).map((opcion) => (
            <Link
              key={opcion}
              href={hrefAgenda(opcion, fecha)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium capitalize",
                vista === opcion ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opcion === "dia" ? "Día" : opcion === "semana" ? "Semana" : "Mes"}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link className="rounded-lg border px-3 py-1.5 text-sm" href={hrefAgenda(vista, fechaAnterior(vista, fecha))}>
            Anterior
          </Link>
          <p className="min-w-40 text-center text-sm font-medium">
            {vista === "mes" ? nombreMes(fecha) : vista === "semana" ? `Semana del ${formatearFechaIso(diasSemana[0])}` : formatearFechaIso(fecha, "full")}
          </p>
          <Link className="rounded-lg border px-3 py-1.5 text-sm" href={hrefAgenda(vista, fechaSiguiente(vista, fecha))}>
            Siguiente
          </Link>
        </div>
      </div>

      {vista === "mes" ? (
        <VistaMes fecha={fecha} zonaHoraria={zonaHoraria} turnos={turnos} />
      ) : vista === "semana" ? (
        <VistaSemana
          dias={diasSemana}
          ranuras={ranuras}
          zonaHoraria={zonaHoraria}
          turnos={turnos}
          horarios={horarios}
          bloqueos={bloqueos}
        />
      ) : (
        <VistaDia
          fecha={fecha}
          ranuras={ranuras}
          zonaHoraria={zonaHoraria}
          turnos={turnos}
          horarios={horarios}
          bloqueos={bloqueos}
        />
      )}
    </div>
  );
}

function fechaAnterior(vista: VistaAgenda, fecha: string) {
  if (vista === "dia") return agregarDias(fecha, -1);
  if (vista === "semana") return agregarDias(fecha, -7);
  const [anio, mes] = inicioDeMes(fecha).split("-").map(Number);
  return mes === 1 ? `${anio - 1}-12-01` : `${anio}-${String(mes - 1).padStart(2, "0")}-01`;
}

function fechaSiguiente(vista: VistaAgenda, fecha: string) {
  if (vista === "dia") return agregarDias(fecha, 1);
  if (vista === "semana") return agregarDias(fecha, 7);
  const [anio, mes] = inicioDeMes(fecha).split("-").map(Number);
  return mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, "0")}-01`;
}

function VistaMes({ fecha, zonaHoraria, turnos }: { fecha: string; zonaHoraria: string; turnos: TurnoConPaciente[] }) {
  const celdas = grillaMes(fecha);
  const mesActual = inicioDeMes(fecha).slice(0, 7);
  const porDia = new Map<string, TurnoConPaciente[]>();
  for (const turno of turnos) {
    const dia = fechaEnZona(new Date(turno.inicio), zonaHoraria);
    const lista = porDia.get(dia) ?? [];
    lista.push(turno);
    porDia.set(dia, lista);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border">
      <div className="grid min-w-[40rem] grid-cols-7">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia.iso} className="border-b bg-muted/40 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {dia.corto}
          </div>
        ))}
        {celdas.map((dia) => {
          const delMes = dia.startsWith(mesActual);
          const eventos = (porDia.get(dia) ?? []).filter((turno) => turno.estado !== "cancelado");
          return (
            <Link
              key={dia}
              href={hrefAgenda("dia", dia)}
              className={cn("min-h-24 border-b border-r p-2 text-left text-sm last:border-r-0 hover:bg-muted/40", !delMes && "bg-muted/20 text-muted-foreground")}
            >
              <span className="font-medium">{Number(dia.slice(8))}</span>
              <ul className="mt-1 space-y-1">
                {eventos.slice(0, 3).map((turno) => (
                  <li key={turno.id} className="truncate rounded bg-accent px-1 py-0.5 text-[0.7rem]">
                    {horaCortaEnZona(new Date(turno.inicio), zonaHoraria)} {turno.pacientes ? nombreNatural(turno.pacientes) : "Turno"}
                  </li>
                ))}
                {eventos.length > 3 && <li className="text-[0.7rem] text-muted-foreground">+{eventos.length - 3}</li>}
              </ul>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function VistaSemana({
  dias,
  ranuras,
  zonaHoraria,
  turnos,
  horarios,
  bloqueos,
}: {
  dias: string[];
  ranuras: string[];
  zonaHoraria: string;
  turnos: TurnoConPaciente[];
  horarios: HorarioAtencion[];
  bloqueos: BloqueoAgenda[];
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <div className="grid min-w-[64rem] grid-cols-[4.5rem_repeat(7,minmax(0,1fr))]">
        <div className="border-b bg-muted/40" />
        {dias.map((dia, indice) => (
          <div key={dia} className="border-b border-l bg-muted/40 px-2 py-2 text-center">
            <p className="text-xs text-muted-foreground">{DIAS_SEMANA[indice]?.corto}</p>
            <Link href={hrefAgenda("dia", dia)} className="text-sm font-semibold hover:text-primary">
              {Number(dia.slice(8))}
            </Link>
          </div>
        ))}
        {ranuras.map((hora) => (
          <Ranura key={hora} hora={hora} dias={dias} zonaHoraria={zonaHoraria} turnos={turnos} horarios={horarios} bloqueos={bloqueos} />
        ))}
      </div>
    </div>
  );
}

function Ranura({
  hora,
  dias,
  zonaHoraria,
  turnos,
  horarios,
  bloqueos,
}: {
  hora: string;
  dias: string[];
  zonaHoraria: string;
  turnos: TurnoConPaciente[];
  horarios: HorarioAtencion[];
  bloqueos: BloqueoAgenda[];
}) {
  return (
    <>
      <div className="border-t px-1 py-2 text-right text-[0.7rem] text-muted-foreground">{hora}</div>
      {dias.map((dia) => {
        const iso = isoDiaSemana(dia);
        const dentroDeHorario = estaDentroDeHorario(hora, iso, horarios);
        const turno = turnos.find(
          (item) =>
            fechaEnZona(new Date(item.inicio), zonaHoraria) === dia &&
            horaCortaEnZona(new Date(item.inicio), zonaHoraria) === hora,
        );
        return (
          <CeldaRanura
            key={`${dia}-${hora}`}
            dia={dia}
            hora={hora}
            turno={turno}
            bloqueado={estaBloqueada(dia, hora, zonaHoraria, bloqueos)}
            disponible={dentroDeHorario}
          />
        );
      })}
    </>
  );
}

function estaBloqueada(dia: string, hora: string, zonaHoraria: string, bloqueos: BloqueoAgenda[]): boolean {
  const instante = instanteDesdeLocal(dia, hora, zonaHoraria).getTime();
  return bloqueos.some(
    (bloqueo) => instante >= new Date(bloqueo.inicio).getTime() && instante < new Date(bloqueo.fin).getTime(),
  );
}

function estaDentroDeHorario(hora: string, diaIso: number, horarios: HorarioAtencion[]): boolean {
  if (horarios.length === 0) return true;
  const minutos = minutosDesdeMedianoche(hora);
  return horarios.some(
    (horario) =>
      horario.dia_semana === diaIso &&
      minutosDesdeMedianoche(horario.hora_inicio) <= minutos &&
      minutosDesdeMedianoche(horario.hora_fin) > minutos,
  );
}

function CeldaRanura({
  dia,
  hora,
  turno,
  bloqueado,
  disponible,
}: {
  dia: string;
  hora: string;
  turno?: TurnoConPaciente;
  bloqueado: boolean;
  disponible: boolean;
}) {
  if (turno) {
    return (
      <Link
        href={`/panel/agenda/${turno.id}`}
        className={cn("block min-h-12 border-t border-l p-1 text-xs", COLOR_ESTADO[turno.estado])}
      >
        <span className="font-medium">{turno.pacientes ? nombreNatural(turno.pacientes) : "Turno"}</span>
        <span className="mt-0.5 block text-[0.65rem]">{ETIQUETAS_ESTADO_TURNO[turno.estado]}</span>
      </Link>
    );
  }
  if (bloqueado) {
    return <div className="min-h-12 border-t border-l bg-muted/60 p-1 text-[0.65rem] text-muted-foreground">Bloqueado</div>;
  }
  if (!disponible) {
    return <div className="min-h-12 border-t border-l bg-muted/30" />;
  }
  return (
    <Link
      href={`/panel/agenda/nuevo?fecha=${dia}&hora=${hora}`}
      className="flex min-h-12 items-center justify-center border-t border-l text-[0.65rem] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      <span className="sr-only">Agendar el {dia} a las {hora}</span>
    </Link>
  );
}

function VistaDia({
  fecha,
  ranuras,
  zonaHoraria,
  turnos,
  horarios,
  bloqueos,
}: {
  fecha: string;
  ranuras: string[];
  zonaHoraria: string;
  turnos: TurnoConPaciente[];
  horarios: HorarioAtencion[];
  bloqueos: BloqueoAgenda[];
}) {
  const iso = isoDiaSemana(fecha);
  return (
    <ol className="divide-y rounded-2xl border">
      {ranuras.map((hora) => {
        const turno = turnos.find(
          (item) => fechaEnZona(new Date(item.inicio), zonaHoraria) === fecha && horaCortaEnZona(new Date(item.inicio), zonaHoraria) === hora,
        );
        const disponible = estaDentroDeHorario(hora, iso, horarios);
        const bloqueado = estaBloqueada(fecha, hora, zonaHoraria, bloqueos);
        return (
          <li key={hora} className="grid grid-cols-[4.5rem_minmax(0,1fr)]">
            <p className="px-3 py-3 text-right text-xs text-muted-foreground">{hora}</p>
            {turno ? (
              <Link href={`/panel/agenda/${turno.id}`} className={cn("m-1 rounded-xl border px-3 py-2", COLOR_ESTADO[turno.estado])}>
                <p className="font-medium">{turno.pacientes ? nombreNatural(turno.pacientes) : "Turno"}</p>
                <p className="text-xs text-muted-foreground">
                  {horaCortaEnZona(new Date(turno.inicio), zonaHoraria)} – {horaCortaEnZona(new Date(turno.fin), zonaHoraria)} · {ETIQUETAS_ESTADO_TURNO[turno.estado]}
                </p>
              </Link>
            ) : bloqueado ? (
              <p className="m-1 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">Horario bloqueado</p>
            ) : disponible ? (
              <Link href={`/panel/agenda/nuevo?fecha=${fecha}&hora=${hora}`} className="m-1 rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
                Agendar
              </Link>
            ) : (
              <p className="m-1 px-3 py-2 text-sm text-muted-foreground">Fuera de horario</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
