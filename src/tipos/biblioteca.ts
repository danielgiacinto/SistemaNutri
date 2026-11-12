export const TIPOS_BIBLIOTECA = ["plato", "plato_grupos", "alimento", "grupo", "fuente"] as const;
export type TipoBiblioteca = typeof TIPOS_BIBLIOTECA[number];
export const ESTANTES_BIBLIOTECA: Record<TipoBiblioteca, { titulo: string; singular: string; descripcion: string }> = {
  plato: { titulo: "Platos", singular: "plato", descripcion: "Recetas propias con ingredientes, porciones y preparación." },
  plato_grupos: { titulo: "Por grupos", singular: "plato por grupos", descripcion: "Platos organizados por partes y elecciones de alimentos." },
  alimento: { titulo: "Composición química", singular: "alimento", descripcion: "Alimentos con composición declarada por 100 g y fuente trazable." },
  grupo: { titulo: "Grupos", singular: "grupo", descripcion: "Grupos de alimentos, ejemplos y métodos de cocción." },
  fuente: { titulo: "Fuentes", singular: "fuente", descripcion: "Referencias, versiones, bases de cálculo y permisos de uso." },
};
export type ContenidoBiblioteca = {
  notas?: string; referencia?: string; version?: string; licencia?: string; fecha?: string; base?: string;
  energia?: number | null; proteinas?: number | null; carbohidratos?: number | null; grasas?: number | null;
  ejemplos?: string; coccion?: string; porciones?: number; peso_final?: number | null; preparacion?: string; alternativas?: string;
};
export type RecursoBiblioteca = {
  id: string; tipo: TipoBiblioteca; nombre: string; categoria: string; etiquetas: string[]; version: number;
  archivado_en: string | null; actualizado_en: string; contenido: ContenidoBiblioteca;
  fuente_id?: string | null; fuente_instantanea?: RecursoBiblioteca | null; duplicado_de?: string | null;
};
export type RelacionBiblioteca = {
  referencia_id: string; detalle: { cantidad?: number; unidad?: string; gramos_por_unidad?: number | null; rendimiento?: number; fraccion?: number; ejemplos?: string; coccion?: string };
  instantanea: RecursoBiblioteca;
};
export type DetalleBiblioteca = { recurso: RecursoBiblioteca; relaciones: RelacionBiblioteca[]; historial: { version: number; guardada_en: string }[] };
export type ListadoBiblioteca = { recursos: RecursoBiblioteca[]; total: number; contadores: Partial<Record<TipoBiblioteca, number>>; categorias: string[] };
export type FiltroBiblioteca = { tipo: TipoBiblioteca; q: string; categoria: string; archivados: boolean; pagina: number };
export function valorNutricional(valor: number | null | undefined, unidad: string) {
  return valor == null ? "Sin dato" : `${valor.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ${unidad}`;
}
