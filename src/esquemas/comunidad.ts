import { z } from "zod";
import { esquemaFechaIso, esquemaUuid, textoObligatorio } from "@/esquemas/comunes";

export const esquemaAltaDesafio = z
  .object({
    titulo: textoObligatorio("el título", 80),
    consigna: textoObligatorio("la consigna", 400),
    inicio: esquemaFechaIso,
    fin: esquemaFechaIso,
  })
  .refine((datos) => datos.fin >= datos.inicio, {
    path: ["fin"],
    message: "La fecha de fin tiene que ser igual o posterior al inicio.",
  });

export const esquemaEstadoDesafio = z.object({
  desafioId: esquemaUuid,
  estado: z.enum(["publicado", "cerrado"], { error: "Ese estado no se puede elegir." }),
});

export const esquemaActividad = z.object({
  desafioId: esquemaUuid,
  texto: textoObligatorio("el texto", 280),
});

export type DatosAltaDesafio = z.input<typeof esquemaAltaDesafio>;
export type DatosAltaDesafioValidados = z.output<typeof esquemaAltaDesafio>;
export type DatosActividad = z.input<typeof esquemaActividad>;
export type DatosActividadValidados = z.output<typeof esquemaActividad>;
