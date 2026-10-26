import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { crearClienteRedireccion } from "@/lib/supabase/redireccion";
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
  const errorOAuth = parametros.get("error");

  const { cliente, redirigir } = crearClienteRedireccion(peticion);
  const destinoError = new URL(RUTAS.ingresar, peticion.nextUrl.origin);

  if (errorOAuth) {
    registrarError("auth_confirmar", {
      code: errorOAuth,
      message: parametros.get("error_description") ?? errorOAuth,
    });
    destinoError.searchParams.set("error", "google");
    return redirigir(destinoError);
  }

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
    destinoError.searchParams.set("error", error.code === "bad_code_verifier" ? "google" : "enlace_invalido");
    return redirigir(destinoError);
  }

  const destino = tipo === "recovery" ? RUTAS.restablecerContrasena : (siguiente ?? RUTAS.destino);
  return redirigir(new URL(destino, peticion.nextUrl.origin));
}
