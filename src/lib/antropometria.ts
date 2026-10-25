/** IMC redondeado a un decimal. No implica una interpretación clínica. */
export function calcularImc(pesoKg: number | null, tallaCm: number | null): number | null {
  if (pesoKg == null || tallaCm == null || tallaCm <= 0) return null;
  const tallaMetros = tallaCm / 100;
  return Math.round((pesoKg / (tallaMetros * tallaMetros)) * 10) / 10;
}

export function nombreCompleto(persona: { nombre: string; apellido: string }): string {
  return `${persona.apellido}, ${persona.nombre}`.trim();
}

export function nombreNatural(persona: { nombre: string; apellido: string }): string {
  return `${persona.nombre} ${persona.apellido}`.trim();
}
