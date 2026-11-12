export const TIPOS_BIBLIOTECA = ["plato", "plato_grupos", "suplemento", "alimento", "preparacion", "grupo", "fuente"] as const;
export type TipoBiblioteca = typeof TIPOS_BIBLIOTECA[number];
export type OrigenBiblioteca = "propio" | "base";
export const CATEGORIAS_SUPLEMENTOS = ["Proteína", "Creatina", "Aminoácidos", "Ganador", "Vitaminas", "Colágeno", "Otro"] as const;
export const UNIDADES_MEDIDA = ["g", "ml", "scoop", "capsula", "comprimido", "unidad"] as const;
export type VarianteSuplemento = { nombre: string; medidas: number; preparacion: string };
export const ESTANTES_BIBLIOTECA: Record<TipoBiblioteca, { titulo: string; singular: string; descripcion: string }> = {
  plato: { titulo: "Platos", singular: "plato", descripcion: "Recetas propias con ingredientes, porciones y preparación." },
  plato_grupos: { titulo: "Por grupos", singular: "plato por grupos", descripcion: "Platos organizados por partes y elecciones de alimentos." },
  suplemento: { titulo: "Suplementos", singular: "suplemento", descripcion: "Productos con fuente, medida declarada y variantes de preparación. Su uso requiere decisión profesional." },
  alimento: { titulo: "Composición química", singular: "alimento", descripcion: "Alimentos con composición declarada por 100 g y fuente trazable." },
  preparacion: { titulo: "Preparaciones", singular: "preparación", descripcion: "Recetas propias normalizadas por 100 g para reutilizar como ingredientes de tus platos." },
  grupo: { titulo: "Grupos", singular: "grupo", descripcion: "Grupos de alimentos, ejemplos y métodos de cocción." },
  fuente: { titulo: "Fuentes", singular: "fuente", descripcion: "Referencias, versiones, bases de cálculo y permisos de uso." },
};
export type ContenidoBiblioteca = {
  notas?: string; referencia?: string; version?: string; licencia?: string; fecha?: string; base?: string;
  energia?: number | null; proteinas?: number | null; carbohidratos?: number | null; grasas?: number | null;
  ejemplos?: string; coccion?: string; porciones?: number; peso_final?: number | null; preparacion?: string; alternativas?: string;
  marca?: string; medida_cantidad?: number; medida_unidad?: typeof UNIDADES_MEDIDA[number]; variantes?: VarianteSuplemento[];
};
export type RecursoBiblioteca = {
  id: string; tipo: TipoBiblioteca; nombre: string; categoria: string; etiquetas: string[]; version: number;
  archivado_en: string | null; actualizado_en: string; contenido: ContenidoBiblioteca;
  fuente_id?: string | null; fuente_instantanea?: RecursoBiblioteca | null; duplicado_de?: string | null;
  calculo?: CalculoBiblioteca;
  relaciones?: RelacionBiblioteca[];
  origen?: OrigenBiblioteca;
  procedencia_base?: { id: string; version: number; referencia: string; licencia: string };
  calculo_suplemento?: { producto: NutrientesBiblioteca; variantes: { producto: NutrientesBiblioteca; agregados: NutrientesBiblioteca; mezcla: NutrientesBiblioteca }[] };
};
export const NUTRIENTES_BIBLIOTECA = ["energia", "proteinas", "carbohidratos", "grasas"] as const;
export type NutrientesBiblioteca = Record<typeof NUTRIENTES_BIBLIOTECA[number], number | null>;
export type CalculoBiblioteca = {
  total: NutrientesBiblioteca; por_porcion: NutrientesBiblioteca; por_100g: NutrientesBiblioteca;
  peso_final: number | null; origen_peso: "informado" | "estimado" | "sin_dato";
  ingredientes: { gramos: number | null; peso_preparado: number | null; aporte: NutrientesBiblioteca }[];
};
export type RelacionBiblioteca = {
  referencia_id: string; detalle: { cantidad?: number; unidad?: string; gramos_por_unidad?: number | null; rendimiento?: number; fraccion?: number; ejemplos?: string; coccion?: string; variante?: number };
  instantanea: RecursoBiblioteca;
};
export type DetalleBiblioteca = { recurso: RecursoBiblioteca; relaciones: RelacionBiblioteca[]; historial: { version: number; guardada_en: string }[] };
export type ListadoBiblioteca = { recursos: RecursoBiblioteca[]; total: number; contadores: Partial<Record<TipoBiblioteca, number>>; categorias: string[] };
export type FiltroBiblioteca = { tipo: TipoBiblioteca; q: string; categoria: string; archivados: boolean; pagina: number; origen?: OrigenBiblioteca };
export function medidaSuplemento(contenido: ContenidoBiblioteca) {
  const unidad = contenido.medida_unidad === "capsula" ? "cápsula" : contenido.medida_unidad;
  return contenido.medida_cantidad == null || !unidad ? "Sin medida informada" : `${contenido.medida_cantidad.toLocaleString("es-AR")} ${unidad}`;
}
export function valorNutricional(valor: number | null | undefined, unidad: string) {
  return valor == null ? "Sin dato" : `${valor.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ${unidad}`;
}
