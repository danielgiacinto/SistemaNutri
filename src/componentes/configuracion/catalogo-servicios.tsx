"use client";

import { useState } from "react";
import { Pencil, Plus, ReceiptText, Tags, X } from "lucide-react";
import { dineroFinanzas, type ServicioConsultorio } from "@/tipos/finanzas";
import { Button } from "@/componentes/ui/button";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { CampoFinanciero as Campo, estiloCampoFinanzas as estilo, FormularioFinanzas } from "@/componentes/finanzas/formulario-finanzas";

type NotaPrecios = { disponible: boolean; nota: string };
const atajos = ["Incluye la consulta", "Se suma a la consulta", "Por sesión", "Pack de 4"];

export function CatalogoServicios({ servicios, notaPrecios }: { servicios: ServicioConsultorio[]; notaPrecios?: NotaPrecios }) {
  const [nuevo, fijarNuevo] = useState(false);
  return <section className="min-w-0 overflow-hidden rounded-2xl border bg-card">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5"><div><h2 className="flex items-center gap-2 font-semibold"><Tags className="size-4 text-primary" aria-hidden="true" />Tus servicios</h2><p className="mt-1 text-xs text-muted-foreground">Precios para agendar y cobrar, con edición en el lugar.</p></div><Button type="button" size="sm" onClick={() => fijarNuevo(true)} disabled={nuevo}><Plus aria-hidden="true" />Agregar servicio</Button></header>
    {!servicios.length && !nuevo ? <EstadoVacio icono={ReceiptText} titulo="Tu catálogo de servicios" descripcion="Agregá una consulta paga o sin cargo para empezar." /> : <ul className="divide-y">{servicios.map(servicio => <FilaServicio key={servicio.id} servicio={servicio} ampliado={notaPrecios?.disponible ?? false} />)}</ul>}
    {nuevo && <div className="border-t bg-accent/15 p-4 sm:p-5"><h3 className="mb-4 font-semibold">Nuevo servicio</h3><EditorServicio ampliado={notaPrecios?.disponible ?? false} alGuardar={() => fijarNuevo(false)} alCancelar={() => fijarNuevo(false)} /></div>}
    {notaPrecios?.disponible && <div className="border-t p-4 sm:p-5"><FormularioFinanzas accion="nota_precios" boton="Guardar nota"><Campo etiqueta="Nota debajo de los precios (opcional)"><textarea key={notaPrecios.nota} name="nota" defaultValue={notaPrecios.nota} maxLength={1000} rows={2} placeholder="Ej.: Aceptamos efectivo y transferencia" className={estilo} /></Campo><p className="text-xs text-muted-foreground">Se guarda para la futura página de reservas. Es independiente de las instrucciones de cobro y de los comprobantes anteriores.</p></FormularioFinanzas></div>}
    <p className="border-t bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">Los cambios se aplican a nuevos turnos. Los precios históricos se conservan. Desactivar un servicio lo retira de las opciones nuevas; conserva sus consultas y cobros.</p>
  </section>;
}

function FilaServicio({ servicio, ampliado }: { servicio: ServicioConsultorio; ampliado: boolean }) {
  const [editando, fijarEditando] = useState(false);
  return <li className="min-w-0 p-4 sm:p-5">{editando ? <EditorServicio servicio={servicio} ampliado={ampliado} alGuardar={() => fijarEditando(false)} alCancelar={() => fijarEditando(false)} /> : <div className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0 flex-1"><h3 className="wrap-anywhere text-sm font-semibold">{servicio.nombre}</h3><p className="mt-1 text-xs text-muted-foreground">{servicio.duracion_minutos ? `${servicio.duracion_minutos} min · ` : ""}{servicio.activo ? "Activo" : "Inactivo"}</p>{servicio.aclaracion_paciente && <p className="mt-2 wrap-anywhere text-xs text-muted-foreground">{servicio.aclaracion_paciente}</p>}</div><span className="font-semibold tabular-nums">{servicio.precio === 0 ? "Sin cargo" : dineroFinanzas(servicio.precio, servicio.moneda)}</span><Button type="button" variant="outline" size="sm" aria-label={`Editar ${servicio.nombre}`} onClick={() => fijarEditando(true)}><Pencil aria-hidden="true" />Editar</Button></div>}</li>;
}

function EditorServicio({ servicio, ampliado, alGuardar, alCancelar }: { servicio?: ServicioConsultorio; ampliado: boolean; alGuardar: () => void; alCancelar: () => void }) {
  const [aclaracion, fijarAclaracion] = useState(servicio?.aclaracion_paciente ?? "");
  const [cambios, fijarCambios] = useState(false);
  return <div onChange={() => fijarCambios(true)} className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-medium text-muted-foreground">{servicio ? "Editar servicio" : "Definí tu nueva consulta"}{cambios ? " · Cambios sin guardar" : ""}</p></div>
    <FormularioFinanzas accion={ampliado ? "servicio_catalogo" : "servicio"} fijos={{ id: servicio?.id ?? "", moneda: "ARS" }} alGuardar={alGuardar} boton={servicio ? "Guardar cambios" : "Agregar servicio"}>
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]"><Campo etiqueta="Servicio"><input name="nombre" defaultValue={servicio?.nombre} maxLength={100} required placeholder="Ej.: Consulta de seguimiento" className={estilo} /></Campo><Campo etiqueta="Precio ($)"><input name="precio" type="number" min="0" step="0.01" defaultValue={servicio?.precio ?? 0} required className={estilo} /></Campo></div>
      {ampliado && <><Campo etiqueta="Aclaración para el paciente (opcional)"><input name="aclaracion" value={aclaracion} onChange={evento => fijarAclaracion(evento.target.value)} maxLength={300} placeholder="Ej.: Por sesión" className={estilo} /></Campo><div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Atajos para la aclaración de este servicio"><span className="text-xs text-muted-foreground">Atajos:</span>{atajos.map(atajo => <button key={atajo} type="button" className="rounded-full border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent" onClick={() => { fijarAclaracion(atajo); fijarCambios(true); }}>{atajo}</button>)}</div></>}
      <details className="rounded-xl border p-3"><summary className="cursor-pointer text-xs font-medium">Duración y descripción</summary><div className="mt-3 grid gap-3"><Campo etiqueta="Duración estimada en minutos (opcional)"><input name="duracion" type="number" min="10" max="240" defaultValue={servicio?.duracion_minutos ?? ""} className={estilo} /></Campo><Campo etiqueta="Descripción (opcional)"><textarea name="descripcion" maxLength={1000} defaultValue={servicio?.descripcion ?? ""} className={estilo} /></Campo></div></details>
      <label className="flex items-center gap-2 text-sm"><input name="activo" type="checkbox" defaultChecked={servicio?.activo ?? true} className="accent-primary" />Servicio activo</label><p className="text-xs text-muted-foreground">Un precio de $0 indica un servicio sin cargo. Guardar confirma los cambios de esta fila.</p><Button type="button" variant="outline" size="sm" className="w-fit" onClick={alCancelar}><X aria-hidden="true" />Cancelar edición</Button>
    </FormularioFinanzas>
  </div>;
}
