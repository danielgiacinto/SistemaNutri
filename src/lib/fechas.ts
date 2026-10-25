import { LOCALE_PREDETERMINADO } from "@/configuracion/producto";

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function rellenar(numero: number, tamano = 2): string {
  return String(numero).padStart(tamano, "0");
}

export function esFechaIso(valor: string): boolean {
  if (!FORMATO_FECHA.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const utc = new Date(Date.UTC(anio, mes - 1, dia));
  return utc.getUTCFullYear() === anio && utc.getUTCMonth() === mes - 1 && utc.getUTCDate() === dia;
}

export function partesEnZona(instante: Date, zona: string) {
  const formateador = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const partes = Object.fromEntries(formateador.formatToParts(instante).map((parte) => [parte.type, parte.value]));
  return {
    anio: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    hora: Number(partes.hour),
    minuto: Number(partes.minute),
  };
}

export function fechaIsoDesdePartes(anio: number, mes: number, dia: number): string {
  return `${anio}-${rellenar(mes)}-${rellenar(dia)}`;
}

export function hoyEnZona(zona: string, referencia = new Date()): string {
  const partes = partesEnZona(referencia, zona);
  return fechaIsoDesdePartes(partes.anio, partes.mes, partes.dia);
}

export function horaEnZona(zona: string, referencia = new Date()): string {
  const partes = partesEnZona(referencia, zona);
  return `${rellenar(partes.hora)}:${rellenar(partes.minuto)}`;
}

/**
 * Interpreta una fecha y una hora de reloj de pared en `zona` y devuelve el instante UTC.
 * Argentina no usa DST; en zonas con DST, una hora inexistente o ambigua se resuelve hacia el desplazamiento cercano.
 */
export function instanteDesdeLocal(fecha: string, hora: string, zona: string): Date {
  if (!esFechaIso(fecha) || !FORMATO_HORA.test(hora)) {
    throw new Error("fecha_hora_invalida");
  }
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [horas, minutos] = hora.split(":").map(Number);
  const utc = new Date(Date.UTC(anio, mes - 1, dia, horas, minutos, 0));
  const visto = partesEnZona(utc, zona);
  const deseadoMinutos = Date.UTC(anio, mes - 1, dia, horas, minutos) / 60_000;
  const vistoMinutos = Date.UTC(visto.anio, visto.mes - 1, visto.dia, visto.hora, visto.minuto) / 60_000;
  return new Date(utc.getTime() + (deseadoMinutos - vistoMinutos) * 60_000);
}

export function inicioDelDia(fecha: string, zona: string): Date {
  return instanteDesdeLocal(fecha, "00:00", zona);
}

export function inicioDelDiaSiguiente(fecha: string, zona: string): Date {
  return instanteDesdeLocal(agregarDias(fecha, 1), "00:00", zona);
}

export function agregarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const utc = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return fechaIsoDesdePartes(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

export function agregarMinutos(instante: Date, minutos: number): Date {
  return new Date(instante.getTime() + minutos * 60_000);
}

/** Lunes de la semana ISO que contiene `fecha`. */
export function inicioDeSemana(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const utc = new Date(Date.UTC(anio, mes - 1, dia));
  const diaSemana = utc.getUTCDay();
  const iso = diaSemana === 0 ? 7 : diaSemana;
  return agregarDias(fecha, 1 - iso);
}

export function inicioDeMes(fecha: string): string {
  const [anio, mes] = fecha.split("-").map(Number);
  return fechaIsoDesdePartes(anio, mes, 1);
}

export function isoDiaSemana(fecha: string): number {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return diaSemana === 0 ? 7 : diaSemana;
}

export function esFinDeSemana(fecha: string): boolean {
  const iso = isoDiaSemana(fecha);
  return iso >= 6;
}

/** Grilla de 6 semanas (lunes a domingo) que cubre el mes de `fecha`. */
export function grillaMes(fecha: string): string[] {
  const primero = inicioDeMes(fecha);
  const [anio, mes] = primero.split("-").map(Number);
  const siguienteMes = mes === 12 ? fechaIsoDesdePartes(anio + 1, 1, 1) : fechaIsoDesdePartes(anio, mes + 1, 1);
  const ultimo = agregarDias(siguienteMes, -1);
  const inicio = inicioDeSemana(primero);
  const isoFin = isoDiaSemana(ultimo);
  const cierre = agregarDias(ultimo, 7 - isoFin);
  const dias: string[] = [];
  for (let actual = inicio; actual <= cierre; actual = agregarDias(actual, 1)) {
    dias.push(actual);
  }
  return dias;
}

export function ultimosDiasHabiles(fecha: string, cantidad: number): string[] {
  const resultado: string[] = [];
  let actual = fecha;
  while (resultado.length < cantidad) {
    if (!esFinDeSemana(actual)) resultado.push(actual);
    actual = agregarDias(actual, -1);
  }
  return resultado.reverse();
}

export function fechaEnZona(instante: Date, zona: string): string {
  const partes = partesEnZona(instante, zona);
  return fechaIsoDesdePartes(partes.anio, partes.mes, partes.dia);
}

export function horaCortaEnZona(instante: Date, zona: string): string {
  const partes = partesEnZona(instante, zona);
  return `${rellenar(partes.hora)}:${rellenar(partes.minuto)}`;
}

/** Normaliza `09:00:00` o `9:05` a `HH:MM` para comparar horas de PostgreSQL con las ranuras. */
export function horaCorta(valor: string): string {
  const [horas = "0", minutos = "0"] = valor.split(":");
  return `${rellenar(Number(horas) || 0)}:${rellenar(Number(minutos) || 0)}`;
}

export function minutosDesdeMedianoche(hora: string): number {
  const [horas, minutos] = horaCorta(hora).split(":").map(Number);
  return horas * 60 + minutos;
}

export function formatearFecha(instante: Date, zona: string, estilo: Intl.DateTimeFormatOptions["dateStyle"] = "medium"): string {
  return new Intl.DateTimeFormat(LOCALE_PREDETERMINADO, { dateStyle: estilo, timeZone: zona }).format(instante);
}

export function formatearFechaHora(instante: Date, zona: string): string {
  return new Intl.DateTimeFormat(LOCALE_PREDETERMINADO, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: zona,
    hourCycle: "h23",
  }).format(instante);
}

export function formatearFechaIso(fecha: string, estilo: Intl.DateTimeFormatOptions["dateStyle"] = "medium"): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE_PREDETERMINADO, { dateStyle: estilo, timeZone: "UTC" }).format(
    new Date(Date.UTC(anio, mes - 1, dia)),
  );
}

