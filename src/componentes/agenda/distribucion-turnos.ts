import { fechaEnZona, horaCortaEnZona, minutosDesdeMedianoche } from "@/lib/fechas";

type Intervalo = { inicio: string; fin: string };

/** Minutos locales: el final a medianoche pertenece al borde inferior del día. */
export function intervaloDelDia(intervalo: Intervalo, dia: string, zona: string) {
  const inicio = new Date(intervalo.inicio);
  const fin = new Date(intervalo.fin);
  const diaInicio = fechaEnZona(inicio, zona);
  const diaFin = fechaEnZona(fin, zona);
  if (diaInicio > dia || diaFin < dia) return null;
  const desde = diaInicio < dia ? 0 : minutosDesdeMedianoche(horaCortaEnZona(inicio, zona));
  const hasta = diaFin > dia ? 1440 : minutosDesdeMedianoche(horaCortaEnZona(fin, zona));
  return hasta > desde ? { desde, hasta } : null;
}

export function distribuirTurnos<T extends Intervalo>(turnos: T[], dia: string, zona: string) {
  const intervalos = turnos.flatMap((turno) => {
    const intervalo = intervaloDelDia(turno, dia, zona);
    return intervalo ? [{ turno, ...intervalo, carril: 0, carriles: 1 }] : [];
  }).sort((a, b) => a.desde - b.desde || b.hasta - a.hasta);
  let grupo: typeof intervalos = [];
  let finales: number[] = [];
  let finGrupo = -1;
  function cerrarGrupo() {
    for (const intervalo of grupo) intervalo.carriles = finales.length;
    grupo = [];
    finales = [];
  }
  for (const intervalo of intervalos) {
    if (intervalo.desde >= finGrupo) cerrarGrupo();
    let carril = finales.findIndex((fin) => fin <= intervalo.desde);
    if (carril === -1) carril = finales.length;
    finales[carril] = intervalo.hasta;
    intervalo.carril = carril;
    grupo.push(intervalo);
    finGrupo = Math.max(...finales);
  }
  cerrarGrupo();
  return intervalos;
}

export function formatoMinutos(minutos: number) {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}
