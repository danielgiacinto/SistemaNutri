import { z } from "zod";
import { esquemaFechaIso, esquemaHora, esquemaUuid, numeroOpcional, textoOpcional } from "@/esquemas/comunes";

export const esquemaAltaMedicion = z
  .object({
    pacienteId: esquemaUuid,
    fecha: esquemaFechaIso,
    hora: esquemaHora,
    pesoKg: numeroOpcional("el peso", 1, 400),
    tallaCm: numeroOpcional("la talla", 40, 250),
    circunferenciaCinturaCm: numeroOpcional("la circunferencia de cintura", 20, 300),
    circunferenciaCaderaCm: numeroOpcional("la circunferencia de cadera", 20, 300),
    porcentajeGrasa: numeroOpcional("el porcentaje de grasa", 1, 80),
    masaMuscularKg: numeroOpcional("la masa muscular", 1, 200),
    observaciones: textoOpcional("las observaciones", 2000),
    visibleParaPaciente: z.boolean(),
  })
  .refine(
    (datos) =>
      datos.pesoKg !== null ||
      datos.tallaCm !== null ||
      datos.circunferenciaCinturaCm !== null ||
      datos.circunferenciaCaderaCm !== null ||
      datos.porcentajeGrasa !== null ||
      datos.masaMuscularKg !== null,
    { message: "Registrá al menos una medición.", path: ["pesoKg"] },
  );

export const esquemaEdicionMedicion = esquemaAltaMedicion.extend({
  medicionId: esquemaUuid,
});

export type DatosAltaMedicion = z.input<typeof esquemaAltaMedicion>;
export type DatosAltaMedicionValidados = z.output<typeof esquemaAltaMedicion>;
export type DatosEdicionMedicion = z.input<typeof esquemaEdicionMedicion>;
export type DatosEdicionMedicionValidados = z.output<typeof esquemaEdicionMedicion>;
