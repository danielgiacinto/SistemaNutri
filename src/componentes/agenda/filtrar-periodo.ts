import { agregarDias, fechaEnZona, inicioDeSemana, rangoDeVista } from "@/lib/fechas";
import type { VistaAgenda } from "@/configuracion/clinica";

/** Usa el mismo intervalo y zona horaria que la lectura del servidor. */
export function filtrarPeriodoAgenda<T extends { inicio: string }>(turnos: T[], vista: VistaAgenda, fecha: string, zona: string): T[] {
  const rango = rangoDeVista(vista, fecha, zona);
  const desde = rango.desde.getTime();
  const hasta = rango.hasta.getTime();
  return turnos.filter(turno => {
    const inicio = new Date(turno.inicio).getTime();
    return inicio >= desde && inicio < hasta;
  });
}

export function diasDeTiraAgenda(fecha: string): string[] {
  const lunes = inicioDeSemana(fecha);
  return Array.from({ length: 14 }, (_, indice) => agregarDias(lunes, indice));
}

/** Incluye el mes y los catorce días, también al cruzar un mes o un año. */
export function rangoLecturaAgenda(fecha: string, zona: string) {
  const mes = rangoDeVista("mes", fecha, zona);
  const dias = diasDeTiraAgenda(fecha);
  const ultimoDia = rangoDeVista("dia", dias[13], zona);
  return { desde: mes.desde, hasta: new Date(Math.max(mes.hasta.getTime(), ultimoDia.hasta.getTime())) };
}

export function contarTurnosPorDia(turnos: { inicio: string; estado: string }[], zona: string): Map<string, number> {
  const cantidades = new Map<string, number>();
  for (const turno of turnos) {
    if (turno.estado === "cancelado") continue;
    const dia = fechaEnZona(new Date(turno.inicio), zona);
    cantidades.set(dia, (cantidades.get(dia) ?? 0) + 1);
  }
  return cantidades;
}

export function enlaceAgenda(vista: VistaAgenda, fecha: string, parametros = ""): string {
  const consulta = new URLSearchParams(parametros);
  consulta.set("vista", vista);
  consulta.set("fecha", fecha);
  return `/panel/agenda?${consulta.toString()}`;
}

export function enlaceCajaAgenda(fecha: string, parametros = ""): string {
  const origen = new URLSearchParams(parametros);
  const vista = origen.get("vista") ?? "semana";
  const consulta = new URLSearchParams({ vista: "movimientos", mes: fecha.slice(0, 7), fechaAgenda: fecha, vistaAgenda: vista === "semana" || vista === "mes" ? vista : "dia" });
  if (origen.get("detalle") === "horarios") consulta.set("detalleAgenda", "horarios");
  return `/panel/finanzas?${consulta.toString()}`;
}

export function enlaceTurnoAgenda(turnoId: string, vista: VistaAgenda, fecha: string, parametros = ""): string {
  const consulta = new URLSearchParams(enlaceAgenda(vista, fecha, parametros).split("?")[1]);
  return `/panel/agenda/${turnoId}?${consulta.toString()}`;
}
