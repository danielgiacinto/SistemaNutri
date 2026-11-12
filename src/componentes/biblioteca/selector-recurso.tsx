"use client";

import { useId, useRef, useState, useTransition } from "react";
import { buscarOpcionesBiblioteca, leerRecursoBiblioteca } from "@/acciones/biblioteca";
import { ESTANTES_BIBLIOTECA, type DetalleBiblioteca, type ListadoBiblioteca, type RecursoBiblioteca, type TipoBiblioteca } from "@/tipos/biblioteca";
import { Button } from "@/componentes/ui/button";

export function SelectorRecurso({ tipo, alElegir }: { tipo: TipoBiblioteca; alElegir: (recurso: RecursoBiblioteca, detalle: DetalleBiblioteca) => void }) {
  const id = useId();
  const [busqueda, fijarBusqueda] = useState("");
  const [consulta, fijarConsulta] = useState("");
  const [pagina, fijarPagina] = useState(1);
  const [datos, fijarDatos] = useState<ListadoBiblioteca | null>(null);
  const [error, fijarError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const solicitud = useRef(0);
  function buscar(q: string, numero = 1) {
    const actual = ++solicitud.current;
    fijarError("");
    iniciar(async () => {
      try {
        const listado = await buscarOpcionesBiblioteca(tipo, q, numero);
        if (actual === solicitud.current) { fijarDatos(listado); fijarConsulta(q); fijarPagina(numero); }
      } catch { if (actual === solicitud.current) fijarError("No se pudieron buscar recursos. Intentá nuevamente."); }
    });
  }
  function elegir(opcion: RecursoBiblioteca) {
    fijarError("");
    iniciar(async () => {
      try {
        const detalle = await leerRecursoBiblioteca(opcion.id);
        if (!detalle || detalle.recurso.archivado_en) { fijarError("El recurso ya no está activo. Volvé a buscar."); return; }
        alElegir(detalle.recurso, detalle);
      } catch { fijarError("No se pudo cargar el recurso elegido. Intentá nuevamente."); }
    });
  }
  return <details className="rounded-xl border bg-muted/20 p-3"><summary className="cursor-pointer text-sm font-medium">Elegir {ESTANTES_BIBLIOTECA[tipo].singular}</summary><div className="mt-3 space-y-3"><label htmlFor={id} className="text-xs text-muted-foreground">Buscar en {ESTANTES_BIBLIOTECA[tipo].titulo.toLocaleLowerCase("es-AR")}</label><div className="flex gap-2"><input id={id} value={busqueda} onChange={e => fijarBusqueda(e.target.value)} maxLength={100} className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); buscar(busqueda); } }}/><Button type="button" variant="outline" size="sm" disabled={pendiente} onClick={() => buscar(busqueda)}>Buscar</Button></div>{pendiente ? <p role="status" className="text-sm">Buscando…</p> : error ? <p role="alert" className="text-sm text-destructive">{error}</p> : datos ? <><ul className="max-h-48 divide-y overflow-y-auto">{datos.recursos.map(r => <li key={r.id}><button type="button" onClick={() => elegir(r)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-3 text-left text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"><span className="min-w-0 wrap-anywhere">{r.nombre}<span className="block text-xs text-muted-foreground">{r.categoria || "Sin categoría"}</span></span><span className="shrink-0 text-xs font-medium">Elegir</span></button></li>)}</ul>{!datos.total && <p className="text-sm text-muted-foreground">No hay recursos activos que coincidan. Crealos primero en su estante.</p>}<div className="flex flex-wrap items-center gap-3 text-xs"><span>{datos.total} resultados</span>{pagina > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => buscar(consulta, pagina - 1)}>Anterior</Button>}{pagina * 25 < datos.total && <Button type="button" variant="ghost" size="sm" onClick={() => buscar(consulta, pagina + 1)}>Ver más</Button>}</div></> : <p className="text-xs text-muted-foreground">Buscá por nombre o dejá el campo vacío para ver los recursos activos.</p>}</div></details>;
}
