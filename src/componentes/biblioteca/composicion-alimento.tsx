import { valorNutricional, type RecursoBiblioteca } from "@/tipos/biblioteca";

export function ComposicionAlimento({ recurso }: { recurso: RecursoBiblioteca }) {
  const c = recurso.contenido;
  const completa = c.proteinas != null && c.carbohidratos != null && c.grasas != null;
  const total = (c.proteinas ?? 0) + (c.carbohidratos ?? 0) + (c.grasas ?? 0);
  return <div className="space-y-2"><p className="text-xs text-muted-foreground">P {valorNutricional(c.proteinas, "g")} · C {valorNutricional(c.carbohidratos, "g")} · G {valorNutricional(c.grasas, "g")}</p>{completa && total > 0 && <><div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><span className="bg-primary" style={{ width: `${(c.proteinas ?? 0) / total * 100}%` }}/><span className="bg-chart-2" style={{ width: `${(c.carbohidratos ?? 0) / total * 100}%` }}/><span className="bg-chart-4" style={{ width: `${(c.grasas ?? 0) / total * 100}%` }}/></div><p className="sr-only">Distribución proporcional de gramos declarados; no representa porcentajes de energía.</p></>}</div>;
}
