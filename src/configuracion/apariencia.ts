/**
 * Preferencias visuales. Los colores de cada paleta viven en `src/app/globals.css`
 * como tokens CSS; acá solo se declaran los identificadores y etiquetas.
 */
export const PALETAS = [
  { id: "salvia", etiqueta: "Salvia", muestra: "oklch(0.55 0.11 165)" },
  { id: "oceano", etiqueta: "Océano", muestra: "oklch(0.55 0.16 250)" },
  { id: "lavanda", etiqueta: "Lavanda", muestra: "oklch(0.55 0.17 295)" },
  { id: "terracota", etiqueta: "Terracota", muestra: "oklch(0.56 0.15 40)" },
] as const;

export type Paleta = (typeof PALETAS)[number]["id"];

export const PALETA_PREDETERMINADA: Paleta = "salvia";

export const IDS_PALETAS = PALETAS.map((paleta) => paleta.id) as [Paleta, ...Paleta[]];

/** Valores del tema tal como se guardan en la base de datos. */
export const TEMAS = [
  { id: "sistema", etiqueta: "Según el sistema" },
  { id: "claro", etiqueta: "Claro" },
  { id: "oscuro", etiqueta: "Oscuro" },
] as const;

export type Tema = (typeof TEMAS)[number]["id"];

export const IDS_TEMAS = TEMAS.map((tema) => tema.id) as [Tema, ...Tema[]];

/** Equivalencia entre el tema guardado y el valor que usa next-themes. */
export const TEMA_A_NEXT_THEMES: Record<Tema, "system" | "light" | "dark"> = {
  sistema: "system",
  claro: "light",
  oscuro: "dark",
};

/** Clave de localStorage donde se recuerda la paleta para aplicarla antes del primer pintado. */
export const CLAVE_ALMACEN_PALETA = "nutri-paleta";

export function esPaletaValida(valor: unknown): valor is Paleta {
  return typeof valor === "string" && (IDS_PALETAS as string[]).includes(valor);
}
