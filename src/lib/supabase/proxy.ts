import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { obtenerEntornoPublico } from "@/configuracion/entorno";
import { RUTAS, esRutaProtegida, esRutaSoloInvitados } from "@/autorizacion/rutas";
import type { Database } from "@/tipos/base-datos";

/**
 * Renueva la sesión de Supabase en cada petición y aplica la primera barrera
 * de acceso (sesión sí/no). La autorización por rol y por recurso se verifica
 * después en el servidor (src/autorizacion/sesion.ts) y en la base (RLS).
 */
export async function actualizarSesion(peticion: NextRequest): Promise<NextResponse> {
  const { supabaseUrl, supabaseClavePublica } = obtenerEntornoPublico();
  let respuesta = NextResponse.next({ request: peticion });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseClavePublica, {
    cookies: {
      getAll() {
        return peticion.cookies.getAll();
      },
      setAll(cookiesAEstablecer, encabezados) {
        for (const { name, value } of cookiesAEstablecer) {
          peticion.cookies.set(name, value);
        }
        respuesta = NextResponse.next({ request: peticion });
        for (const { name, value, options } of cookiesAEstablecer) {
          respuesta.cookies.set(name, value, options);
        }
        for (const [clave, valor] of Object.entries(encabezados)) {
          respuesta.headers.set(clave, valor);
        }
      },
    },
  });

  // No ejecutar código entre la creación del cliente y getClaims(): la
  // renovación del token debe ocurrir antes de construir la respuesta.
  const { data } = await supabase.auth.getClaims();
  const tieneSesion = Boolean(data?.claims?.sub);
  const { pathname, search } = peticion.nextUrl;

  if (!tieneSesion && esRutaProtegida(pathname)) {
    const destino = peticion.nextUrl.clone();
    destino.pathname = RUTAS.ingresar;
    destino.search = "";
    destino.searchParams.set("siguiente", `${pathname}${search}`);
    return redirigirConservandoCookies(destino, respuesta);
  }

  if (tieneSesion && esRutaSoloInvitados(pathname)) {
    const destino = peticion.nextUrl.clone();
    destino.pathname = RUTAS.destino;
    destino.search = "";
    return redirigirConservandoCookies(destino, respuesta);
  }

  return respuesta;
}

function redirigirConservandoCookies(destino: URL, respuestaBase: NextResponse): NextResponse {
  const redireccion = NextResponse.redirect(destino);
  for (const cookie of respuestaBase.cookies.getAll()) {
    redireccion.cookies.set(cookie);
  }
  const cacheControl = respuestaBase.headers.get("Cache-Control");
  if (cacheControl) redireccion.headers.set("Cache-Control", cacheControl);
  return redireccion;
}
