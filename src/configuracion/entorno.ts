import { z } from "zod";

/**
 * Variables públicas (se incluyen en el bundle del navegador). Next.js solo
 * reemplaza referencias literales a `process.env.NEXT_PUBLIC_*`, por eso se
 * leen una por una.
 */
const esquemaEntornoPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ error: "NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida." }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string({ error: "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY." })
    .min(1, "Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."),
  NEXT_PUBLIC_SITIO_URL: z.url({ error: "NEXT_PUBLIC_SITIO_URL debe ser una URL válida." }).optional(),
});

export type EntornoPublico = {
  supabaseUrl: string;
  supabaseClavePublica: string;
  sitioUrl: string | undefined;
};

let entornoPublicoValidado: EntornoPublico | undefined;

export function obtenerEntornoPublico(): EntornoPublico {
  if (entornoPublicoValidado) return entornoPublicoValidado;

  const resultado = esquemaEntornoPublico.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITIO_URL: process.env.NEXT_PUBLIC_SITIO_URL || undefined,
  });

  if (!resultado.success) {
    const detalle = resultado.error.issues.map((problema) => `- ${problema.message}`).join("\n");
    throw new Error(
      `Configuración de entorno incompleta. Revisá .env.local (ver .env.example y docs/despliegue.md):\n${detalle}`,
    );
  }

  entornoPublicoValidado = {
    supabaseUrl: resultado.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseClavePublica: resultado.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    sitioUrl: resultado.data.NEXT_PUBLIC_SITIO_URL?.replace(/\/+$/, ""),
  };
  return entornoPublicoValidado;
}
