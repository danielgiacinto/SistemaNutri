import { z } from "zod";
import { textoObligatorio, textoOpcional } from "@/esquemas/comunes";
import { ZONAS_HORARIAS_DISPONIBLES } from "@/configuracion/producto";

const valoresZonasHorarias = ZONAS_HORARIAS_DISPONIBLES.map((zona) => zona.valor) as [string, ...string[]];

const esquemaZonaHoraria = z.enum(valoresZonasHorarias, { error: "Elegí una zona horaria de la lista." });

export const esquemaAltaConsultorio = z.object({
  nombre: textoObligatorio("el nombre del consultorio", 120, 2),
  zonaHoraria: esquemaZonaHoraria,
});

export const esquemaDatosConsultorio = z.object({
  nombre: textoObligatorio("el nombre del consultorio", 120, 2),
  zonaHoraria: esquemaZonaHoraria,
  telefono: textoOpcional("el teléfono", 40),
  direccion: textoOpcional("la dirección", 200),
  duracionTurnoMinutos: z.coerce
    .number({ error: "Elegí la duración predeterminada de los turnos." })
    .int()
    .min(10)
    .max(240),
});

export type DatosAltaConsultorio = z.input<typeof esquemaAltaConsultorio>;
export type DatosConsultorio = z.input<typeof esquemaDatosConsultorio>;
export type DatosConsultorioValidados = z.output<typeof esquemaDatosConsultorio>;
