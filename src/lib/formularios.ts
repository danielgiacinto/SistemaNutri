import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { ResultadoAccion } from "@/tipos/acciones";

/** Muestra en cada campo los errores de validación devueltos por el servidor. */
export function aplicarErroresServidor<T extends FieldValues>(
  establecerError: UseFormSetError<T>,
  resultado: ResultadoAccion<unknown>,
): void {
  if (resultado.ok || !resultado.erroresCampos) return;
  for (const [campo, mensajes] of Object.entries(resultado.erroresCampos)) {
    if (mensajes?.[0]) establecerError(campo as Path<T>, { type: "server", message: mensajes[0] });
  }
}
