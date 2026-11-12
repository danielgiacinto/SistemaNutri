"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, BookOpen, CalendarDays, Check, Copy, Eye, FileText, ListChecks, LoaderCircle, Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { guardarDocumentoPlan, guardarGrillaPlan, guardarPlantillaPlan, leerPlantillasPlanes } from "@/acciones/planes-visuales";
import { DIAS_PLAN, ETIQUETAS_PLAN, type BloquePlan, type DocumentoPlan, type EntradaPlan, type PlantillaPlan } from "@/tipos/plan-visual";
import type { DetalleBiblioteca, TipoBiblioteca } from "@/tipos/biblioteca";
import { copiarBloque, nuevaEntrada, nuevoBloque, resumenDocumento } from "@/lib/planes-visuales";
import { esquemaPlanVisual } from "@/esquemas/plan-visual";
import { ETIQUETAS_MOMENTO_COMIDA, MOMENTOS_COMIDA } from "@/configuracion/clinica";
import { DocumentoDelPlan } from "./documento-plan";
import { SelectorRecurso } from "@/componentes/biblioteca/selector-recurso";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { Badge } from "@/componentes/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";

type Propiedades = {
  id: string; modo: "plantilla" | "paciente"; revision: number; titulo: string; indicaciones: string; documento: DocumentoPlan;
  pacienteId?: string; paciente?: string; profesional: string; ultimaVersion?: number;
};
const CLASE_CAMPO = "min-h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function EditorPlanVisual(propiedades: Propiedades) {
  const [titulo, fijarTitulo] = useState(propiedades.titulo);
  const [indicaciones, fijarIndicaciones] = useState(propiedades.indicaciones);
  const [documento, fijarDocumento] = useState(propiedades.documento);
  const [revision, fijarRevision] = useState(propiedades.revision);
  const [version, fijarVersion] = useState(propiedades.ultimaVersion ?? 0);
  const [sucio, fijarSucio] = useState(false);
  const [guardado, fijarGuardado] = useState(false);
  const [error, fijarError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const [vistaPrevia, fijarVistaPrevia] = useState(false);
  const [confirmar, fijarConfirmar] = useState(false);
  const [destinatarioConfirmado, fijarDestinatarioConfirmado] = useState(false);
  const [grillas, fijarGrillas] = useState<PlantillaPlan[] | null>(null);
  const [mostrarGrillas, fijarMostrarGrillas] = useState(false);
  const [biblioteca, fijarBiblioteca] = useState<{ bloque: string; entrada: string } | null>(null);
  const [tipoRecurso, fijarTipoRecurso] = useState<TipoBiblioteca>("plato");
  const [elegido, fijarElegido] = useState<DetalleBiblioteca | null>(null);
  const [variante, fijarVariante] = useState("");
  const [cantidad, fijarCantidad] = useState(1);
  const [enlaceSalida, fijarEnlaceSalida] = useState<string | null>(null);
  const permitirSalida = useRef(false);
  const solicitud = useRef<{ clave: string; id: string } | null>(null);
  const primerCampo = useRef<HTMLInputElement>(null);
  const resumen = resumenDocumento(documento);

  useEffect(() => {
    if (!sucio) return;
    const antesDeSalir = (evento: BeforeUnloadEvent) => { if (!permitirSalida.current) { evento.preventDefault(); evento.returnValue = ""; } };
    const seguirEnlace = (evento: MouseEvent) => {
      const enlace = evento.target instanceof Element ? evento.target.closest("a") : null;
      if (!enlace || enlace.target === "_blank" || enlace.hasAttribute("download") || evento.ctrlKey || evento.metaKey || evento.shiftKey || enlace.getAttribute("href")?.startsWith("#")) return;
      const destino = new URL(enlace.href);
      if (destino.origin === location.origin && destino.pathname === location.pathname && destino.search === location.search) return;
      evento.preventDefault(); evento.stopPropagation(); fijarEnlaceSalida(enlace.href);
    };
    window.addEventListener("beforeunload", antesDeSalir);
    document.addEventListener("click", seguirEnlace, true);
    return () => { window.removeEventListener("beforeunload", antesDeSalir); document.removeEventListener("click", seguirEnlace, true); };
  }, [sucio]);

  function cambiarDocumento(siguiente: DocumentoPlan) { fijarDocumento(siguiente); fijarSucio(true); fijarGuardado(false); }
  function cambiarBloque(id: string, cambio: Partial<BloquePlan>) { cambiarDocumento({ ...documento, bloques: documento.bloques.map(b => b.id === id ? { ...b, ...cambio } : b) }); }
  function cambiarEntrada(bloque: BloquePlan, id: string, cambio: Partial<EntradaPlan>) { cambiarBloque(bloque.id, { entradas: bloque.entradas.map(e => e.id === id ? { ...e, ...cambio } : e) }); }
  function agregarBloque(tipo: BloquePlan["tipo"]) { if (documento.bloques.length < 20) cambiarDocumento({ ...documento, bloques: [...documento.bloques, nuevoBloque(tipo)] }); }
  function mover(indice: number, direccion: number) { const bloques = [...documento.bloques]; [bloques[indice], bloques[indice + direccion]] = [bloques[indice + direccion], bloques[indice]]; cambiarDocumento({ ...documento, bloques }); }

  function guardar(publicar = false) {
    fijarError("");
    const datos = { id: propiedades.id, revision, solicitud: crypto.randomUUID(), titulo, indicaciones, documento, publicar, pacienteId: propiedades.pacienteId };
    const validacion = esquemaPlanVisual.safeParse(datos);
    if (!validacion.success) { const mensaje = validacion.error.issues[0]?.message ?? "Revisá el documento."; fijarError(mensaje); primerCampo.current?.focus(); return; }
    const clave = JSON.stringify({ ...datos, solicitud: undefined });
    if (!solicitud.current || solicitud.current.clave !== clave) solicitud.current = { clave, id: datos.solicitud };
    datos.solicitud = solicitud.current.id;
    iniciar(async () => {
      try {
        if (propiedades.modo === "plantilla") {
          const resultado = await guardarPlantillaPlan({ id: propiedades.id, version: revision, titulo, indicaciones, documento });
          if (!resultado.ok || !resultado.datos) { fijarError(resultado.mensaje ?? "No se pudo guardar."); return; }
          fijarRevision(resultado.datos.version); fijarDocumento(resultado.datos.documento);
        } else {
          const resultado = await guardarDocumentoPlan(datos);
          if (!resultado.ok || !resultado.datos) { fijarError(resultado.mensaje ?? "No se pudo guardar."); return; }
          fijarRevision(resultado.datos.revision); fijarDocumento(resultado.datos.documento);
          if (resultado.datos.numero) fijarVersion(resultado.datos.numero);
        }
        solicitud.current = null;
        fijarSucio(false); fijarGuardado(true); fijarConfirmar(false);
        toast.success(publicar ? "Plan entregado. El paciente ya puede ver su nueva versión." : "Cambios guardados.");
      } catch { fijarError("No pudimos confirmar el guardado. Tus cambios siguen acá; podés reintentar."); }
    });
  }

  function abrirGrillas() {
    fijarMostrarGrillas(true); fijarGrillas(null);
    iniciar(async () => { try { fijarGrillas((await leerPlantillasPlanes()).filter(p => p.clase === "grilla")); } catch { fijarError("No se pudieron cargar las grillas guardadas."); fijarMostrarGrillas(false); } });
  }
  function guardarGrilla(bloque: BloquePlan) {
    iniciar(async () => { try { const r = await guardarGrillaPlan(bloque.titulo, { objetivo: "", etiquetas: [], bloques: [bloque] }); if (!r.ok) fijarError(r.mensaje); else toast.success("Grilla guardada. Ya podés insertarla como copia en otro plan."); } catch { fijarError("No se pudo guardar la grilla. Intentá nuevamente."); } });
  }
  function insertarRecurso() {
    if (!biblioteca || !elegido || !Number.isFinite(cantidad) || cantidad < .01 || cantidad > 1000) return;
    const bloque = documento.bloques.find(b => b.id === biblioteca.bloque);
    const entrada = bloque?.entradas.find(e => e.id === biblioteca.entrada);
    if (!bloque || !entrada || entrada.recursos.length >= 5) return;
    cambiarEntrada(bloque, entrada.id, { recursos: [...entrada.recursos, { id: elegido.recurso.id, version: elegido.recurso.version, cantidad, variante: elegido.recurso.tipo === "suplemento" ? Number(variante) : null, instantanea: { recurso: elegido.recurso, relaciones: elegido.relaciones } }] });
    fijarBiblioteca(null); fijarElegido(null);
  }

  return <div className="space-y-6">
    <Dialog open={!!enlaceSalida} onOpenChange={abierto => { if (!abierto) fijarEnlaceSalida(null); }}><DialogContent><DialogHeader><DialogTitle>Tenés cambios sin guardar</DialogTitle><DialogDescription>Podés seguir editando y guardar tu trabajo antes de salir.</DialogDescription></DialogHeader><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" className="min-h-11" onClick={() => fijarEnlaceSalida(null)}>Seguir editando</Button><Button variant="destructive" className="min-h-11" onClick={() => { if (enlaceSalida) { permitirSalida.current = true; window.location.assign(enlaceSalida); } }}>Salir sin guardar</Button></div></DialogContent></Dialog>
    <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/95 p-3 shadow-sm backdrop-blur lg:top-3">
      <div className="flex items-center gap-2 text-xs"><span className="size-2 rounded-full bg-primary" /><span className="font-semibold">{propiedades.modo === "plantilla" ? "Editando plantilla" : "Editando borrador"}</span><span role="status" className="text-muted-foreground">{pendiente ? "Guardando…" : error ? "Error al guardar" : sucio ? "Sin guardar" : guardado ? "Guardado" : "Listo para editar"}</span></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-10" disabled={pendiente} onClick={() => fijarVistaPrevia(true)}><Eye aria-hidden="true" />Vista previa</Button><Button variant={propiedades.modo === "paciente" ? "outline" : "default"} className="min-h-10" disabled={pendiente} onClick={() => guardar()}>{pendiente ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}Guardar</Button>{propiedades.modo === "paciente" && <Button className="min-h-10" disabled={pendiente} onClick={() => { fijarDestinatarioConfirmado(false); fijarConfirmar(true); }}><Send aria-hidden="true" />Entregar</Button>}</div>
    </div>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_15rem]">
      <fieldset disabled={pendiente} className="min-w-0 space-y-5 disabled:opacity-70">
        <legend className="sr-only">Contenido del plan</legend>
        <section className="space-y-5 rounded-3xl border bg-card p-5 sm:p-7"><div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-primary uppercase"><FileText className="size-4" aria-hidden="true" />Un plan, una persona</div><div className="space-y-2"><label htmlFor="visual-titulo" className="text-sm font-medium">Nombre del plan</label><Input ref={primerCampo} id="visual-titulo" className="h-12 text-lg font-semibold" value={titulo} maxLength={160} onChange={e => { fijarTitulo(e.target.value); fijarSucio(true); fijarGuardado(false); }} /></div><div className="space-y-2"><label htmlFor="visual-objetivo" className="text-sm font-medium">Objetivo y presentación <span className="font-normal text-muted-foreground">· opcional</span></label><Textarea id="visual-objetivo" rows={2} maxLength={1000} placeholder="Contale qué van a trabajar y cómo lo vas a acompañar." value={documento.objetivo} onChange={e => cambiarDocumento({ ...documento, objetivo: e.target.value })} /></div><div className="space-y-2"><p className="text-sm font-medium">Organizá con etiquetas</p><div className="flex flex-wrap gap-2">{ETIQUETAS_PLAN.map(etiqueta => <Button key={etiqueta} type="button" size="sm" className="min-h-9" aria-pressed={documento.etiquetas.includes(etiqueta)} variant={documento.etiquetas.includes(etiqueta) ? "default" : "outline"} onClick={() => cambiarDocumento({ ...documento, etiquetas: documento.etiquetas.includes(etiqueta) ? documento.etiquetas.filter(e => e !== etiqueta) : [...documento.etiquetas, etiqueta] })}>{documento.etiquetas.includes(etiqueta) && <Check aria-hidden="true" />}{etiqueta}</Button>)}</div><p className="text-xs text-muted-foreground">Solo organizan tus plantillas. No se muestran como una indicación al paciente.</p></div></section>
        {documento.bloques.map((bloque, indice) => <section id={`bloque-${bloque.id}`} key={bloque.id} className="min-w-0 scroll-mt-32 overflow-hidden rounded-3xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3"><div className="flex items-center gap-2 text-xs font-medium"><span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">{indice + 1}</span>{bloque.tipo === "semana" ? "Semana" : bloque.tipo === "opciones" ? "Opciones diarias" : "Sección de texto"}</div><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" className="size-10" aria-label={`Subir ${bloque.titulo}`} disabled={indice === 0} onClick={() => mover(indice, -1)}><ArrowUp aria-hidden="true" /></Button><Button type="button" variant="ghost" size="icon" className="size-10" aria-label={`Bajar ${bloque.titulo}`} disabled={indice === documento.bloques.length - 1} onClick={() => mover(indice, 1)}><ArrowDown aria-hidden="true" /></Button><Button type="button" variant="ghost" size="icon" className="size-10" aria-label={`Duplicar ${bloque.titulo}`} disabled={documento.bloques.length >= 20} onClick={() => cambiarDocumento({ ...documento, bloques: [...documento.bloques.slice(0, indice + 1), copiarBloque(bloque), ...documento.bloques.slice(indice + 1)] })}><Copy aria-hidden="true" /></Button><Button type="button" variant="ghost" size="icon" className="size-10 text-destructive" aria-label={`Quitar ${bloque.titulo}`} onClick={() => { if (window.confirm(`¿Quitar «${bloque.titulo}» y su contenido de este borrador?`)) cambiarDocumento({ ...documento, bloques: documento.bloques.filter(b => b.id !== bloque.id) }); }}><Trash2 aria-hidden="true" /></Button></div></div>
          <div className="space-y-4 p-4 sm:p-5"><label className="block space-y-2 text-sm font-medium"><span>Título de esta parte</span><Input maxLength={160} value={bloque.titulo} onChange={e => cambiarBloque(bloque.id, { titulo: e.target.value })} /></label><label className="block space-y-2 text-sm font-medium"><span>{bloque.tipo === "texto" ? "Contenido" : "Una aclaración para esta parte · opcional"}</span><Textarea value={bloque.texto} rows={bloque.tipo === "texto" ? 5 : 2} maxLength={8000} onChange={e => cambiarBloque(bloque.id, { texto: e.target.value })} placeholder={bloque.tipo === "texto" ? "Recomendaciones, hábitos o ideas para acompañar el proceso…" : "Ej.: Elegí la opción que mejor se adapte a tu día."} /></label>
            {bloque.tipo !== "texto" && <EditorComidas bloque={bloque} alCambiar={entradas => cambiarBloque(bloque.id, { entradas })} alAbrirBiblioteca={entrada => { fijarBiblioteca({ bloque: bloque.id, entrada }); fijarElegido(null); fijarVariante(""); fijarCantidad(1); }} />}
            {bloque.tipo !== "texto" && <Button variant="ghost" className="min-h-10 text-primary" type="button" onClick={() => guardarGrilla(bloque)}><Save aria-hidden="true" />Guardar {bloque.tipo === "semana" ? "semana" : "opciones"} para reutilizar</Button>}
          </div>
        </section>)}
        <section className="rounded-3xl border border-dashed border-primary/30 bg-accent/15 p-5 text-center"><h3 className="font-semibold">{documento.bloques.length ? "Dale forma a tu plan" : "¿Por dónde empezamos?"}</h3><p className="mt-1 text-sm text-muted-foreground">Sumá las partes que necesites, en el orden que prefieras.</p><div className="mt-4 flex flex-wrap justify-center gap-2">{[["semana", "Semana", CalendarDays], ["opciones", "Opciones diarias", ListChecks], ["texto", "Texto libre", FileText]].map(([tipo, texto, Icono]) => {
          const IconoBoton = Icono as typeof CalendarDays;
          return <Button key={String(tipo)} variant="outline" className="min-h-11" type="button" disabled={documento.bloques.length >= 20} onClick={() => agregarBloque(tipo as BloquePlan["tipo"])}><IconoBoton aria-hidden="true" />{texto as string}</Button>;
        })}<Button variant="ghost" className="min-h-11" type="button" disabled={documento.bloques.length >= 20} onClick={abrirGrillas}><BookOpen aria-hidden="true" />Grillas guardadas</Button></div></section>
        <section className="space-y-3 rounded-3xl border bg-card p-5 sm:p-7"><label htmlFor="visual-indicaciones" className="font-semibold">Indicaciones generales</label><p className="text-sm text-muted-foreground">Un cierre claro con lo más importante para tu paciente.</p><Textarea id="visual-indicaciones" value={indicaciones} maxLength={8000} rows={4} placeholder="Ej.: Cómo organizar las compras, reemplazos o dudas para la próxima consulta." onChange={e => { fijarIndicaciones(e.target.value); fijarSucio(true); fijarGuardado(false); }} /></section>
      </fieldset>
      <aside className="space-y-4 xl:sticky xl:top-28"><section className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">Qué incluye</h2><p className="mt-1 text-xs text-muted-foreground">Un recorrido pensado para tu paciente.</p><div className="my-4 grid grid-cols-3 gap-2 text-center"><div><strong className="block text-xl font-semibold text-primary">{resumen.bloques}</strong><span className="text-xs text-muted-foreground">partes</span></div><div><strong className="block text-xl font-semibold text-primary">{resumen.comidas}</strong><span className="text-xs text-muted-foreground">comidas</span></div><div><strong className="block text-xl font-semibold text-primary">{resumen.recursos}</strong><span className="text-xs text-muted-foreground">recursos</span></div></div><ol className="space-y-2 border-t pt-3">{documento.bloques.map((b, i) => <li key={b.id}><a href={`#bloque-${b.id}`} className="block rounded-lg p-2 text-xs wrap-anywhere outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><span className="mr-2 text-primary">{i + 1}.</span>{b.titulo || "Sin título"}</a></li>)}</ol></section><div className="rounded-2xl bg-accent/40 p-5 text-xs leading-relaxed text-muted-foreground">{propiedades.modo === "plantilla" ? "Esta es tu base reutilizable. Cada vez que la uses se creará una copia independiente para un paciente." : <>Para <strong className="text-foreground">{propiedades.paciente}</strong>. {version ? `El portal muestra la versión ${version}.` : "Todavía no hay una versión entregada."} Guardar el borrador conserva esa entrega.</>}</div><p className="px-1 text-xs leading-relaxed text-muted-foreground">Los aportes nutricionales se muestran por recurso en la vista previa. El texto libre y los datos ausentes no se estiman.</p></aside>
    </div>
    <Dialog open={vistaPrevia} onOpenChange={fijarVistaPrevia}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Así lo verá tu paciente</DialogTitle><DialogDescription>Vista del contenido actual. La entrega se realiza desde el botón Entregar.</DialogDescription></DialogHeader><DocumentoDelPlan titulo={titulo} indicaciones={indicaciones} documento={documento} paciente={propiedades.paciente} profesional={propiedades.profesional} /></DialogContent></Dialog>
    <Dialog open={confirmar} onOpenChange={abierto => { if (!pendiente) fijarConfirmar(abierto); }}><DialogContent><DialogHeader><DialogTitle>Entregar una nueva versión</DialogTitle><DialogDescription>Revisá a quién va dirigido. Guardaremos el borrador y publicaremos su contenido en una sola operación.</DialogDescription></DialogHeader><div className="rounded-2xl bg-accent/50 p-5"><p className="text-xs text-muted-foreground">Destinatario</p><p className="mt-1 text-lg font-semibold">{propiedades.paciente}</p><p className="mt-3 text-sm wrap-anywhere">{titulo} · Versión {version + 1}</p></div><label className="flex items-start gap-3 text-sm"><input className="mt-1 size-4 accent-primary" type="checkbox" checked={destinatarioConfirmado} onChange={e => fijarDestinatarioConfirmado(e.target.checked)} disabled={pendiente} /><span>Revisé el contenido y confirmo que este plan es para {propiedades.paciente}.</span></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="min-h-11" disabled={!destinatarioConfirmado || pendiente} onClick={() => guardar(true)}><Send aria-hidden="true" />{pendiente ? "Entregando…" : "Confirmar y entregar al paciente"}</Button></DialogContent></Dialog>
    <Dialog open={mostrarGrillas} onOpenChange={fijarMostrarGrillas}><DialogContent><DialogHeader><DialogTitle>Grillas guardadas</DialogTitle><DialogDescription>Se insertan como copia. Lo que cambies acá no modifica la grilla original.</DialogDescription></DialogHeader>{!grillas ? <p role="status">Cargando grillas…</p> : grillas.length ? <ul className="space-y-2">{grillas.map(g => <li key={g.id}><Button variant="outline" className="h-auto min-h-12 w-full justify-between whitespace-normal text-left" disabled={documento.bloques.length >= 20} onClick={() => { cambiarDocumento({ ...documento, bloques: [...documento.bloques, ...g.documento.bloques.map(copiarBloque)] }); fijarMostrarGrillas(false); }}>{g.titulo}<Plus aria-hidden="true" /></Button></li>)}</ul> : <p className="py-5 text-sm text-muted-foreground">Guardá una semana o una lista de opciones desde el editor y la vas a encontrar acá.</p>}</DialogContent></Dialog>
    <Dialog open={!!biblioteca} onOpenChange={abierto => { if (!abierto) fijarBiblioteca(null); }}><DialogContent><DialogHeader><DialogTitle>Sumar desde tu Biblioteca</DialogTitle><DialogDescription>Elegí el recurso y su cantidad. Se conservará una copia de esta versión.</DialogDescription></DialogHeader><select aria-label="Tipo de recurso" className={CLASE_CAMPO} value={tipoRecurso} onChange={e => { fijarTipoRecurso(e.target.value as TipoBiblioteca); fijarElegido(null); fijarVariante(""); }}><option value="plato">Platos</option><option value="plato_grupos">Platos por grupos</option><option value="suplemento">Suplementos</option></select><SelectorRecurso key={tipoRecurso} tipo={tipoRecurso} alElegir={(_, detalle) => { fijarElegido(detalle); fijarVariante(""); }} />{elegido && <div className="space-y-4 rounded-2xl bg-accent/30 p-4"><p className="font-semibold">{elegido.recurso.nombre}<Badge className="ml-2" variant="outline">v{elegido.recurso.version}</Badge></p>{elegido.recurso.tipo === "suplemento" && <label className="block space-y-2 text-sm"><span>Variante de preparación</span><select className={CLASE_CAMPO} value={variante} onChange={e => fijarVariante(e.target.value)}><option value="">Elegí una variante</option>{elegido.recurso.contenido.variantes?.map((v, i) => <option key={i} value={i}>{v.nombre} · {v.medidas} medida/s</option>)}</select></label>}<label className="block space-y-2 text-sm"><span>{elegido.recurso.tipo === "suplemento" ? "Cantidad de preparaciones de esta variante" : "Cantidad de porciones"}</span><Input type="number" min={.01} max={1000} step={.01} value={Number.isNaN(cantidad) ? "" : cantidad} onChange={e => fijarCantidad(e.target.valueAsNumber)} /></label></div>}<Button className="min-h-11" disabled={!elegido || !Number.isFinite(cantidad) || cantidad < .01 || cantidad > 1000 || elegido.recurso.tipo === "suplemento" && variante === ""} onClick={insertarRecurso}><Plus aria-hidden="true" />Agregar como copia</Button></DialogContent></Dialog>
  </div>;
}

