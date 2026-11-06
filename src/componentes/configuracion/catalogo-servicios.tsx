"use client";

import { Plus, Pencil, ReceiptText } from "lucide-react";
import { dineroFinanzas, type ServicioConsultorio } from "@/tipos/finanzas";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { CampoFinanciero as Campo, estiloCampoFinanzas as estilo, FormularioFinanzas } from "@/componentes/finanzas/formulario-finanzas";
import { DialogoFinanciero } from "@/componentes/finanzas/dialogo-financiero";

const dinero = (valor: number) => dineroFinanzas(valor, "ARS");

export function CatalogoServicios({ servicios }: { servicios: ServicioConsultorio[] }) {
  return <section className="rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">Tus servicios</h2><p className="mt-1 text-xs text-muted-foreground">Precios y duración de tus consultas.</p></div><DialogoFinanciero titulo="Nuevo servicio" descripcion="Definí el precio en pesos. Usá $0 para un servicio sin cargo." boton={<><Plus/>Nuevo servicio</>} principal>{cerrar=><EditorServicio alGuardar={cerrar}/>}</DialogoFinanciero></div>
      {!servicios.length?<EstadoVacio icono={ReceiptText} titulo="Tu catálogo de servicios" descripcion="Creá tu primer servicio para asociarlo a los turnos y empezar a registrar cobros."/>:<div className="divide-y">{servicios.map(s=><article key={s.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div className="min-w-0"><h3 className="font-medium">{s.nombre}</h3><p className="mt-1 text-xs text-muted-foreground">{s.duracion_minutos?`${s.duracion_minutos} min · `:''}{s.activo?'Activo':'Inactivo'}</p></div><div className="flex items-center gap-4"><span className="text-sm font-semibold tabular-nums">{s.precio===0?'Sin cargo':dinero(s.precio)}</span><DialogoFinanciero titulo="Editar servicio" descripcion="Los turnos existentes conservan su precio original." boton={<><Pencil/>Editar</>}>{cerrar=><EditorServicio servicio={s} alGuardar={cerrar}/>}</DialogoFinanciero></div></article>)}</div>}
    </section>;
}

function EditorServicio({servicio,alGuardar}:{servicio?:ServicioConsultorio;alGuardar:()=>void}) {return <FormularioFinanzas accion="servicio" fijos={{id:servicio?.id??'',moneda:'ARS'}} alGuardar={alGuardar} boton={servicio?'Guardar servicio':'Crear servicio'}><Campo etiqueta="Nombre"><input name="nombre" defaultValue={servicio?.nombre} maxLength={100} required className={estilo}/></Campo><Campo etiqueta="Descripción (opcional)"><textarea name="descripcion" defaultValue={servicio?.descripcion??''} className={estilo}/></Campo><Campo etiqueta="Precio (0 para servicio sin cargo)"><input name="precio" type="number" min="0" step="0.01" defaultValue={servicio?.precio} required className={estilo}/></Campo><Campo etiqueta="Duración estimada en minutos (opcional)"><input name="duracion" type="number" min="10" max="240" defaultValue={servicio?.duracion_minutos??''} className={estilo}/></Campo><label className="text-sm"><input name="activo" type="checkbox" defaultChecked={servicio?.activo??true}/> Servicio activo</label><p className="text-xs text-muted-foreground">Los cambios de precio se aplican a nuevos turnos. Los existentes conservan su importe.</p></FormularioFinanzas>;}
