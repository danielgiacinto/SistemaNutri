import { NextResponse, type NextRequest } from "next/server";
import { obtenerContextoUsuario } from "@/autorizacion/sesion";
import { calcularDestino } from "@/autorizacion/contexto";

/** Redirige a cada usuario a su área según el rol verificado en el servidor. */
export async function GET(peticion: NextRequest) {
  const contexto = await obtenerContextoUsuario();
  return NextResponse.redirect(new URL(calcularDestino(contexto), peticion.nextUrl.origin));
}
