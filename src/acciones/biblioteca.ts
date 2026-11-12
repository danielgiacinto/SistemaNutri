"use server";

import { refresh } from "next/cache";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaFiltroBiblioteca, esquemaOperacionBiblioteca, esquemaRecursoBiblioteca } from "@/esquemas/biblioteca";
import { esquemaUuid } from "@/esquemas/comunes";
import { listarBiblioteca, modificarBiblioteca, obtenerRecursoBiblioteca } from "@/servicios/biblioteca";
import type { Json } from "@/tipos/base-datos";
import type { TipoBiblioteca } from "@/tipos/biblioteca";
import type { ResultadoAccion } from "@/tipos/acciones";

export async function guardarRecursoBiblioteca(datos: unknown): Promise<ResultadoAccion<{ id: string }>> {
  await requerirProfesional();
  const validacion = esquemaRecursoBiblioteca.safeParse(datos);
  if (!validacion.success) return { ok: false, mensaje: validacion.error.issues[0]?.message ?? "Revisá los datos." };
  const resultado = await modificarBiblioteca(await crearClienteServidor(), "guardar", validacion.data as unknown as Json);
  if (resultado.ok) refresh();
  return resultado;
}
export async function operarRecursoBiblioteca(accion: "duplicar" | "archivar" | "restaurar", id: string, version: number) {
  await requerirProfesional();
  const validacion = esquemaOperacionBiblioteca.safeParse({ accion, id, version });
  if (!validacion.success) return { ok: false as const, mensaje: "La operación no es válida." };
  const resultado = await modificarBiblioteca(await crearClienteServidor(), accion, { id, version });
  if (resultado.ok) refresh();
  return resultado;
}
export async function leerRecursoBiblioteca(id: string, version?: number) {
  await requerirProfesional();
  if (!esquemaUuid.safeParse(id).success || (version !== undefined && (!Number.isInteger(version) || version < 1))) throw new Error("Recurso inválido.");
  return obtenerRecursoBiblioteca(await crearClienteServidor(), id, version);
}
export async function buscarOpcionesBiblioteca(tipo: TipoBiblioteca, q: string, pagina: number) {
  await requerirProfesional();
  const filtros = esquemaFiltroBiblioteca.parse({ tipo, q, pagina });
  return listarBiblioteca(await crearClienteServidor(), filtros);
}
