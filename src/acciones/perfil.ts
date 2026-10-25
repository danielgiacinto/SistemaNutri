"use server";

import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { requerirUsuario } from "@/autorizacion/sesion";
import {
  esquemaDatosPerfil,
  esquemaPreferenciasApariencia,
  type DatosPerfil,
  type PreferenciasApariencia,
} from "@/esquemas/perfil";
import { resultadoDeValidacion } from "@/esquemas/resultado";
import { actualizarDatosPerfil, actualizarPreferencias } from "@/servicios/perfiles";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function actualizarPerfil(datos: DatosPerfil): Promise<ResultadoAccion> {
  const contexto = await requerirUsuario();
  const validacion = esquemaDatosPerfil.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  const resultado = await actualizarDatosPerfil(cliente, contexto.usuarioId, validacion.data);
  if (!resultado.ok) return resultado;

  refresh();
  return { ok: true, mensaje: "Perfil actualizado." };
}

export async function guardarPreferenciasApariencia(
  datos: Partial<PreferenciasApariencia>,
): Promise<ResultadoAccion> {
  const contexto = await requerirUsuario();
  const validacion = esquemaPreferenciasApariencia.partial().safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);

  const cliente = await crearClienteServidor();
  return actualizarPreferencias(cliente, contexto.usuarioId, validacion.data);
}
