import { z } from "zod";
import { esquemaCorreo, esquemaFechaIso, esquemaUuid, textoObligatorio, textoOpcional } from "@/esquemas/comunes";
import { ESTADOS_PACIENTE } from "@/configuracion/clinica";

export const esquemaAltaPaciente = z.object({
  nombre: textoObligatorio("el nombre", 80),
  apellido: textoObligatorio("el apellido", 80),
  correo: z
    .union([z.literal(""), esquemaCorreo])
    .nullish()
    .transform((valor) => valor || null),
  telefono: textoOpcional("el teléfono", 40),
  documento: textoOpcional("el documento", 20).pipe(
    z.union([
      z.null(),
      z
        .string()
        .min(5, "El documento debe tener al menos 5 caracteres.")
        .max(20, "El documento debe tener como máximo 20 caracteres."),
    ]),
  ),
  fechaNacimiento: z
    .union([z.literal(""), esquemaFechaIso])
    .nullish()
    .transform((valor) => valor || null)
    .refine((valor) => {
      if (!valor) return true;
      return valor <= new Date().toISOString().slice(0, 10);
    }, "La fecha de nacimiento no puede ser futura."),
  notasAdministrativas: textoOpcional("las notas administrativas", 2000),
});

export const esquemaEdicionPaciente = esquemaAltaPaciente.extend({
  estado: z.enum(ESTADOS_PACIENTE, { error: "Elegí un estado válido." }),
});

export const esquemaFiltroPacientes = z.object({
  q: z.string().max(80).optional().default(""),
  estado: z.enum(["todos", ...ESTADOS_PACIENTE]).optional().default("activo"),
  orden: z.enum(["apellido", "reciente"]).optional().default("apellido"),
  pagina: z.coerce.number().int().min(1).max(10_000).optional().default(1),
});

export const esquemaIdPaciente = z.object({
  pacienteId: esquemaUuid,
});

export type DatosAltaPaciente = z.input<typeof esquemaAltaPaciente>;
export type DatosAltaPacienteValidados = z.output<typeof esquemaAltaPaciente>;
export type DatosEdicionPaciente = z.input<typeof esquemaEdicionPaciente>;
export type DatosEdicionPacienteValidados = z.output<typeof esquemaEdicionPaciente>;
export type FiltroPacientes = z.output<typeof esquemaFiltroPacientes>;
