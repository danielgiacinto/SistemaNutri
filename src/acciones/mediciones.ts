"use server";

import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { requerirProfesional } from "@/autorizacion/sesion";
import { resultadoDeValidacion } from "@/esquemas/resultado";
import {
  esquemaAltaMedicion,
  esquemaEdicionMedicion,
  type DatosAltaMedicion,
  type DatosEdicionMedicion,
} from "@/esquemas/medicion";
import { actualizarMedicion, crearMedicion } from "@/servicios/mediciones";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function registrarMedicion(datos: DatosAltaMedicion): Promise<ResultadoAccion<{ medicionId: string }>> {
  const contexto = await requerirProfesional();
  const validacion = esquemaAltaMedicion.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);
  const cliente = await crearClienteServidor();
  const resultado = await crearMedicion(
    cliente,
    contexto.consultorio.id,
    contexto.consultorio.zonaHoraria,
    validacion.data,
  );
  if (resultado.ok) refresh();
  return resultado;
}

export async function guardarMedicion(datos: DatosEdicionMedicion): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  const validacion = esquemaEdicionMedicion.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);
  const cliente = await crearClienteServidor();
  const resultado = await actualizarMedicion(
    cliente,
    contexto.consultorio.id,
    contexto.consultorio.zonaHoraria,
    validacion.data,
  );
  if (resultado.ok) refresh();
  return resultado;
}
