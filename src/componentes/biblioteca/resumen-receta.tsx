import { valorNutricional, type RecursoBiblioteca } from "@/tipos/biblioteca";
import { ComposicionAlimento } from "./composicion-alimento";

export function ResumenReceta({ recurso }: { recurso: RecursoBiblioteca }) {
  const por100 = recurso.tipo === "preparacion";
  const valores = por100 ? recurso.calculo?.por_100g : recurso.calculo?.por_porcion;
  return <span className="block space-y-1"><span className="block text-sm font-medium tabular-nums">{valorNutricional(valores?.energia, "kcal")} <span className="text-xs font-normal text-muted-foreground">/ {por100 ? "100 g" : "porción"}</span></span>{valores && <ComposicionAlimento recurso={{ ...recurso, contenido: valores }}/>}</span>;
}
