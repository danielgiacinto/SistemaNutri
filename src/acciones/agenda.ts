"use server";

import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { requerirProfesional, requerirTitular } from "@/autorizacion/sesion";
import { resultadoDeValidacion } from "@/esquemas/resultado";
import {
  esquemaBloqueoAgenda,
  esquemaHorarioAtencion,
  esquemaIdAgenda,
  type DatosBloqueoAgenda,
  type DatosHorarioAtencion,
} from "@/esquemas/agenda";
import { crearBloqueo, crearHorario, eliminarBloqueo, eliminarHorario } from "@/servicios/agenda";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function registrarHorario(datos: DatosHorarioAtencion): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  const validacion = esquemaHorarioAtencion.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);
  const cliente = await crearClienteServidor();
  const resultado = await crearHorario(cliente, contexto.consultorio.id, validacion.data);
  if (resultado.ok) refresh();
  return resultado;
}

export async function quitarHorario(horarioId: string): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  const id = esquemaIdAgenda.safeParse({ id: horarioId });
  if (!id.success) return { ok: false, mensaje: "Horario inválido." };
  const cliente = await crearClienteServidor();
  const resultado = await eliminarHorario(cliente, contexto.consultorio.id, id.data.id);
  if (resultado.ok) refresh();
  return resultado;
}

export async function registrarBloqueo(datos: DatosBloqueoAgenda): Promise<ResultadoAccion> {
  const contexto = await requerirTitular();
  const validacion = esquemaBloqueoAgenda.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);
  const cliente = await crearClienteServidor();
  const resultado = await crearBloqueo(
    cliente,
    contexto.consultorio.id,
    contexto.consultorio.zonaHoraria,
    validacion.data,
  );
  if (resultado.ok) refresh();
  return resultado;
}

export async function quitarBloqueo(bloqueoId: string): Promise<ResultadoAccion> {
  const contexto = await requerirTitular();
  const id = esquemaIdAgenda.safeParse({ id: bloqueoId });
  if (!id.success) return { ok: false, mensaje: "Bloqueo inválido." };
  const cliente = await crearClienteServidor();
  const resultado = await eliminarBloqueo(cliente, contexto.consultorio.id, id.data.id);
  if (resultado.ok) refresh();
  return resultado;
}
