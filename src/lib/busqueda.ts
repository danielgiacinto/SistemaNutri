/** Deja letras, números, espacios y algunos signos; evita meter metacaracteres en `ilike`. */
export function sanitizarBusqueda(texto: string): string {
  return texto
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s.\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function patronIlike(texto: string): string | null {
  const limpio = sanitizarBusqueda(texto);
  return limpio.length > 0 ? `%${limpio}%` : null;
}
