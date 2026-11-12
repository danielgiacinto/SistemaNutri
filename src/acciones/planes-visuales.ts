"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaUuid } from "@/esquemas/comunes";
import { esquemaGuardarPlantilla, esquemaPlanVisual, esquemaDocumentoPlan } from "@/esquemas/plan-visual";
import { resultadoDeValidacion } from "@/esquemas/resultado";
import { asignarPlantillaPlan, listarPlantillasPlanes, modificarPlantillaPlan, persistirPlanVisual } from "@/servicios/planes-visuales";
import type { DatosPlanVisual, DocumentoPlan } from "@/tipos/plan-visual";

export async function guardarDocumentoPlan(datos: DatosPlanVisual) {
  await requerirProfesional();
  const validacion = esquemaPlanVisual.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);
  const resultado = await persistirPlanVisual(await crearClienteServidor(), validacion.data);
  if (resultado.ok) refresh();
  return resultado;
}
export async function guardarPlantillaPlan(datos: { id: string; version: number; titulo: string; indicaciones: string; documento: DocumentoPlan }) {
  await requerirProfesional();
  const validacion = esquemaGuardarPlantilla.safeParse(datos);
  if (!validacion.success) return resultadoDeValidacion(validacion.error);
  const resultado = await modificarPlantillaPlan(await crearClienteServidor(), "guardar", validacion.data);
  if (resultado.ok) refresh();
  return resultado;
}
export async function crearPlantillaPlan() {
  await requerirProfesional();
  const resultado = await modificarPlantillaPlan(await crearClienteServidor(), "crear", { titulo: "Mi nuevo plan", indicaciones: "", documento: { objetivo: "", etiquetas: [], bloques: [] } });
  if (!resultado.ok || !resultado.datos) return resultado;
  redirect(`/panel/planes/plantillas/${resultado.datos.id}`);
}
export async function duplicarPlantillaPlan(id: string, version: number) {
  await requerirProfesional();
  if (!esquemaUuid.safeParse(id).success || !Number.isInteger(version) || version < 1) return { ok: false as const, mensaje: "Plantilla inválida." };
  const resultado = await modificarPlantillaPlan(await crearClienteServidor(), "duplicar", { id, version });
  if (!resultado.ok || !resultado.datos) return resultado;
  redirect(`/panel/planes/plantillas/${resultado.datos.id}`);
}
export async function usarPlantillaPlan(plantillaId: string, pacienteId: string) {
  await requerirProfesional();
  if (![plantillaId, pacienteId].every(id => esquemaUuid.safeParse(id).success)) return { ok: false as const, mensaje: "Elegí una plantilla y un paciente válidos." };
  const resultado = await asignarPlantillaPlan(await crearClienteServidor(), plantillaId, pacienteId);
  if (!resultado.ok || !resultado.datos) return resultado;
  redirect(`/panel/pacientes/${pacienteId}/planes/${resultado.datos.id}`);
}
export async function leerPlantillasPlanes() {
  await requerirProfesional();
  return listarPlantillasPlanes(await crearClienteServidor());
}
export async function guardarGrillaPlan(titulo: string, documento: DocumentoPlan) {
  await requerirProfesional();
  const validacion = esquemaDocumentoPlan.safeParse(documento);
  if (!validacion.success || !titulo.trim() || titulo.length > 160 || documento.bloques.length !== 1 || documento.bloques[0].tipo === "texto") return { ok: false as const, mensaje: "Elegí una semana u opciones válidas para guardar." };
  return modificarPlantillaPlan(await crearClienteServidor(), "crear", { titulo, clase: "grilla", indicaciones: "", documento: validacion.data });
}
