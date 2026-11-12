"use client";

import { useState } from "react";
import { CalendarDays, ListChecks, NotebookPen, Salad } from "lucide-react";
import { DIAS_PLAN, type BloquePlan, type DocumentoPlan, type EntradaPlan } from "@/tipos/plan-visual";
import { ETIQUETAS_MOMENTO_COMIDA } from "@/configuracion/clinica";
import { nutrientesRecursoPlan } from "@/lib/planes-visuales";
import { medidaSuplemento, valorNutricional } from "@/tipos/biblioteca";
import { Button } from "@/componentes/ui/button";
import { cn } from "@/lib/utilidades";

export function DocumentoDelPlan({ titulo, indicaciones, documento, paciente, profesional, version, fecha }: {
  titulo: string; indicaciones: string; documento: DocumentoPlan; paciente?: string; profesional?: string; version?: number; fecha?: string;
}) {
  return <article className="documento-plan min-w-0 space-y-7 rounded-3xl border bg-card p-5 sm:p-8">
    <header className="space-y-4 border-b pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-primary"><span className="inline-flex items-center gap-2"><Salad className="size-4" aria-hidden="true" />Nutrisfera · Tu alimentación, a tu medida</span>{version ? <span>Versión {version}{fecha ? ` · ${fecha}` : ""}</span> : <span>Vista previa · Sin entregar</span>}</div>
      <h2 className="text-2xl leading-tight font-semibold tracking-tight wrap-anywhere sm:text-3xl">{titulo || "Tu plan alimentario"}</h2>
      {paciente && <p className="text-sm text-muted-foreground">Preparado para <strong className="text-foreground">{paciente}</strong>{profesional ? ` · ${profesional}` : ""}</p>}
      {documento.objetivo && <p className="whitespace-pre-wrap text-sm leading-relaxed wrap-anywhere">{documento.objetivo}</p>}
    </header>
    {documento.bloques.map((bloque, indice) => <SeccionDocumento key={bloque.id} bloque={bloque} numero={indice + 1} />)}
    {!documento.bloques.length && <p className="py-8 text-center text-sm text-muted-foreground">Tu plan empieza acá. Agregá una semana, opciones o una nota desde el editor.</p>}
    {indicaciones.trim() && <section className="space-y-2 rounded-2xl bg-accent/40 p-5"><h3 className="font-semibold">Para tener en cuenta</h3><p className="whitespace-pre-wrap text-sm leading-relaxed wrap-anywhere">{indicaciones}</p></section>}
    <footer className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">Este plan fue preparado por tu profesional. Conversá con él si necesitás adaptaciones o tenés dudas.</footer>
  </article>;
}

function SeccionDocumento({ bloque, numero }: { bloque: BloquePlan; numero: number }) {
  const [dia, fijarDia] = useState(0);
  const Icono = bloque.tipo === "semana" ? CalendarDays : bloque.tipo === "opciones" ? ListChecks : NotebookPen;
  return <section className="min-w-0 space-y-4">
    <h3 className="flex items-center gap-3 font-semibold"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icono className="size-4" aria-hidden="true" /></span><span className="wrap-anywhere"><span className="mr-2 text-xs font-normal text-muted-foreground">{String(numero).padStart(2, "0")}</span>{bloque.titulo}</span></h3>
    {bloque.texto && <p className="whitespace-pre-wrap text-sm leading-relaxed wrap-anywhere">{bloque.texto}</p>}
    {bloque.tipo === "semana" ? <>
      <div className="flex flex-wrap gap-1 print:hidden" aria-label={`Días de ${bloque.titulo}`}>{DIAS_PLAN.map((nombre, indice) => <Button key={nombre} type="button" size="sm" className="min-h-10" variant={dia === indice ? "default" : "ghost"} aria-pressed={dia === indice} onClick={() => fijarDia(indice)}>{nombre.slice(0, 3)}</Button>)}</div>
      {DIAS_PLAN.map((nombre, indice) => <div key={nombre} className={cn("space-y-3 print:block", dia !== indice && "hidden")}><h4 className="text-sm font-semibold text-primary">{nombre}</h4><ComidasDocumento entradas={bloque.entradas.filter(e => e.dia === indice)} /></div>)}
    </> : bloque.tipo === "opciones" ? <ComidasDocumento entradas={bloque.entradas} /> : null}
  </section>;
}
function ComidasDocumento({ entradas }: { entradas: EntradaPlan[] }) {
  const completas = entradas.filter(e => e.detalle.trim() || e.recursos.length);
  return completas.length ? <ul className="space-y-3">{completas.map(entrada => <li key={entrada.id} className="comida-documento space-y-3 rounded-2xl border p-4">
    <h5 className="text-sm font-semibold text-primary">{ETIQUETAS_MOMENTO_COMIDA[entrada.momento]}</h5>
    {entrada.detalle && <p className="whitespace-pre-wrap text-sm leading-relaxed wrap-anywhere">{entrada.detalle}</p>}
    {entrada.recursos.map((referencia, indice) => {
      const recurso = referencia.instantanea?.recurso;
      const variante = recurso?.contenido.variantes?.[referencia.variante ?? 0];
      const aporte = nutrientesRecursoPlan(referencia);
      return <div key={`${referencia.id}-${indice}`} className="space-y-2 rounded-xl bg-muted/50 p-3 text-sm">
        <p className="font-medium wrap-anywhere">{recurso?.nombre ?? "Recurso de Biblioteca"}<span className="block text-xs font-normal text-muted-foreground">{referencia.cantidad} {recurso?.tipo === "suplemento" ? `× ${variante?.nombre ?? "preparación"}` : "porción/es"}</span></p>
        {variante && recurso && <p className="text-xs text-muted-foreground">Cada preparación: {variante.medidas} medida/s de {medidaSuplemento(recurso.contenido)}.</p>}
        {(variante?.preparacion || recurso?.contenido.preparacion) && <p className="whitespace-pre-wrap text-xs leading-relaxed wrap-anywhere">{variante?.preparacion || recurso?.contenido.preparacion}</p>}
        {recurso?.tipo === "plato_grupos" && <ul className="space-y-1 text-xs">{referencia.instantanea?.relaciones.map((r, i) => <li key={i} className="wrap-anywhere">{((r.detalle.fraccion ?? 0) * 100).toLocaleString("es-AR")}% {r.instantanea.nombre}{r.detalle.ejemplos ? ` · ${r.detalle.ejemplos}` : ""}{r.detalle.coccion ? ` · ${r.detalle.coccion}` : ""}</li>)}</ul>}
        {recurso?.contenido.alternativas && <p className="whitespace-pre-wrap text-xs leading-relaxed wrap-anywhere">Alternativas: {recurso.contenido.alternativas}</p>}
        {recurso?.tipo !== "plato_grupos" && <p className="text-xs text-muted-foreground">{valorNutricional(aporte.energia, "kcal")} · P {valorNutricional(aporte.proteinas, "g")} · C {valorNutricional(aporte.carbohidratos, "g")} · G {valorNutricional(aporte.grasas, "g")}</p>}
      </div>;
    })}
  </li>)}</ul> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Sin comidas indicadas para este día.</p>;
}
