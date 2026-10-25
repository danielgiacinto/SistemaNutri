import { z } from "zod";
import { esquemaFechaIso, esquemaHora, esquemaUuid, textoOpcional } from "@/esquemas/comunes";
import { DURACIONES_TURNO_MINUTOS } from "@/configuracion/clinica";

export const esquemaHorarioAtencion = z
  .object({
    diaSemana: z.coerce.number().int().min(1, "Elegí un día.").max(7, "Elegí un día."),
    horaInicio: esquemaHora,
    horaFin: esquemaHora,
  })
  .refine((datos) => datos.horaFin > datos.horaInicio, {
    message: "La hora de fin debe ser posterior a la de inicio.",
    path: ["horaFin"],
  });

export const esquemaBloqueoAgenda = z
  .object({
    fecha: esquemaFechaIso,
    horaInicio: esquemaHora,
    horaFin: esquemaHora,
    motivo: textoOpcional("el motivo", 200),
  })
  .refine((datos) => datos.horaFin > datos.horaInicio, {
    message: "La hora de fin debe ser posterior a la de inicio.",
    path: ["horaFin"],
  });

export const esquemaDuracionConsultorio = z.object({
  duracionTurnoMinutos: z.coerce
    .number({ error: "Elegí la duración predeterminada." })
    .refine((valor) => (DURACIONES_TURNO_MINUTOS as readonly number[]).includes(valor), {
      message: "Elegí una duración de la lista.",
    }),
});

export const esquemaIdAgenda = z.object({ id: esquemaUuid });

export type DatosHorarioAtencion = z.input<typeof esquemaHorarioAtencion>;
export type DatosHorarioAtencionValidados = z.output<typeof esquemaHorarioAtencion>;
export type DatosBloqueoAgenda = z.input<typeof esquemaBloqueoAgenda>;
export type DatosDuracionConsultorio = z.input<typeof esquemaDuracionConsultorio>;
