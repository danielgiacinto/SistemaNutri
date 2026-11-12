import { z } from "zod";
import { esFechaIso } from "@/lib/fechas";
import { esquemaUuid, textoObligatorio } from "./comunes";
import { TIPOS_BIBLIOTECA } from "@/tipos/biblioteca";

const texto = z.string().trim().max(6000).default("");
const nutricion = (maximo: number) => z.number().min(0).max(maximo).nullable();
const identidad = { id: esquemaUuid.optional(), version: z.number().int().positive().optional(), nombre: textoObligatorio("el nombre", 150), categoria: z.string().trim().max(80), etiquetas: z.array(z.string().trim().min(1).max(30)).max(12) };
const relacionIngrediente = z.object({ referencia_id: esquemaUuid, referencia_version: z.number().int().positive(), detalle: z.object({ cantidad: z.number().min(.001).max(1000000), unidad: z.enum(["g", "ml", "unidad", "porcion"]), gramos_por_unidad: z.number().min(.001).max(1000000).nullable(), rendimiento: z.number().min(.001).max(1000) }).strict().refine(d => d.unidad !== "g" || d.gramos_por_unidad === 1, "La conversión de gramos debe ser 1.") }).strict();
const relacionGrupo = z.object({ referencia_id: esquemaUuid, referencia_version: z.number().int().positive(), detalle: z.object({ fraccion: z.number().min(.0001).max(1), ejemplos: z.string().max(1000), coccion: z.string().max(1000) }).strict() }).strict();
const sinRelaciones = z.array(z.never()).max(0).default([]);
export const esquemaRecursoBiblioteca = z.discriminatedUnion("tipo", [
  z.object({ ...identidad, tipo: z.literal("fuente"), contenido: z.object({ referencia: textoObligatorio("la referencia",1000), version: textoObligatorio("la versión o fecha de referencia",1000), licencia: textoObligatorio("la licencia o permiso de uso",1000), base: textoObligatorio("la base de cálculo",1000), fecha: z.string().refine(v => !v || esFechaIso(v), "La fecha no es válida."), notas: texto }).strict(), relaciones: sinRelaciones }).strict(),
  z.object({ ...identidad, tipo: z.literal("alimento"), fuente_id: esquemaUuid, fuente_version: z.number().int().positive(), contenido: z.object({ energia: nutricion(10000), proteinas: nutricion(100), carbohidratos: nutricion(100), grasas: nutricion(100), notas: texto }).strict().refine(c => (c.proteinas ?? 0) + (c.carbohidratos ?? 0) + (c.grasas ?? 0) <= 100, "Los macronutrientes no pueden superar 100 g en total por 100 g de alimento."), relaciones: sinRelaciones }).strict(),
  z.object({ ...identidad, tipo: z.literal("grupo"), contenido: z.object({ ejemplos: texto, coccion: texto, notas: texto }).strict(), relaciones: sinRelaciones }).strict(),
  z.object({ ...identidad, tipo: z.literal("plato"), contenido: z.object({ porciones: z.number().min(.001).max(10000), peso_final: z.number().min(.001).max(1000000).nullable(), preparacion: texto, alternativas: texto, notas: texto }).strict(), relaciones: z.array(relacionIngrediente).min(1,"Agregá al menos un ingrediente.").max(100) }).strict(),
  z.object({ ...identidad, tipo: z.literal("plato_grupos"), contenido: z.object({ preparacion: texto, alternativas: texto, notas: texto }).strict(), relaciones: z.array(relacionGrupo).min(1,"Agregá al menos un grupo.").max(100).refine(filas => Math.abs(filas.reduce((s, f) => s + f.detalle.fraccion, 0) - 1) <= .000001, "Las partes deben sumar 100%.") }).strict(),
]).refine(d => (!d.id && !d.version) || (!!d.id && !!d.version), "La versión del recurso no es válida.");

export const esquemaFiltroBiblioteca = z.object({ tipo: z.enum(TIPOS_BIBLIOTECA).default("plato"), q: z.string().trim().max(100).default(""), categoria: z.string().max(80).default(""), archivados: z.boolean().default(false), pagina: z.number().int().min(1).max(100000).default(1) });
export const esquemaOperacionBiblioteca = z.object({ accion: z.enum(["duplicar", "archivar", "restaurar"]), id: esquemaUuid, version: z.number().int().positive() }).strict();
