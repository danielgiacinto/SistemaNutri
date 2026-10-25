"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { requerirProfesional } from "@/autorizacion/sesion";
import { resultadoDeValidacion } from "@/esquemas/resultado";
import {
  esquemaAltaTurno,
  esquemaCancelacionTurno,
  esquemaEdicionTurno,
  type DatosAltaTurno,
  type DatosCancelacionTurno,
  type DatosEdicionTurno,
} from "@/esquemas/turno";
import { actualizarEstadoTurno, actualizarTurno, cancelarTurno, crearTurno } from "@/servicios/turnos";
import { esquemaUuid } from "@/esquemas/comunes";
import type { ResultadoAccion } from "@/tipos/acciones";
import type { Turno } from "@/tipos/entidades";

export async function registrarTurno(datos: DatosAltaTurno): Promise<ResultadoAccion<{ turnoId: string }>> {
  const contexto = await requerirProfesional();
  const validacion = esquemaAltaTurno.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await crearTurno(cliente, contexto.consultorio.id, contexto.consultorio.zonaHoraria, validacion.data);
  if (!resultado.ok || !resultado.datos) return resultado;
  redirect(`/panel/agenda/${resultado.datos.turnoId}`);
}

export async function guardarTurno(datos: DatosEdicionTurno): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  const validacion = esquemaEdicionTurno.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await actualizarTurno(
    cliente,
    contexto.consultorio.id,
    contexto.consultorio.zonaHoraria,
    validacion.data,
  );
  if (resultado.ok) refresh();
  return resultado;
}

export async function marcarTurnoCancelado(datos: DatosCancelacionTurno): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  const validacion = esquemaCancelacionTurno.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await cancelarTurno(
    cliente,
    contexto.consultorio.id,
    validacion.data.turnoId,
    validacion.data.motivoCancelacion,
  );
  if (resultado.ok) refresh();
  return resultado;
}

export async function cambiarEstadoTurno(
  turnoId: string,
  estado: Exclude<Turno["estado"], "cancelado">,
): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  if (!esquemaUuid.safeParse(turnoId).success) return { ok: false, mensaje: "Turno inválido." };
  const cliente = await crearClienteServidor();
  const resultado = await actualizarEstadoTurno(cliente, contexto.consultorio.id, turnoId, estado);
  if (resultado.ok) refresh();
  return resultado;
}
