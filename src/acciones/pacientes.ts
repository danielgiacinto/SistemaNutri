"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { requerirProfesional } from "@/autorizacion/sesion";
import { resultadoDeValidacion } from "@/esquemas/resultado";
import {
  esquemaAltaPaciente,
  esquemaEdicionPaciente,
  esquemaIdPaciente,
  type DatosAltaPaciente,
  type DatosEdicionPaciente,
} from "@/esquemas/paciente";
import { actualizarPaciente, cambiarEstadoPaciente, crearPaciente } from "@/servicios/pacientes";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function registrarPaciente(datos: DatosAltaPaciente): Promise<ResultadoAccion<{ pacienteId: string }>> {
  const contexto = await requerirProfesional();
  const validacion = esquemaAltaPaciente.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await crearPaciente(cliente, contexto.consultorio.id, validacion.data);
  if (!resultado.ok || !resultado.datos) return resultado;
  redirect(`/panel/pacientes/${resultado.datos.pacienteId}`);
}

export async function guardarPaciente(pacienteId: string, datos: DatosEdicionPaciente): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  const id = esquemaIdPaciente.safeParse({ pacienteId });
  if (!id.success) return { ok: false, mensaje: "Paciente inválido." };
  const validacion = esquemaEdicionPaciente.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await actualizarPaciente(cliente, contexto.consultorio.id, id.data.pacienteId, validacion.data);
  if (resultado.ok) refresh();
  return resultado;
}

export async function desactivarPaciente(pacienteId: string): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  const id = esquemaIdPaciente.safeParse({ pacienteId });
  if (!id.success) return { ok: false, mensaje: "Paciente inválido." };
  const cliente = await crearClienteServidor();
  const resultado = await cambiarEstadoPaciente(cliente, contexto.consultorio.id, id.data.pacienteId, "inactivo");
  if (resultado.ok) refresh();
  return resultado;
}

export async function reactivarPaciente(pacienteId: string): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  const id = esquemaIdPaciente.safeParse({ pacienteId });
  if (!id.success) return { ok: false, mensaje: "Paciente inválido." };
  const cliente = await crearClienteServidor();
  const resultado = await cambiarEstadoPaciente(cliente, contexto.consultorio.id, id.data.pacienteId, "activo");
  if (resultado.ok) refresh();
  return resultado;
}
