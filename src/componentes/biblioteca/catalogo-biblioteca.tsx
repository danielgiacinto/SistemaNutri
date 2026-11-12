"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Archive, BookOpen, Copy, Pencil, Plus, RotateCcw } from "lucide-react";
import { leerRecursoBiblioteca, operarRecursoBiblioteca } from "@/acciones/biblioteca";
import { ESTANTES_BIBLIOTECA, valorNutricional, type DetalleBiblioteca, type ListadoBiblioteca, type OrigenBiblioteca, type TipoBiblioteca } from "@/tipos/biblioteca";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { ComposicionAlimento } from "./composicion-alimento";
import { ResumenSuplemento } from "./detalle-suplemento";
import { ResumenReceta } from "./resumen-receta";
import { EditorRecurso } from "./editor-recurso";
import { DetalleRecurso } from "./detalle-recurso";

export function CatalogoBiblioteca({ datos, tipo, filtrado, origen = "propio" }: { datos: ListadoBiblioteca; tipo: TipoBiblioteca; filtrado: boolean; origen?: OrigenBiblioteca }) {
  const [abierto, fijarAbierto] = useState(false);
  const [modo, fijarModo] = useState<"detalle" | "editar" | "nuevo">("detalle");
  const [detalle, fijarDetalle] = useState<DetalleBiblioteca | null>(null);
  const [error, fijarError] = useState("");
  const [cambios, fijarCambios] = useState(false);
  const [descartar, fijarDescartar] = useState(false);
  const [confirmarArchivo, fijarConfirmarArchivo] = useState(false);
  const [guardando, fijarGuardando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const solicitud = useRef(0);
  const retornoFoco = useRef<HTMLButtonElement | null>(null);
  const botonCrear = useRef<HTMLButtonElement | null>(null);
  const avisoDescartar = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (descartar) avisoDescartar.current?.focus(); }, [descartar]);
  const bloqueado = pendiente || guardando;
  function cargar(id: string, version?: number, editar = false, origenConsulta: OrigenBiblioteca = origen) {
    const actual = ++solicitud.current;
    fijarError(""); fijarConfirmarArchivo(false); fijarModo("detalle"); fijarDetalle(null); fijarAbierto(true);
    iniciar(async () => {
      try {
        const datos = await leerRecursoBiblioteca(id, version, origenConsulta);
        if (actual === solicitud.current) { fijarDetalle(datos); if (datos && editar) fijarModo("editar"); if (!datos) fijarError("No encontramos ese recurso o ya no tenés acceso."); }
      } catch { if (actual === solicitud.current) fijarError("No se pudo cargar el recurso. Cerrá el diálogo e intentá nuevamente."); }
    });
  }
  function cerrar(valor: boolean) {
    if (bloqueado) return;
    if (!valor && cambios) { fijarDescartar(true); return; }
    fijarAbierto(valor); fijarDescartar(false); fijarConfirmarArchivo(false);
  }
  function operar(accion: "duplicar" | "archivar" | "restaurar") {
    if (!detalle) return;
    const recurso = detalle.recurso;
    fijarError("");
    iniciar(async () => {
      try {
        const resultado = await operarRecursoBiblioteca(accion, recurso.id, recurso.version, recurso.origen ?? "propio");
        if (resultado.ok && resultado.datos) cargar(resultado.datos.id, undefined, accion === "duplicar", "propio"); else fijarError(resultado.mensaje ?? "No se pudo completar la operación.");
      } catch { fijarError("No se pudo completar la operación. Intentá nuevamente."); }
    });
  }
  const esBase = detalle?.recurso.origen === "base";
  const ultima = detalle?.recurso.version === detalle?.historial[0]?.version;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{datos.total} {datos.total === 1 ? "recurso" : "recursos"} · {origen === "base" ? "Catálogo base de Nutrisfera" : "Catálogo del consultorio"}</p>{origen === "propio" && <Button ref={botonCrear} onClick={evento => { retornoFoco.current=evento.currentTarget; ++solicitud.current; fijarModo("nuevo"); fijarDetalle(null); fijarError(""); fijarCambios(false); fijarDescartar(false); fijarAbierto(true); }}><Plus aria-hidden="true"/>Crear {ESTANTES_BIBLIOTECA[tipo].singular}</Button>}</div>
    {datos.recursos.length === 0 ? <div className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center"><BookOpen className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true"/><h2 className="font-semibold">{filtrado ? "No hay recursos que coincidan" : origen === "base" ? "Todavía no hay recursos base en este estante" : `Tu estante de ${ESTANTES_BIBLIOTECA[tipo].titulo.toLocaleLowerCase("es-AR")} está listo para empezar`}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{filtrado ? "Probá con otra búsqueda, categoría o estado." : origen === "base" ? "La colección crece con contenido revisado y trazable. Podés crear recursos propios desde Mis recursos." : tipo === "plato" ? "Cargá una fuente y sus alimentos para componer tu primera receta, o empezá por organizar grupos." : "Creá tu primer recurso propio. Podrás editarlo, duplicarlo y consultar sus versiones."}</p></div> : <ul className="divide-y overflow-hidden rounded-2xl border bg-card">{datos.recursos.map(r => <li key={r.id}><button type="button" onClick={evento => { retornoFoco.current=evento.currentTarget; cargar(r.id); }} disabled={bloqueado} className="grid w-full min-w-0 gap-3 p-4 text-left outline-none hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_minmax(10rem,15rem)] sm:items-center"><span className="min-w-0"><span className="block wrap-anywhere text-sm font-semibold">{r.nombre}</span><span className="mt-1 block text-xs text-muted-foreground">{r.categoria || "Sin categoría"} · v{r.version}{r.archivado_en ? " · Archivado" : ""}{(r.tipo === "plato" || r.tipo === "preparacion") ? ` · ${r.contenido.porciones} porciones · ${valorNutricional(r.calculo?.peso_final,"g finales")}` : ""}</span>{r.etiquetas.length > 0 && <span className="mt-2 flex flex-wrap gap-1">{r.etiquetas.map(e => <span key={e} className="rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">{e}</span>)}</span>}</span><span className="min-w-0">{r.tipo === "suplemento" ? <ResumenSuplemento recurso={r}/> : r.tipo === "alimento" ? <><span className="mb-1 block text-sm font-medium tabular-nums">{valorNutricional(r.contenido.energia,"kcal")} <span className="text-xs font-normal text-muted-foreground">/ 100 g</span></span><ComposicionAlimento recurso={r}/></> : r.tipo === "plato" || r.tipo === "preparacion" ? <ResumenReceta recurso={r}/> : <span className="text-xs text-muted-foreground">{r.tipo.startsWith("plato") ? "Composición: Sin dato · Ver detalle" : "Ver detalle y versiones"}</span>}</span></button></li>)}</ul>}
    <Dialog open={abierto} onOpenChange={cerrar}><DialogContent onCloseAutoFocus={evento => { evento.preventDefault(); (retornoFoco.current?.isConnected ? retornoFoco.current : botonCrear.current)?.focus(); }} className="sm:max-w-3xl" onInteractOutside={e => e.preventDefault()} onEscapeKeyDown={e => { if (bloqueado) e.preventDefault(); }}><DialogHeader><DialogTitle>{modo === "nuevo" ? `Crear ${ESTANTES_BIBLIOTECA[tipo].singular}` : modo === "editar" ? `Editar ${detalle?.recurso.nombre ?? "recurso"}` : detalle?.recurso.nombre ?? "Detalle de biblioteca"}</DialogTitle><DialogDescription>{modo === "detalle" ? "Datos guardados y versiones del recurso reutilizable." : "Guardá de forma explícita. Cancelar conserva la versión anterior."}</DialogDescription></DialogHeader>
      {descartar && <div ref={avisoDescartar} tabIndex={-1} role="alert" className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm">Tenés cambios sin guardar. ¿Querés descartarlos?</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { fijarCambios(false); fijarDescartar(false); fijarAbierto(false); }}>Descartar cambios</Button><Button size="sm" onClick={() => fijarDescartar(false)}>Seguir editando</Button></div></div>}
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {modo === "nuevo" || (modo === "editar" && detalle) ? <EditorRecurso key={detalle?.recurso.id ?? tipo} tipo={detalle?.recurso.tipo ?? tipo} inicial={modo === "editar" && detalle ? detalle : undefined} alGuardar={id => { fijarCambios(false); cargar(id, undefined, false, "propio"); }} alCancelar={() => cerrar(false)} alCambiar={() => fijarCambios(true)} alPendiente={fijarGuardando}/> : pendiente && !detalle ? <p role="status" className="py-8 text-sm">Cargando recurso…</p> : detalle && <>
        <DetalleRecurso datos={detalle} pendiente={bloqueado} alVersion={v => cargar(detalle.recurso.id, v, false, detalle.recurso.origen ?? "propio")}/>
        {ultima && <div className="flex flex-wrap gap-2 border-t pt-4">{!esBase && !detalle.recurso.archivado_en && <Button variant="outline" disabled={bloqueado} onClick={() => { fijarCambios(false); fijarModo("editar"); }}><Pencil aria-hidden="true"/>Editar</Button>}<Button variant="outline" disabled={bloqueado} onClick={() => operar("duplicar")}><Copy aria-hidden="true"/>{esBase ? "Copiar a mis recursos y editar" : "Duplicar y editar"}</Button>{!esBase && (detalle.recurso.archivado_en ? <Button variant="outline" disabled={bloqueado} onClick={() => operar("restaurar")}><RotateCcw aria-hidden="true"/>Restaurar</Button> : <Button variant="ghost" disabled={bloqueado} onClick={() => fijarConfirmarArchivo(true)}><Archive aria-hidden="true"/>Archivar</Button>)}</div>}
        {confirmarArchivo && <div className="space-y-3 rounded-xl border p-4"><p className="text-sm">Archivar retira el recurso de las opciones nuevas. Conserva las copias y el historial.</p><div className="flex gap-2"><Button disabled={bloqueado} onClick={() => operar("archivar")}>Confirmar archivo</Button><Button variant="outline" disabled={bloqueado} onClick={() => fijarConfirmarArchivo(false)}>Cancelar</Button></div></div>}
      </>}
    </DialogContent></Dialog>
  </div>;
}