export function nombreMes(fecha: string): string {
  const [anio, mes] = fecha.split("-").map(Number);
  const texto = new Intl.DateTimeFormat(LOCALE_PREDETERMINADO, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(anio, mes - 1, 1)),
  );
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function minutosEntre(inicio: Date, fin: Date): number {
  return Math.round((fin.getTime() - inicio.getTime()) / 60_000);
}

export function isoDesdeDate(instante: Date): string {
  return instante.toISOString();
}

export function rangoDeVista(
  vista: "dia" | "semana" | "mes",
  fecha: string,
  zona: string,
): { desde: Date; hasta: Date } {
  if (vista === "dia") {
    return { desde: inicioDelDia(fecha, zona), hasta: inicioDelDiaSiguiente(fecha, zona) };
  }
  if (vista === "semana") {
    const inicio = inicioDeSemana(fecha);
    return { desde: inicioDelDia(inicio, zona), hasta: inicioDelDia(agregarDias(inicio, 7), zona) };
  }
  const celdas = grillaMes(fecha);
  const ultima = celdas.at(-1);
  if (!ultima) return { desde: inicioDelDia(fecha, zona), hasta: inicioDelDiaSiguiente(fecha, zona) };
  return { desde: inicioDelDia(celdas[0], zona), hasta: inicioDelDiaSiguiente(ultima, zona) };
}

export function edadEnAnios(fechaNacimiento: string, referencia = new Date()): number | null {
  if (!esFechaIso(fechaNacimiento)) return null;
  const [anio, mes, dia] = fechaNacimiento.split("-").map(Number);
  const nacimiento = new Date(Date.UTC(anio, mes - 1, dia));
  let edad = referencia.getUTCFullYear() - nacimiento.getUTCFullYear();
  const mesRef = referencia.getUTCMonth() - nacimiento.getUTCMonth();
  if (mesRef < 0 || (mesRef === 0 && referencia.getUTCDate() < nacimiento.getUTCDate())) edad -= 1;
  return edad >= 0 ? edad : null;
}
