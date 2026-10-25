import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { obtenerEntornoPublico } from "@/configuracion/entorno";
import type { Database } from "@/tipos/base-datos";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Usa la clave pública y la sesión del usuario: todas las consultas quedan
 * sujetas a RLS. Crear uno nuevo por petición.
 */
export async function crearClienteServidor() {
  const almacenCookies = await cookies();
  const { supabaseUrl, supabaseClavePublica } = obtenerEntornoPublico();

  return createServerClient<Database>(supabaseUrl, supabaseClavePublica, {
    cookies: {
      getAll() {
        return almacenCookies.getAll();
      },
      setAll(cookiesAEstablecer) {
        try {
          for (const { name, value, options } of cookiesAEstablecer) {
            almacenCookies.set(name, value, options);
          }
        } catch {
          // Los Server Components no pueden escribir cookies. La sesión se
          // renueva en el proxy (src/proxy.ts), así que es seguro ignorarlo.
        }
      },
    },
  });
}

export type ClienteSupabase = Awaited<ReturnType<typeof crearClienteServidor>>;
