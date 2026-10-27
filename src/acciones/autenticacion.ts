"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { obtenerUrlSitio } from "@/lib/url-sitio";
import { requerirUsuario } from "@/autorizacion/sesion";
import { RUTAS, sanearRutaSiguiente } from "@/autorizacion/rutas";
import {
  esquemaIngreso,
  esquemaRecuperacion,
  esquemaRegistro,
  esquemaRestablecimiento,
  type DatosIngreso,
  type DatosRecuperacion,
  type DatosRegistro,
  type DatosRestablecimiento,
} from "@/esquemas/autenticacion";
import { resultadoDeValidacion } from "@/esquemas/resultado";
import {
  cambiarContrasena,
  cerrarSesionActual,
  iniciarIngresoConGoogle,
  ingresarConContrasena,
  reenviarConfirmacionCorreo,
  registrarCuenta,
  solicitarRecuperacionContrasena,
} from "@/servicios/autenticacion";
import { huellaInvitacion, nombreConsultorioInvitacion } from "@/servicios/invitaciones";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function ingresar(datos: DatosIngreso, siguiente?: string | null): Promise<ResultadoAccion> {
  const validacion = esquemaIngreso.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await ingresarConContrasena(cliente, validacion.data);
  if (!resultado.ok) return resultado;

  redirect(sanearRutaSiguiente(siguiente) ?? RUTAS.destino);
}

export async function registrarse(datos: DatosRegistro, siguiente?: string | null): Promise<ResultadoAccion> {
  const validacion = esquemaRegistro.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const rutaSiguiente = sanearRutaSiguiente(siguiente);
  const cliente = await crearClienteServidor();
  const consultorio = await nombreConsultorioInvitacion(
    cliente,
    validacion.data.correo,
    huellaDeInvitacion(rutaSiguiente),
  );
  const resultado = await registrarCuenta(
    cliente,
    validacion.data,
    await urlConfirmacionConSiguiente(rutaSiguiente),
    consultorio,
  );
  if (!resultado.ok) return resultado;

  // Si la confirmación de correo está desactivada, Supabase ya inicia la sesión.
  if (resultado.datos?.sesionIniciada) redirect(rutaSiguiente ?? RUTAS.destino);

  return {
    ok: true,
    mensaje: "Si el correo es válido y todavía no está confirmado, te enviamos un enlace para activar la cuenta.",
  };
}

export async function reenviarConfirmacion(correo: string, siguiente?: string | null): Promise<ResultadoAccion> {
  const validacion = esquemaRecuperacion.safeParse({ correo });
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await reenviarConfirmacionCorreo(
    cliente,
    validacion.data.correo,
    await urlConfirmacionConSiguiente(sanearRutaSiguiente(siguiente)),
  );
  if (!resultado.ok) return resultado;

  return {
    ok: true,
    mensaje: "Si el correo es válido y todavía no está confirmado, te enviamos el enlace de nuevo.",
  };
}

/** Acción de formulario: inicia el flujo OAuth con Google y redirige a su pantalla de consentimiento. */
export async function ingresarConGoogle(formulario: FormData): Promise<void> {
  const siguiente = sanearRutaSiguiente(formulario.get("siguiente")?.toString());
  const urlRetorno = new URL(RUTAS.confirmar, await obtenerUrlSitio());
  if (siguiente) urlRetorno.searchParams.set("siguiente", siguiente);

  const cliente = await crearClienteServidor();
  const resultado = await iniciarIngresoConGoogle(cliente, urlRetorno.toString());
  if (!resultado.ok || !resultado.datos) redirect(`${RUTAS.ingresar}?error=google`);

  redirect(resultado.datos.url);
}

export async function solicitarRecuperacion(datos: DatosRecuperacion): Promise<ResultadoAccion> {
  const validacion = esquemaRecuperacion.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const urlRetorno = new URL(RUTAS.confirmar, await obtenerUrlSitio());
  urlRetorno.searchParams.set("siguiente", RUTAS.restablecerContrasena);
  const resultado = await solicitarRecuperacionContrasena(cliente, validacion.data.correo, urlRetorno.toString());
  if (!resultado.ok) return resultado;

  return {
    ok: true,
    mensaje: "Si existe una cuenta con ese correo, vas a recibir un enlace para restablecer la contraseña.",
  };
}

export async function restablecerContrasena(datos: DatosRestablecimiento): Promise<ResultadoAccion> {
  await requerirUsuario();
  const validacion = esquemaRestablecimiento.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await cambiarContrasena(cliente, validacion.data.contrasena);
  if (!resultado.ok) return resultado;

  return { ok: true, mensaje: "Tu contraseña se actualizó correctamente." };
}

export async function cerrarSesion(): Promise<void> {
  const cliente = await crearClienteServidor();
  await cerrarSesionActual(cliente);
  redirect(RUTAS.ingresar);
}

async function urlConfirmacionConSiguiente(siguiente: string | null): Promise<string> {
  const url = new URL(RUTAS.confirmar, await obtenerUrlSitio());
  if (siguiente) url.searchParams.set("siguiente", siguiente);
  return url.toString();
}

function huellaDeInvitacion(ruta: string | null): string | null {
  const coincidencia = ruta?.match(/^\/invitacion\/([A-Za-z0-9_-]{32,80})$/);
  if (!coincidencia) return null;
  return huellaInvitacion(coincidencia[1]);
}
