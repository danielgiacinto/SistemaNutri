import type { MomentoComida } from "./entidades";
import type { DetalleBiblioteca } from "./biblioteca";

export const DIAS_PLAN = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
export const ETIQUETAS_PLAN = ["Descenso", "Aumento", "Mantenimiento", "Deportivo", "Clínico", "Vegetariano"] as const;
export type RecursoEnPlan = {
  id: string; version: number; cantidad: number; variante: number | null;
  instantanea?: Pick<DetalleBiblioteca, "recurso" | "relaciones">;
};
export type EntradaPlan = { id: string; dia: number; momento: MomentoComida; detalle: string; recursos: RecursoEnPlan[] };
export type BloquePlan = { id: string; tipo: "semana" | "opciones" | "texto"; titulo: string; texto: string; entradas: EntradaPlan[] };
export type DocumentoPlan = { objetivo: string; etiquetas: string[]; bloques: BloquePlan[] };
export type PlantillaPlan = {
  id: string; titulo: string; indicaciones: string; documento: DocumentoPlan;
  clase: "plan" | "grilla"; version: number; base: boolean; actualizado_en: string; entregas: number; usos?: number;
};
export type DatosPlanVisual = { id: string; revision: number; solicitud: string; titulo: string; indicaciones: string; documento: DocumentoPlan; publicar: boolean; pacienteId?: string };
export type GuardadoPlanVisual = { revision: number; numero: number | null; documento: DocumentoPlan };
