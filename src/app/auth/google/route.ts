import type { NextRequest } from "next/server";
import { crearClienteRedireccion } from "@/lib/supabase/redireccion";
import { obtenerUrlSitio } from "@/lib/url-sitio";
import { iniciarIngresoConGoogle } from "@/servicios/autenticacion";
import { RUTAS, sanearRutaSiguiente } from "@/autorizacion/rutas";

/**
 * Inicia el OAuth de Google. La respuesta 303 lleva la cookie del verificador
 * PKCE junto con la redirección al consentimiento de Google.
 */
export async function POST(peticion: NextRequest) {
  const formulario = await peticion.formData();
  const siguiente = sanearRutaSiguiente(formulario.get("siguiente")?.toString());
  const paginaError = formulario.get("paginaError")?.toString() === RUTAS.registro ? RUTAS.registro : RUTAS.ingresar;
  const urlRetorno = new URL(RUTAS.confirmar, await obtenerUrlSitio());
  if (siguiente) urlRetorno.searchParams.set("siguiente", siguiente);

  const { cliente, redirigir } = crearClienteRedireccion(peticion);
  const resultado = await iniciarIngresoConGoogle(cliente, urlRetorno.toString());
  if (!resultado.ok || !resultado.datos) {
    const destinoError = new URL(paginaError, peticion.nextUrl.origin);
    destinoError.searchParams.set("error", "google");
    return redirigir(destinoError);
  }

  return redirigir(resultado.datos.url);
}
