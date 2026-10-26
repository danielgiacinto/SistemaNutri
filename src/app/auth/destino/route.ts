import { NextResponse, type NextRequest } from "next/server";
import { obtenerContextoUsuario } from "@/autorizacion/sesion";
import { calcularDestino } from "@/autorizacion/contexto";
import { crearClienteRedireccion } from "@/lib/supabase/redireccion";
import { RUTAS } from "@/autorizacion/rutas";

/**
 * Redirige a cada usuario a su área según el rol verificado en el servidor.
 * Sin contexto (JWT inválido o sin perfil) se cierra la sesión para no volver
 * a /ingresar con las mismas cookies.
 */
export async function GET(peticion: NextRequest) {
  const contexto = await obtenerContextoUsuario();
  if (contexto) {
    return NextResponse.redirect(new URL(calcularDestino(contexto), peticion.nextUrl.origin), 303);
  }

  const { cliente, redirigir } = crearClienteRedireccion(peticion);
  await cliente.auth.signOut();
  return redirigir(new URL(RUTAS.ingresar, peticion.nextUrl.origin));
}
