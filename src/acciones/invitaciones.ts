"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { obtenerUrlSitio } from "@/lib/url-sitio";
import { requerirProfesional, requerirUsuario } from "@/autorizacion/sesion";
import { RUTAS } from "@/autorizacion/rutas";
import { esquemaIdPaciente } from "@/esquemas/paciente";
import { aceptarInvitacion, crearInvitacionPaciente } from "@/servicios/invitaciones";
import { obtenerPaciente } from "@/servicios/pacientes";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function invitarPaciente(
  pacienteId: string,
): Promise<ResultadoAccion<{ enlace: string; correoEnviado: boolean }>> {
  const contexto = await requerirProfesional();
  const id = esquemaIdPaciente.safeParse({ pacienteId });
  if (!id.success) return { ok: false, mensaje: "Paciente inválido." };

  const cliente = await crearClienteServidor();
  const paciente = await obtenerPaciente(cliente, contexto.consultorio.id, id.data.pacienteId);
  if (!paciente) return { ok: false, mensaje: "No encontramos a ese paciente." };

  const resultado = await crearInvitacionPaciente(
    cliente,
    contexto.consultorio.id,
    contexto.consultorio.nombre,
    paciente,
    contexto.usuarioId,
    await obtenerUrlSitio(),
  );
  if (resultado.ok) refresh();
  return resultado;
}

export async function aceptarInvitacionActual(token: string | null): Promise<ResultadoAccion> {
  await requerirUsuario();
  const cliente = await crearClienteServidor();
  const resultado = await aceptarInvitacion(cliente, token);
  if (!resultado.ok) return resultado;
  redirect(RUTAS.portal);
}
