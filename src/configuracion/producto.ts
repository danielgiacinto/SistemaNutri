/**
 * Identidad del producto. Cambiar el nombre comercial solo requiere editar este archivo.
 */
export const NOMBRE_PRODUCTO = "Nutrisfera";

export const DESCRIPCION_PRODUCTO =
  "Plataforma para nutricionistas: pacientes, agenda, historia clínica y seguimiento nutricional en un solo lugar.";

export const ZONA_HORARIA_PREDETERMINADA = "America/Argentina/Cordoba";

export const LOCALE_PREDETERMINADO = "es-AR";

/**
 * Zonas horarias ofrecidas en la interfaz. La base de datos acepta cualquier
 * zona IANA válida; esta lista solo acota las opciones visibles.
 */
export const ZONAS_HORARIAS_DISPONIBLES = [
  { valor: "America/Argentina/Cordoba", etiqueta: "Argentina — Córdoba" },
  { valor: "America/Argentina/Buenos_Aires", etiqueta: "Argentina — Buenos Aires" },
  { valor: "America/Argentina/Mendoza", etiqueta: "Argentina — Mendoza" },
  { valor: "America/Argentina/Salta", etiqueta: "Argentina — Salta" },
  { valor: "America/Argentina/Ushuaia", etiqueta: "Argentina — Ushuaia" },
  { valor: "America/Montevideo", etiqueta: "Uruguay — Montevideo" },
  { valor: "America/Santiago", etiqueta: "Chile — Santiago" },
  { valor: "America/Asuncion", etiqueta: "Paraguay — Asunción" },
  { valor: "America/Lima", etiqueta: "Perú — Lima" },
  { valor: "America/Bogota", etiqueta: "Colombia — Bogotá" },
  { valor: "America/Mexico_City", etiqueta: "México — Ciudad de México" },
  { valor: "Europe/Madrid", etiqueta: "España — Madrid" },
] as const;

export type ZonaHoraria = (typeof ZONAS_HORARIAS_DISPONIBLES)[number]["valor"];
