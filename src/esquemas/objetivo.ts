import { z } from "zod";
import { esquemaFechaIso, esquemaUuid, numeroOpcional, textoObligatorio, textoOpcional } from "@/esquemas/comunes";
import { CATEGORIAS_OBJETIVO, ESTADOS_OBJETIVO } from "@/configuracion/clinica";

export const esquemaAltaObjetivo = z.object({
  pacienteId: esquemaUuid,
  titulo: textoObligatorio("el título", 160),
  descripcion: textoOpcional("la descripción", 4000),
  categoria: z.enum(CATEGORIAS_OBJETIVO, { error: "Elegí una categoría." }),
  fechaObjetivo: z
    .union([z.literal(""), esquemaFechaIso])
    .nullish()
    .transform((valor) => valor || null),
  estado: z.enum(ESTADOS_OBJETIVO, { error: "Elegí un estado." }),
  progreso: numeroOpcional("el progreso", 0, 100),
  valorInicial: numeroOpcional("el valor inicial", -1000, 1000),
  valorObjetivo: numeroOpcional("el valor objetivo", -1000, 1000),
  unidad: textoOpcional("la unidad", 20),
  observaciones: textoOpcional("las observaciones", 4000),
  visibleParaPaciente: z.boolean(),
});

export const esquemaEdicionObjetivo = esquemaAltaObjetivo.extend({
  objetivoId: esquemaUuid,
});

export type DatosAltaObjetivo = z.input<typeof esquemaAltaObjetivo>;
export type DatosAltaObjetivoValidados = z.output<typeof esquemaAltaObjetivo>;
export type DatosEdicionObjetivo = z.input<typeof esquemaEdicionObjetivo>;
export type DatosEdicionObjetivoValidados = z.output<typeof esquemaEdicionObjetivo>;
