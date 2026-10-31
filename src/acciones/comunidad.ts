"use server";

import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { requerirPaciente, requerirProfesional, requerirUsuario } from "@/autorizacion/sesion";
import { resultadoDeValidacion } from "@/esquemas/resultado";
import { esquemaUuid } from "@/esquemas/comunes";
import {
  esquemaActividad,
  esquemaAltaDesafio,
  esquemaEstadoDesafio,
  type DatosActividad,
  type DatosAltaDesafio,
} from "@/esquemas/comunidad";
import {
  borrarActividad,
  cambiarEstadoDesafio,
  crearDesafio,
  eliminarBorrador,
  publicarActividad,
  sumarseADesafio,
} from "@/servicios/comunidad";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function registrarDesafio(datos: DatosAltaDesafio): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  const validacion = esquemaAltaDesafio.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await crearDesafio(cliente, contexto.consultorio.id, validacion.data);
  if (resultado.ok) refresh();
  return resultado;
}

export async function publicarDesafio(desafioId: string): Promise<ResultadoAccion> {
  return cambiarDesafio(desafioId, "publicado");
}

export async function cerrarDesafio(desafioId: string): Promise<ResultadoAccion> {
  return cambiarDesafio(desafioId, "cerrado");
}

async function cambiarDesafio(desafioId: string, estado: "publicado" | "cerrado"): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  const validacion = esquemaEstadoDesafio.safeParse({ desafioId, estado });
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await cambiarEstadoDesafio(cliente, contexto.consultorio.id, validacion.data.desafioId, estado);
  if (resultado.ok) refresh();
  return resultado;
}

export async function borrarBorradorDesafio(desafioId: string): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  if (!esquemaUuid.safeParse(desafioId).success) return { ok: false, mensaje: "No encontramos ese desafío." };

  const cliente = await crearClienteServidor();
  const resultado = await eliminarBorrador(cliente, contexto.consultorio.id, desafioId);
  if (resultado.ok) refresh();
  return resultado;
}

export async function unirseADesafio(desafioId: string): Promise<ResultadoAccion> {
  await requerirPaciente();
  if (!esquemaUuid.safeParse(desafioId).success) return { ok: false, mensaje: "No encontramos ese desafío." };

  const cliente = await crearClienteServidor();
  const resultado = await sumarseADesafio(cliente, desafioId);
  if (resultado.ok) refresh();
  return resultado;
}

export async function registrarActividad(datos: DatosActividad): Promise<ResultadoAccion> {
  await requerirPaciente();
  const validacion = esquemaActividad.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await publicarActividad(cliente, validacion.data);
  if (resultado.ok) refresh();
  return resultado;
}

export async function quitarActividad(actividadId: string): Promise<ResultadoAccion> {
  await requerirUsuario();
  if (!esquemaUuid.safeParse(actividadId).success) return { ok: false, mensaje: "No se pudo borrar esa actividad." };

  const cliente = await crearClienteServidor();
  const resultado = await borrarActividad(cliente, actividadId);
  if (resultado.ok) refresh();
  return resultado;
}
