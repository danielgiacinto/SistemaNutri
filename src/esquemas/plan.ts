import { z } from "zod";
import { MOMENTOS_COMIDA } from "@/configuracion/clinica";
import { esquemaUuid, textoObligatorio, textoOpcional } from "@/esquemas/comunes";

export const esquemaComidaPlan = z.object({
  momento: z.enum(MOMENTOS_COMIDA, { error: "Elegí el momento del día." }),
  detalle: textoObligatorio("el detalle de la comida", 2000),
});

export const esquemaAltaPlan = z.object({
  pacienteId: esquemaUuid,
  titulo: textoObligatorio("el título", 160),
  indicaciones: textoOpcional("las indicaciones", 8000),
});

export const esquemaPlan = z.object({
  planId: esquemaUuid,
  titulo: textoObligatorio("el título", 160),
  indicaciones: textoOpcional("las indicaciones", 8000),
  comidas: z.array(esquemaComidaPlan).max(20, "Un plan admite hasta 20 comidas."),
  publicar: z.boolean(),
});

export type DatosAltaPlan = z.input<typeof esquemaAltaPlan>;
export type DatosAltaPlanValidados = z.output<typeof esquemaAltaPlan>;
export type DatosPlan = z.input<typeof esquemaPlan>;
export type DatosPlanValidados = z.output<typeof esquemaPlan>;
