import { rangoDeVista } from "@/lib/fechas";
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