function EditorComidas({ bloque, alCambiar, alAbrirBiblioteca }: { bloque: BloquePlan; alCambiar: (entradas: EntradaPlan[]) => void; alAbrirBiblioteca: (entrada: string) => void }) {
  const [dia, fijarDia] = useState(0);
  function modificar(id: string, cambio: Partial<EntradaPlan>) { alCambiar(bloque.entradas.map(e => e.id === id ? { ...e, ...cambio } : e)); }
  const visibles = bloque.tipo === "semana" ? bloque.entradas.filter(e => e.dia === dia) : bloque.entradas;
  return <div className="space-y-4">
    {bloque.tipo === "semana" && <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1 sm:grid-cols-7" aria-label={`Días de ${bloque.titulo}`}>{DIAS_PLAN.map((nombre, indice) => <Button type="button" key={nombre} aria-label={nombre} variant={dia === indice ? "default" : "ghost"} className="min-h-11 px-1 text-xs" aria-pressed={dia === indice} onClick={() => fijarDia(indice)}>{nombre.slice(0, 3)}<span className="sr-only">{nombre.slice(3)}</span><span className="text-[10px] opacity-70">{bloque.entradas.filter(e => e.dia === indice).length || ""}</span></Button>)}</div>}
    {bloque.tipo === "semana" && <p className="text-sm font-semibold text-primary">{DIAS_PLAN[dia]}</p>}
    {visibles.map(entrada => <div key={entrada.id} className="space-y-3 rounded-2xl border bg-background/50 p-3 sm:p-4"><div className="flex items-center gap-2"><label className="min-w-0 flex-1"><span className="sr-only">Momento de la comida</span><select className={CLASE_CAMPO} value={entrada.momento} onChange={e => modificar(entrada.id, { momento: e.target.value as EntradaPlan["momento"] })}>{MOMENTOS_COMIDA.map(m => <option key={m} value={m}>{ETIQUETAS_MOMENTO_COMIDA[m]}</option>)}</select></label><Button type="button" variant="ghost" size="icon" className="size-10 text-muted-foreground" aria-label={`Quitar ${ETIQUETAS_MOMENTO_COMIDA[entrada.momento]}`} onClick={() => alCambiar(bloque.entradas.filter(e => e.id !== entrada.id))}><Trash2 aria-hidden="true" /></Button></div><Textarea aria-label={`Qué comer en ${ETIQUETAS_MOMENTO_COMIDA[entrada.momento]}`} placeholder="Escribí una comida o sumá un plato de tu Biblioteca…" maxLength={2000} rows={2} value={entrada.detalle} onChange={e => modificar(entrada.id, { detalle: e.target.value })} />{entrada.recursos.map((r, i) => <div key={`${r.id}-${i}`} className="flex flex-wrap items-center gap-2 rounded-xl bg-accent/40 p-3 text-xs"><span className="min-w-0 flex-1 wrap-anywhere">{r.instantanea?.recurso.nombre ?? "Recurso guardado"}<span className="block text-muted-foreground">{r.cantidad} {r.instantanea?.recurso.tipo === "suplemento" ? `× ${r.instantanea.recurso.contenido.variantes?.[r.variante ?? 0]?.nombre ?? "preparación"}` : "porción/es"} · v{r.version}</span></span><Button type="button" variant="ghost" size="icon" className="size-10" aria-label={`Quitar ${r.instantanea?.recurso.nombre ?? "recurso"}`} onClick={() => modificar(entrada.id, { recursos: entrada.recursos.filter((_, indice) => indice !== i) })}><Trash2 aria-hidden="true" /></Button></div>)}<Button variant="ghost" type="button" size="sm" className="min-h-10 text-primary" disabled={entrada.recursos.length >= 5} onClick={() => alAbrirBiblioteca(entrada.id)}><BookOpen aria-hidden="true" />Elegir de Biblioteca</Button></div>)}
    {!visibles.length && <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{bloque.tipo === "semana" ? `Armemos el ${DIAS_PLAN[dia].toLocaleLowerCase("es")}.` : "Sumá distintas opciones para que tu paciente pueda elegir."}</div>}
    <Button type="button" variant="outline" className="min-h-11 w-full border-dashed" disabled={bloque.entradas.length >= 100} onClick={() => alCambiar([...bloque.entradas, nuevaEntrada(dia)])}><Plus aria-hidden="true" />{bloque.tipo === "semana" ? `Agregar comida al ${DIAS_PLAN[dia].toLocaleLowerCase("es")}` : "Agregar opción de comida"}</Button>
  </div>;
}
