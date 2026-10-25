"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { requerirProfesional } from "@/autorizacion/sesion";
import { resultadoDeValidacion } from "@/esquemas/resultado";
import {
  esquemaAltaEvolucion,
  esquemaEdicionEvolucion,
  type DatosAltaEvolucion,
  type DatosEdicionEvolucion,
} from "@/esquemas/evolucion";
import { actualizarEvolucion, crearEvolucion, eliminarBorradorEvolucion } from "@/servicios/evoluciones";
import { esquemaUuid } from "@/esquemas/comunes";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function registrarEvolucion(datos: DatosAltaEvolucion): Promise<ResultadoAccion<{ evolucionId: string }>> {
  const contexto = await requerirProfesional();
  const validacion = esquemaAltaEvolucion.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);
  const cliente = await crearClienteServidor();
  const resultado = await crearEvolucion(cliente, contexto.consultorio.id, validacion.data);
  if (!resultado.ok || !resultado.datos) return resultado;
  redirect(`/panel/pacientes/${validacion.data.pacienteId}/historia/${resultado.datos.evolucionId}`);
}

export async function guardarEvolucion(datos: DatosEdicionEvolucion): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  const validacion = esquemaEdicionEvolucion.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);
  const cliente = await crearClienteServidor();
  const resultado = await actualizarEvolucion(cliente, contexto.consultorio.id, validacion.data);
  if (resultado.ok) refresh();
  return resultado;
}

export async function borrarBorrador(evolucionId: string, pacienteId: string): Promise<ResultadoAccion> {
  const contexto = await requerirProfesional();
  if (!esquemaUuid.safeParse(evolucionId).success) return { ok: false, mensaje: "Evolución inválida." };
  const cliente = await crearClienteServidor();
  const resultado = await eliminarBorradorEvolucion(cliente, contexto.consultorio.id, evolucionId);
  if (!resultado.ok) return resultado;
  redirect(`/panel/pacientes/${pacienteId}/historia`);
}
