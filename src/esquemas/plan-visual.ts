import { z } from "zod";
import { MOMENTOS_COMIDA } from "@/configuracion/clinica";
import { ETIQUETAS_PLAN } from "@/tipos/plan-visual";
import { esquemaUuid } from "./comunes";

const recurso = z.object({ id: esquemaUuid, version: z.number().int().positive(), cantidad: z.number().min(.01).max(1000), variante: z.number().int().min(0).max(9).nullable() });
const entrada = z.object({ id: esquemaUuid, dia: z.number().int().min(0).max(6), momento: z.enum(MOMENTOS_COMIDA), detalle: z.string().max(2000), recursos: z.array(recurso).max(5) });
const bloque = z.object({ id: esquemaUuid, tipo: z.enum(["semana", "opciones", "texto"]), titulo: z.string().trim().min(1).max(160), texto: z.string().max(8000), entradas: z.array(entrada).max(100) });
export const esquemaDocumentoPlan = z.object({ objetivo: z.string().trim().max(1000), etiquetas: z.array(z.enum(ETIQUETAS_PLAN)).max(6), bloques: z.array(bloque).max(20) })
  .refine(d => d.bloques.reduce((total, b) => total + b.entradas.length, 0) <= 200, "El documento admite hasta 200 comidas.")
  .refine(d => new Set(d.bloques.map(b => b.id)).size === d.bloques.length && d.bloques.every(b => new Set(b.entradas.map(e => e.id)).size === b.entradas.length), "Hay partes repetidas. Duplicalas desde el editor.");
export const esquemaPlanVisual = z.object({ id: esquemaUuid, revision: z.number().int().nonnegative(), solicitud: esquemaUuid, titulo: z.string().trim().min(1, "Escribí un título.").max(160), indicaciones: z.string().max(8000), documento: esquemaDocumentoPlan, publicar: z.boolean(), pacienteId: esquemaUuid.optional() });
export const esquemaGuardarPlantilla = z.object({ id: esquemaUuid, version: z.number().int().positive(), titulo: z.string().trim().min(1).max(160), indicaciones: z.string().max(8000), documento: esquemaDocumentoPlan });
