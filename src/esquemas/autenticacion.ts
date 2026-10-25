import { z } from "zod";
import { esquemaContrasenaNueva, esquemaCorreo, textoObligatorio } from "@/esquemas/comunes";

export const esquemaIngreso = z.object({
  correo: esquemaCorreo,
  contrasena: z.string({ error: "Ingresá tu contraseña." }).min(1, "Ingresá tu contraseña.").max(72),
});

export const esquemaRegistro = z
  .object({
    nombre: textoObligatorio("el nombre", 80),
    apellido: textoObligatorio("el apellido", 80),
    correo: esquemaCorreo,
    contrasena: esquemaContrasenaNueva,
    confirmacion: z.string(),
  })
  .refine((datos) => datos.contrasena === datos.confirmacion, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmacion"],
  });

export const esquemaRecuperacion = z.object({
  correo: esquemaCorreo,
});

export const esquemaRestablecimiento = z
  .object({
    contrasena: esquemaContrasenaNueva,
    confirmacion: z.string(),
  })
  .refine((datos) => datos.contrasena === datos.confirmacion, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmacion"],
  });

export type DatosIngreso = z.input<typeof esquemaIngreso>;
export type DatosRegistro = z.input<typeof esquemaRegistro>;
export type DatosRecuperacion = z.input<typeof esquemaRecuperacion>;
export type DatosRestablecimiento = z.input<typeof esquemaRestablecimiento>;
