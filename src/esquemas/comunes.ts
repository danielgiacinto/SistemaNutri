import { z } from "zod";

export const esquemaCorreo = z
  .string({ error: "Ingresá tu correo electrónico." })
  .trim()
  .toLowerCase()
  .min(1, "Ingresá tu correo electrónico.")
  .max(254, "El correo es demasiado largo.")
  .pipe(z.email({ error: "Ingresá un correo electrónico válido." }));

/** Misma política que Supabase Auth (config.toml): mínimo 8 caracteres con letras y números. */
export const esquemaContrasenaNueva = z
  .string({ error: "Ingresá una contraseña." })
  .min(8, "Debe tener al menos 8 caracteres.")
  .max(72, "Debe tener como máximo 72 caracteres.")
  .regex(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/, "Debe incluir al menos una letra.")
  .regex(/\d/, "Debe incluir al menos un número.");

/** Texto obligatorio sin espacios sobrantes. */
export function textoObligatorio(campo: string, maximo: number, minimo = 1) {
  return z
    .string({ error: `Completá ${campo}.` })
    .trim()
    .min(minimo, minimo > 1 ? `${capitalizar(campo)} debe tener al menos ${minimo} caracteres.` : `Completá ${campo}.`)
    .max(maximo, `${capitalizar(campo)} debe tener como máximo ${maximo} caracteres.`);
}

/** Texto opcional: una cadena vacía se guarda como `null`. */
export function textoOpcional(campo: string, maximo: number) {
  return z
    .string()
    .trim()
    .max(maximo, `${capitalizar(campo)} debe tener como máximo ${maximo} caracteres.`)
    .nullish()
    .transform((valor) => valor || null);
}

export const esquemaUuid = z.uuid({ error: "El identificador no es válido." });

export const esquemaFechaIso = z
  .string({ error: "Elegí una fecha." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida.");

export const esquemaHora = z
  .string({ error: "Elegí una hora." })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora no es válida.");

/** Número opcional desde un input: vacío → `null`. Acepta coma decimal. */
export function numeroOpcional(campo: string, minimo: number, maximo: number) {
  return z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((valor) => {
      if (valor === "" || valor === null || valor === undefined) return null;
      const numero = typeof valor === "number" ? valor : Number(String(valor).replace(",", "."));
      return Number.isFinite(numero) ? numero : Number.NaN;
    })
    .refine((valor) => valor === null || !Number.isNaN(valor), `Ingresá ${campo} válido.`)
    .refine((valor) => valor === null || valor >= minimo, `${capitalizar(campo)} es demasiado bajo.`)
    .refine((valor) => valor === null || valor <= maximo, `${capitalizar(campo)} es demasiado alto.`);
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
