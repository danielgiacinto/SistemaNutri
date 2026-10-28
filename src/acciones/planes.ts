"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { requerirProfesional } from "@/autorizacion/sesion";
import { resultadoDeValidacion } from "@/esquemas/resultado";
import { esquemaAltaPlan, esquemaPlan, type DatosAltaPlan, type DatosPlan } from "@/esquemas/plan";
import { esquemaUuid } from "@/esquemas/comunes";
import { crearPlan, eliminarPlanSinPublicar, guardarPlan } from "@/servicios/planes";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function registrarPlan(datos: DatosAltaPlan): Promise<ResultadoAccion<{ planId: string }>> {
  const contexto = await requerirProfesional();
  const validacion = esquemaAltaPlan.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await crearPlan(cliente, contexto.consultorio.id, validacion.data);
  if (!resultado.ok || !resultado.datos) return resultado;
  redirect(`/panel/pacientes/${validacion.data.pacienteId}/planes/${resultado.datos.planId}`);
}

export async function guardarPlanActual(datos: DatosPlan): Promise<ResultadoAccion> {
  await requerirProfesional();
  const validacion = esquemaPlan.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await guardarPlan(cliente, validacion.data);
  if (resultado.ok) refresh();
  return resultado;
}

export async function borrarPlan(planId: string, pacienteId: string): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  if (!esquemaUuid.safeParse(planId).success) return { ok: false, mensaje: "Plan inválido." };
  const cliente = await crearClienteServidor();
  const resultado = await eliminarPlanSinPublicar(cliente, contexto.consultorio.id, planId);
  if (!resultado.ok) return resultado;
  redirect(`/panel/pacientes/${pacienteId}/planes`);
}
