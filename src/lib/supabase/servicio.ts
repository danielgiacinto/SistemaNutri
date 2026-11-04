import "server-only";
import { createClient } from "@supabase/supabase-js";
import { obtenerEntornoPublico } from "@/configuracion/entorno";
import type { Database } from "@/tipos/base-datos";

/** Solo para procesos verificados del servidor; no usa ni sustituye la sesión del usuario. */
export function crearClienteServicio() {
  const clave = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!clave) return null;
  return createClient<Database>(obtenerEntornoPublico().supabaseUrl, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
