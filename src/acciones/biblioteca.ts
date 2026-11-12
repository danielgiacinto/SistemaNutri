"use server";

import { refresh } from "next/cache";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaFiltroBiblioteca, esquemaOperacionBiblioteca, esquemaOrigenBiblioteca, esquemaRecursoBiblioteca } from "@/esquemas/biblioteca";
import { esquemaUuid } from "@/esquemas/comunes";
import { copiarBaseBiblioteca, listarBiblioteca, modificarBiblioteca, obtenerRecursoBiblioteca } from "@/servicios/biblioteca";
import type { Json } from "@/tipos/base-datos";
import type { OrigenBiblioteca, TipoBiblioteca } from "@/tipos/biblioteca";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function guardarRecursoBiblioteca(datos: unknown): Promise<ResultadoAccion<{ id: string }>> {
  await requerirProfesional();
  const validacion = esquemaRecursoBiblioteca.safeParse(datos);
  if (!validacion.success) return { ok: false, mensaje: validacion.error.issues[0]?.message ?? "Revisá los datos." };
  const resultado = await modificarBiblioteca(await crearClienteServidor(), "guardar", validacion.data as unknown as Json);
  if (resultado.ok) refresh();
  return resultado;
}
export async function operarRecursoBiblioteca(accion: "duplicar" | "archivar" | "restaurar", id: string, version: number, origen: OrigenBiblioteca = "propio") {
  await requerirProfesional();
  const validacion = esquemaOperacionBiblioteca.safeParse({ accion, id, version });
  if (!validacion.success || !esquemaOrigenBiblioteca.safeParse(origen).success || (origen === "base" && accion !== "duplicar")) return { ok: false as const, mensaje: "La operación no es válida." };
  const cliente = await crearClienteServidor();
  const resultado = origen === "base" ? await copiarBaseBiblioteca(cliente,id,version) : await modificarBiblioteca(cliente, accion, { id, version });
  if (resultado.ok) refresh();
  return resultado;
}
export async function leerRecursoBiblioteca(id: string, version?: number, origen: OrigenBiblioteca = "propio") {
  await requerirProfesional();
  if (!esquemaUuid.safeParse(id).success || !esquemaOrigenBiblioteca.safeParse(origen).success || (version !== undefined && (!Number.isInteger(version) || version < 1))) throw new Error("Recurso inválido.");
  return obtenerRecursoBiblioteca(await crearClienteServidor(), id, version, origen);
}
export async function buscarOpcionesBiblioteca(tipo: TipoBiblioteca, q: string, pagina: number) {
  await requerirProfesional();
  const filtros = esquemaFiltroBiblioteca.parse({ tipo, q, pagina });
  return listarBiblioteca(await crearClienteServidor(), filtros);
}
