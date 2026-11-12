"use client";

import { useState } from "react";
import { NUTRIENTES_BIBLIOTECA, valorNutricional, type RecursoBiblioteca } from "@/tipos/biblioteca";
import { ComposicionAlimento } from "./composicion-alimento";

export function ComposicionReceta({ recurso }: { recurso: RecursoBiblioteca }) {
  const [base, fijarBase] = useState<"por_porcion" | "por_100g" | "total">(recurso.tipo === "preparacion" ? "por_100g" : "por_porcion");
  const calculo = recurso.calculo;
  const valores = calculo?.[base];
  return <section className="space-y-4 rounded-xl border p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">Composición calculada</h3><label className="flex items-center gap-2 text-xs">Base<select value={base} onChange={e => fijarBase(e.target.value as typeof base)} className="rounded-lg border bg-background px-3 py-2"><option value="por_porcion">Por porción</option><option value="por_100g">Por 100 g</option><option value="total">Receta completa</option></select></label></div>
    <dl className="grid grid-cols-2 gap-3">{NUTRIENTES_BIBLIOTECA.map((clave, i) => <div key={clave}><dt className="text-xs text-muted-foreground">{["Energía", "Proteínas", "Carbohidratos", "Grasas"][i]}</dt><dd className="mt-1 font-semibold tabular-nums">{valorNutricional(valores?.[clave], clave === "energia" ? "kcal" : "g")}</dd></div>)}</dl>
    {valores && <ComposicionAlimento recurso={{ ...recurso, contenido: valores }}/>}
    <p className="text-xs text-muted-foreground">Peso final: {valorNutricional(calculo?.peso_final, "g")} · {calculo?.origen_peso === "informado" ? "Informado" : calculo?.origen_peso === "estimado" ? "Estimado con los rendimientos" : "Sin dato"}. {recurso.contenido.porciones} porciones.</p>
    <p className="text-xs leading-relaxed text-muted-foreground">Se suman los aportes de las versiones guardadas de los ingredientes. Un nutriente faltante o una conversión desconocida deja ese resultado como Sin dato. El rendimiento modifica el peso estimado; no estima pérdidas de nutrientes por cocción. Valores redondeados a dos decimales solo al mostrar.</p>
    <p className="text-xs text-muted-foreground">La barra compara gramos de macronutrientes, no porcentajes de energía.</p>
  </section>;
}
