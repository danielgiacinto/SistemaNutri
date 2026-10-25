import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { registrarError } from "@/lib/errores";
import { RUTAS, sanearRutaSiguiente } from "@/autorizacion/rutas";

const TIPOS_OTP_PERMITIDOS: EmailOtpType[] = ["email", "signup", "recovery", "invite", "magiclink", "email_change"];

/**
 * Punto de retorno de Supabase Auth:
 *  - Enlaces de correo con `token_hash` (confirmación de cuenta, recuperación).
 *  - Flujo OAuth/PKCE con `code` (Google).
 */
export async function GET(peticion: NextRequest) {
  const parametros = peticion.nextUrl.searchParams;
  const tokenHash = parametros.get("token_hash");
  const tipo = parametros.get("type") as EmailOtpType | null;
  const codigo = parametros.get("code");
  const siguiente = sanearRutaSiguiente(parametros.get("siguiente"));

  const cliente = await crearClienteServidor();
  let error: { code?: string; message: string } | null = null;

  if (tokenHash && tipo && TIPOS_OTP_PERMITIDOS.includes(tipo)) {
    ({ error } = await cliente.auth.verifyOtp({ type: tipo, token_hash: tokenHash }));
  } else if (codigo) {
    ({ error } = await cliente.auth.exchangeCodeForSession(codigo));
  } else {
    error = { code: "parametros_invalidos", message: "Enlace sin parámetros de autenticación" };
  }

  if (error) {
    registrarError("auth_confirmar", error);
    const destinoError = new URL(RUTAS.ingresar, peticion.nextUrl.origin);
    destinoError.searchParams.set("error", "enlace_invalido");
    return NextResponse.redirect(destinoError);
  }

  const destino = tipo === "recovery" ? RUTAS.restablecerContrasena : (siguiente ?? RUTAS.destino);
  return NextResponse.redirect(new URL(destino, peticion.nextUrl.origin));
}
