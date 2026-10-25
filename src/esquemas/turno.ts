import { z } from "zod";
import { esquemaFechaIso, esquemaHora, esquemaUuid, textoOpcional } from "@/esquemas/comunes";
import { DURACIONES_TURNO_MINUTOS, ESTADOS_TURNO, TIPOS_CONSULTA } from "@/configuracion/clinica";

const duraciones = DURACIONES_TURNO_MINUTOS as unknown as [number, ...number[]];

export const esquemaAltaTurno = z.object({
  pacienteId: esquemaUuid,
  fecha: esquemaFechaIso,
  hora: esquemaHora,
  duracionMinutos: z.coerce
    .number({ error: "Elegí la duración." })
    .refine((valor): valor is (typeof DURACIONES_TURNO_MINUTOS)[number] => duraciones.includes(valor as never), {
      message: "Elegí una duración de la lista.",
    }),
  tipo: z.enum(TIPOS_CONSULTA, { error: "Elegí el tipo de consulta." }),
  motivo: textoOpcional("el motivo", 200),
  notasAdministrativas: textoOpcional("las notas administrativas", 2000),
});

export const esquemaEdicionTurno = esquemaAltaTurno.extend({
  turnoId: esquemaUuid,
  estado: z.enum(ESTADOS_TURNO, { error: "Elegí un estado válido." }),
});

export const esquemaCancelacionTurno = z.object({
  turnoId: esquemaUuid,
  motivoCancelacion: textoOpcional("el motivo de cancelación", 200),
});

export const esquemaFiltroAgenda = z.object({
  vista: z.enum(["dia", "semana", "mes"]).optional().default("semana"),
  fecha: esquemaFechaIso.optional(),
});

export type DatosAltaTurno = z.input<typeof esquemaAltaTurno>;
export type DatosAltaTurnoValidados = z.output<typeof esquemaAltaTurno>;
export type DatosEdicionTurno = z.input<typeof esquemaEdicionTurno>;
export type DatosEdicionTurnoValidados = z.output<typeof esquemaEdicionTurno>;
export type DatosCancelacionTurno = z.input<typeof esquemaCancelacionTurno>;
