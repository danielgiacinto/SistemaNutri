import { z } from "zod";
import type { ResultadoAccion } from "@/tipos/acciones";

/** Convierte un error de validación de Zod en una respuesta de acción con errores por campo. */
export function resultadoDeValidacion(error: z.ZodError): ResultadoAccion<never> {
  return {
    ok: false,
    mensaje: "Revisá los datos ingresados.",
    erroresCampos: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
  };
}
