import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { obtenerEntornoPublico } from "@/configuracion/entorno";
import type { Database } from "@/tipos/base-datos";

/**
 * Cliente ligado a una redirección HTTP. Las cookies (verificador PKCE o
 * sesión) se escriben en la misma respuesta que el `Location`, como pide
 * `@supabase/ssr` para OAuth.
 */
export function crearClienteRedireccion(peticion: NextRequest) {
  const { supabaseUrl, supabaseClavePublica } = obtenerEntornoPublico();
  const cookiesPendientes: { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }[] =
    [];
  const encabezadosPendientes: Record<string, string> = {};

  const cliente = createServerClient<Database>(supabaseUrl, supabaseClavePublica, {
    cookies: {
      getAll() {
        return peticion.cookies.getAll();
      },
      setAll(cookiesAEstablecer, encabezados) {
        for (const cookie of cookiesAEstablecer) {
          cookiesPendientes.push(cookie);
        }
        if (encabezados) {
          for (const [clave, valor] of Object.entries(encabezados)) {
            encabezadosPendientes[clave] = valor;
          }
        }
      },
    },
  });

  function redirigir(destino: URL | string, estado = 303): NextResponse {
    const respuesta = NextResponse.redirect(destino, estado);
    for (const { name, value, options } of cookiesPendientes) {
      respuesta.cookies.set(name, value, options);
    }
    for (const [clave, valor] of Object.entries(encabezadosPendientes)) {
      respuesta.headers.set(clave, valor);
    }
    return respuesta;
  }

  return { cliente, redirigir };
}
