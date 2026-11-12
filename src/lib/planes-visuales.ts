import { resumirRecursoBiblioteca } from "@/lib/composicion-biblioteca";
import type { MomentoComida } from "@/tipos/entidades";
import { NUTRIENTES_BIBLIOTECA, type NutrientesBiblioteca } from "@/tipos/biblioteca";
import type { BloquePlan, DocumentoPlan, EntradaPlan, RecursoEnPlan } from "@/tipos/plan-visual";

export function nuevoBloque(tipo: BloquePlan["tipo"]): BloquePlan {
  return { id: crypto.randomUUID(), tipo, titulo: tipo === "semana" ? "Mi semana" : tipo === "opciones" ? "Opciones para cada día" : "Una guía para vos", texto: "", entradas: [] };
}
export function nuevaEntrada(dia = 0, momento: MomentoComida = "desayuno"): EntradaPlan {
  return { id: crypto.randomUUID(), dia, momento, detalle: "", recursos: [] };
}
export function copiarBloque(bloque: BloquePlan): BloquePlan {
  return { ...structuredClone(bloque), id: crypto.randomUUID(), entradas: bloque.entradas.map(e => ({ ...structuredClone(e), id: crypto.randomUUID() })) };
}
/** Adapta los planes anteriores al editor sin tocar el contenido persistido. */
export function documentoDesdeComidas(comidas: { momento: MomentoComida; detalle: string }[]): DocumentoPlan {
  return { objetivo: "", etiquetas: [], bloques: comidas.length ? [{ ...nuevoBloque("opciones"), entradas: comidas.map(c => ({ ...nuevaEntrada(0, c.momento), detalle: c.detalle })) }] : [] };
}
export function nutrientesRecursoPlan(referencia: RecursoEnPlan): NutrientesBiblioteca {
  const sinDatos = { energia: null, proteinas: null, carbohidratos: null, grasas: null };
  if (!referencia.instantanea) return sinDatos;
  const recurso = resumirRecursoBiblioteca(referencia.instantanea.recurso, referencia.instantanea.relaciones);
  const base = recurso.tipo === "suplemento" ? recurso.calculo_suplemento?.variantes[referencia.variante ?? 0]?.mezcla : recurso.calculo?.por_porcion;
  return Object.fromEntries(NUTRIENTES_BIBLIOTECA.map(c => [c, base?.[c] == null ? null : base[c]! * referencia.cantidad])) as NutrientesBiblioteca;
}
export function resumenDocumento(documento: DocumentoPlan) {
  const entradas = documento.bloques.flatMap(b => b.entradas);
  return { bloques: documento.bloques.length, comidas: entradas.filter(e => e.detalle.trim() || e.recursos.length).length, recursos: entradas.reduce((n, e) => n + e.recursos.length, 0) };
}
