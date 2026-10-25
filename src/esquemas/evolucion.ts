import { z } from "zod";
import { esquemaUuid, textoObligatorio, textoOpcional } from "@/esquemas/comunes";

export const esquemaAltaEvolucion = z
  .object({
    pacienteId: esquemaUuid,
    turnoId: z
      .union([z.literal(""), esquemaUuid])
      .nullish()
      .transform((valor) => valor || null),
    titulo: textoOpcional("el título", 160),
    contenido: textoObligatorio("el detalle de la consulta", 20_000, 1),
    observaciones: textoOpcional("las observaciones", 8000),
    indicaciones: textoOpcional("las indicaciones", 8000),
    esBorrador: z.boolean(),
    visibleParaPaciente: z.boolean(),
  })
  .refine((datos) => !datos.visibleParaPaciente || !datos.esBorrador, {
    message: "Publicá la nota antes de compartirla con el paciente.",
    path: ["visibleParaPaciente"],
  });

export const esquemaEdicionEvolucion = esquemaAltaEvolucion.extend({
  evolucionId: esquemaUuid,
});

export type DatosAltaEvolucion = z.input<typeof esquemaAltaEvolucion>;
export type DatosAltaEvolucionValidados = z.output<typeof esquemaAltaEvolucion>;
export type DatosEdicionEvolucion = z.input<typeof esquemaEdicionEvolucion>;
export type DatosEdicionEvolucionValidados = z.output<typeof esquemaEdicionEvolucion>;
