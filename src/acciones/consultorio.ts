"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { requerirTitular, requerirUsuario } from "@/autorizacion/sesion";
import { RUTAS } from "@/autorizacion/rutas";
import {
  esquemaAltaConsultorio,
  esquemaDatosConsultorio,
  type DatosAltaConsultorio,
  type DatosConsultorio,
} from "@/esquemas/consultorio";
import { resultadoDeValidacion } from "@/esquemas/resultado";
import { actualizarDatosConsultorio, crearConsultorioInicial } from "@/servicios/consultorios";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function crearConsultorio(datos: DatosAltaConsultorio): Promise<ResultadoAccion> {
  await requerirUsuario();
  const validacion = esquemaAltaConsultorio.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await crearConsultorioInicial(cliente, validacion.data);
  if (!resultado.ok) return resultado;

  redirect(RUTAS.panel);
}

export async function actualizarConsultorio(datos: DatosConsultorio): Promise<ResultadoAccion> {
  // El consultorio se toma de la sesión, nunca de los datos enviados por el cliente.
  const contexto = await requerirTitular();
  const validacion = esquemaDatosConsultorio.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await actualizarDatosConsultorio(cliente, contexto.consultorio.id, validacion.data);
  if (resultado.ok) refresh();
  return resultado;
}
