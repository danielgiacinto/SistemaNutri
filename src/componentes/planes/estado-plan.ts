export function estadoDelPlan(cambiosSinPublicar: boolean, publicaciones: number): string {
  if (publicaciones === 0) return "Borrador, todavía no publicado";
  if (cambiosSinPublicar) return "Hay cambios que el paciente todavía no ve";
  return "Publicado";
}
