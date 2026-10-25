export const PACIENTES_POR_PAGINA = 20;

export const DURACIONES_TURNO_MINUTOS = [20, 30, 45, 60, 90] as const;

export const DURACION_TURNO_PREDETERMINADA = 45;

/** Primer y último horario visible en las vistas día/semana (hora local). */
export const HORA_AGENDA_INICIO = 7;
export const HORA_AGENDA_FIN = 21;
export const MINUTOS_POR_RANURA = 30;

export const ESTADOS_PACIENTE = ["activo", "inactivo"] as const;
export const ESTADOS_TURNO = ["programado", "confirmado", "completado", "cancelado", "ausente"] as const;
export const TIPOS_CONSULTA = ["primera_consulta", "seguimiento", "control", "otro"] as const;
export const ESTADOS_OBJETIVO = ["pendiente", "en_progreso", "completado", "cancelado"] as const;
export const CATEGORIAS_OBJETIVO = ["peso", "habito", "analitica", "bienestar", "otro"] as const;
export const VISTAS_AGENDA = ["dia", "semana", "mes"] as const;

export const ETIQUETAS_ESTADO_PACIENTE = {
  activo: "Activo",
  inactivo: "Inactivo",
} as const;

export const ETIQUETAS_ESTADO_TURNO = {
  programado: "Programado",
  confirmado: "Confirmado",
  completado: "Completado",
  cancelado: "Cancelado",
  ausente: "Ausente",
} as const;

export const ETIQUETAS_TIPO_CONSULTA = {
  primera_consulta: "Primera consulta",
  seguimiento: "Seguimiento",
  control: "Control",
  otro: "Otro",
} as const;

export const ETIQUETAS_ESTADO_OBJETIVO = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completado: "Completado",
  cancelado: "Cancelado",
} as const;

export const ETIQUETAS_CATEGORIA_OBJETIVO = {
  peso: "Peso",
  habito: "Hábito",
  analitica: "Analítica",
  bienestar: "Bienestar",
  otro: "Otro",
} as const;

export const DIAS_SEMANA = [
  { iso: 1, etiqueta: "Lunes", corto: "Lun" },
  { iso: 2, etiqueta: "Martes", corto: "Mar" },
  { iso: 3, etiqueta: "Miércoles", corto: "Mié" },
  { iso: 4, etiqueta: "Jueves", corto: "Jue" },
  { iso: 5, etiqueta: "Viernes", corto: "Vie" },
  { iso: 6, etiqueta: "Sábado", corto: "Sáb" },
  { iso: 7, etiqueta: "Domingo", corto: "Dom" },
] as const;

export type EstadoPaciente = (typeof ESTADOS_PACIENTE)[number];
export type EstadoTurno = (typeof ESTADOS_TURNO)[number];
export type TipoConsulta = (typeof TIPOS_CONSULTA)[number];
export type EstadoObjetivo = (typeof ESTADOS_OBJETIVO)[number];
export type CategoriaObjetivo = (typeof CATEGORIAS_OBJETIVO)[number];
export type VistaAgenda = (typeof VISTAS_AGENDA)[number];

export function ranurasAgenda(): string[] {
  const ranuras: string[] = [];
  for (let hora = HORA_AGENDA_INICIO; hora < HORA_AGENDA_FIN; hora += 1) {
    ranuras.push(`${String(hora).padStart(2, "0")}:00`);
    if (MINUTOS_POR_RANURA === 30) ranuras.push(`${String(hora).padStart(2, "0")}:30`);
  }
  return ranuras;
}
