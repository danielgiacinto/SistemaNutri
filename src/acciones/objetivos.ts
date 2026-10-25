"use server";

import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { requerirProfesional } from "@/autorizacion/sesion";
import { resultadoDeValidacion } from "@/esquemas/resultado";
import {
  esquemaAltaObjetivo,
  esquemaEdicionObjetivo,
  type DatosAltaObjetivo,
  type DatosEdicionObjetivo,
} from "@/esquemas/objetivo";
import { actualizarObjetivo, crearObjetivo } from "@/servicios/objetivos";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function registrarObjetivo(datos: DatosAltaObjetivo): Promise<ResultadoAccion<{ objetivoId: string }>> {
  const contexto = await requerirProfesional();
  const validacion = esquemaAltaObjetivo.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);
  const cliente = await crearClienteServidor();
  const resultado = await crearObjetivo(cliente, contexto.consultorio.id, validacion.data);
  if (resultado.ok) refresh();
  return resultado;
}

export async function guardarObjetivo(datos: DatosEdicionObjetivo): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  const validacion = esquemaEdicionObjetivo.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);
  const cliente = await crearClienteServidor();
  const resultado = await actualizarObjetivo(cliente, contexto.consultorio.id, validacion.data);
  if (resultado.ok) refresh();
  return resultado;
}
