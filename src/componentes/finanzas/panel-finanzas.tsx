"use client";
import { InsigniaCobro } from "@/componentes/comunes/insignia-estado";
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Settings2, Wallet, ReceiptText, SlidersHorizontal } from 'lucide-react';
import { fechaEnZona } from '@/lib/fechas';
import { esMesCaja, resumirCaja } from '@/lib/caja-consultorio';
import { TableroCaja } from './tablero-caja';
import { NavegacionCaja } from './navegacion-caja';
import { DetalleMovimiento } from './detalle-movimiento';
import { CONFIGURACION_FINANCIERA_INICIAL, dineroFinanzas, estadoEconomico, coincideEstadoCobro, deudaExigible, saldoOperacion, movimientosEfectivos, type DatosFinanzas, type ConfiguracionFinanciera, type OperacionConsultorio } from '@/tipos/finanzas';
import { EstadoVacio } from '@/componentes/comunes/estado-vacio';
import { cn } from '@/lib/utilidades';
import { CampoFinanciero as Campo, estiloCampoFinanzas as estilo, FormularioFinanzas } from './formulario-finanzas';
import { CobroRapido } from './cobro-rapido';
import { DialogoFinanciero } from './dialogo-financiero';
import { DialogoServicios } from '@/componentes/configuracion/dialogo-servicios';
import { GraficoMediosPago } from './grafico-medios-pago';
import { IndicadoresFinanzas } from './indicadores-finanzas';
const dinero=(valor:number)=>dineroFinanzas(valor,'ARS');

export function PanelFinanzas({datos,pacienteId,zona,notaPrecios}:{datos:DatosFinanzas;pacienteId?:string;zona:string;notaPrecios?:{disponible:boolean;nota:string}}) {
  const parametros=useSearchParams();
  const [busqueda,fijarBusqueda]=useState('');
  const [estado,fijarEstado]=useState(!pacienteId?'pendientes':'');
  const [servicio,fijarServicio]=useState('');
  const [desde,fijarDesde]=useState('');const [hasta,fijarHasta]=useState('');
  const [desdeCaja,fijarDesdeCaja]=useState('');const [hastaCaja,fijarHastaCaja]=useState('');
  const [minimo,fijarMinimo]=useState('');const [maximo,fijarMaximo]=useState('');
  const [antiguedad,fijarAntiguedad]=useState('');const [orden,fijarOrden]=useState('antiguas');
  const [tipo,fijarTipo]=useState('');
  const [categoria,fijarCategoria]=useState('');const [medio,fijarMedio]=useState('');
  const configuracion=datos.configuracion??CONFIGURACION_FINANCIERA_INICIAL;
  const fecha=(valor:string)=>fechaEnZona(new Date(valor),zona);
  const mesParametro=parametros.get('mes')??'';
  const mes=esMesCaja(mesParametro)?mesParametro:fechaEnZona(new Date(datos.ahora),zona).slice(0,7);
  const resumenCaja=useMemo(()=>resumirCaja(datos,mes,zona),[datos,mes,zona]);
  function cambiarMes(siguiente:string) {if(!esMesCaja(siguiente))return;const consulta=new URLSearchParams(parametros.toString());consulta.delete('vista');consulta.set('mes',siguiente);window.history.pushState(null,'',`?${consulta}`);fijarDesdeCaja('');fijarHastaCaja('');}
  const idsEfectivos=new Set(movimientosEfectivos(datos).map(movimiento=>movimiento.id));
  const filas=datos.operaciones.filter(o=>o.moneda==='ARS'&&(!pacienteId||o.paciente_id===pacienteId)&&o.paciente.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())&&(!servicio||o.servicio_nombre===servicio)&&(!desde||fecha(o.inicio)>=desde)&&(!hasta||fecha(o.inicio)<=hasta)&&(!minimo||saldoOperacion(o)>=Number(minimo))&&(!maximo||saldoOperacion(o)<=Number(maximo))&&(!antiguedad||(o.vence_en&&new Date(datos.ahora).getTime()-new Date(o.vence_en).getTime()>=Number(antiguedad)*86400000))&&coincideEstadoCobro(o,estado,datos.ahora)).sort((a,b)=>orden==='importe'?saldoOperacion(b)-saldoOperacion(a):a.inicio.localeCompare(b.inicio));
  const movimientos=datos.movimientos.filter(m=>m.moneda==='ARS'&&((desdeCaja||hastaCaja)||fecha(m.fecha).startsWith(mes))&&(!desdeCaja||fecha(m.fecha)>=desdeCaja)&&(!hastaCaja||fecha(m.fecha)<=hastaCaja)&&(!tipo||m.tipo===tipo)&&(!categoria||m.categoria.toLowerCase().includes(categoria.toLowerCase()))&&(!medio||m.medio===medio));
  return <div className="@container/finanzas min-w-0 space-y-6">
    {!pacienteId&&<>
      <NavegacionCaja mes={mes} parametros={parametros.toString()} cambiarMes={cambiarMes} mesActual={fechaEnZona(new Date(datos.ahora),zona).slice(0,7)} acciones={<><DialogoServicios servicios={datos.servicios} notaPrecios={notaPrecios}/><ConfiguracionDialogo configuracion={configuracion}/></>}/>
      <IndicadoresFinanzas ingresos={resumenCaja.ingresos} deuda={resumenCaja.deudaAcumulada} egresos={resumenCaja.egresos} neto={resumenCaja.neto}/>
      <GraficoMediosPago datos={datos} zona={zona} mesSeleccionado={mes}/>
      <TableroCaja resumen={resumenCaja}/>
    </>}
    <section className="overflow-hidden rounded-2xl border bg-card" aria-label="Pagos y deudas de consultas">
      <div className="grid gap-4 border-b p-4 sm:p-5 @min-[880px]/finanzas:grid-cols-[1fr_1.5fr] @min-[880px]/finanzas:items-center">
        <div><h2 className="font-semibold">{pacienteId?'Pagos y deudas':'Cobros de consultas'}</h2><p className="mt-1 text-xs text-muted-foreground">{filas.length} {filas.length===1?'resultado':'resultados'} · {desde||hasta?'Período filtrado':'Todas las fechas'}</p></div>
        <div className="grid w-full min-w-0 gap-2 @min-[520px]/finanzas:grid-cols-2"><input aria-label="Buscar paciente" className={cn(estilo,'w-full')} value={busqueda} onChange={e=>fijarBusqueda(e.target.value)} placeholder="Buscar paciente…"/><select aria-label="Estado económico" className={cn(estilo,'w-full')} value={estado} onChange={e=>fijarEstado(e.target.value)}><option value="pendientes">Pendientes</option><option value="deuda">Deudas de consultas atendidas</option><option value="">Todo el historial</option><option value="vencido">Vencidos</option>{['Pago parcial','Pagado','Pagado anticipadamente','Sin cargo','Bonificado','Anticipo por resolver'].map(e=><option key={e}>{e}</option>)}</select></div>
      </div>
      <details className="border-b px-5 py-3"><summary className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5"/>Más filtros</summary><div className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-3"><Campo etiqueta="Servicio"><select className={estilo} value={servicio} onChange={e=>fijarServicio(e.target.value)}><option value="">Todos</option>{[...new Set(datos.operaciones.map(o=>o.servicio_nombre))].map(s=><option key={s}>{s}</option>)}</select></Campo>
        <Campo etiqueta="Orden"><select className={estilo} value={orden} onChange={e=>fijarOrden(e.target.value)}><option value="antiguas">Consultas más antiguas</option><option value="importe">Mayor saldo</option></select></Campo>
        <Campo etiqueta="Desde"><input type="date" value={desde} onChange={e=>fijarDesde(e.target.value)} className={estilo}/></Campo><Campo etiqueta="Hasta"><input type="date" value={hasta} onChange={e=>fijarHasta(e.target.value)} className={estilo}/></Campo>
        <Campo etiqueta="Saldo mínimo"><input type="number" min="0" value={minimo} onChange={e=>fijarMinimo(e.target.value)} className={estilo}/></Campo><Campo etiqueta="Saldo máximo"><input type="number" min="0" value={maximo} onChange={e=>fijarMaximo(e.target.value)} className={estilo}/></Campo>
        <Campo etiqueta="Días de atraso mínimos"><input type="number" min="0" value={antiguedad} onChange={e=>fijarAntiguedad(e.target.value)} className={estilo}/></Campo></div></details>
      {!filas.length?<EstadoVacio icono={ReceiptText} titulo="No hay cobros para mostrar" descripcion="Los cobros de tus consultas aparecerán acá. Podés cambiar el filtro para ver todo el historial."/>:<div>
        <ul className="divide-y @min-[760px]/finanzas:hidden" aria-label="Cobros de consultas">
          {filas.map(o=><li key={o.id} className="min-w-0 space-y-4 p-4 sm:p-5">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <div className="min-w-0"><p className="font-medium wrap-anywhere">{o.paciente}</p><p className="mt-1 text-sm text-muted-foreground wrap-anywhere">{o.servicio_nombre}</p></div>
              <div className="text-right"><p className="text-xs text-muted-foreground">Saldo</p><p className="mt-1 text-base font-semibold tabular-nums">{dinero(saldoOperacion(o))}</p></div>
            </div>
            <p className="text-xs text-muted-foreground">Consulta · {new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeZone:zona}).format(new Date(o.inicio))}</p>
            <div className="flex flex-wrap items-center justify-between gap-3"><EstadoCobroFila operacion={o} ahora={datos.ahora}/><CobroRapido mostrarEstado={false} zona={zona} turnoId={o.turno_id} inicial={datos}/></div>
          </li>)}
        </ul>
        <div className="hidden @min-[760px]/finanzas:block"><table className="w-full table-fixed text-left text-sm"><caption className="sr-only">Cobros de consultas filtrados por estado de pago</caption><thead className="bg-muted/25 text-xs text-muted-foreground"><tr><th scope="col" className="w-[29%] px-4 py-3 font-medium">Paciente y servicio</th><th scope="col" className="w-[18%] px-3 py-3 font-medium">Consulta</th><th scope="col" className="w-[18%] px-3 py-3 text-right font-medium">Saldo</th><th scope="col" className="w-[22%] px-3 py-3 font-medium">Estado de pago</th><th scope="col" className="w-[13%] px-3 py-3"><span className="sr-only">Acciones</span></th></tr></thead><tbody className="divide-y">{filas.map(o=><tr key={o.id} className="align-middle"><td className="px-4 py-4"><p className="font-medium wrap-anywhere">{o.paciente}</p><p className="mt-1 text-xs text-muted-foreground wrap-anywhere">{o.servicio_nombre}</p></td><td className="px-3 py-4 text-xs text-muted-foreground">{new Intl.DateTimeFormat('es-AR',{dateStyle:'medium',timeZone:zona}).format(new Date(o.inicio))}</td><td className="px-3 py-4 text-right font-semibold tabular-nums whitespace-nowrap">{dinero(saldoOperacion(o))}</td><td className="px-3 py-4"><EstadoCobroFila operacion={o} ahora={datos.ahora}/></td><td className="px-3 py-4 text-right"><CobroRapido mostrarEstado={false} compacto zona={zona} turnoId={o.turno_id} inicial={datos}/></td></tr>)}</tbody></table></div>
      </div>}
    </section>
    {!pacienteId&&<section className="overflow-hidden rounded-2xl border bg-card" aria-label="Movimientos de caja">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5"><div><h2 className="font-semibold">Movimientos de caja</h2><p className="mt-1 text-xs text-muted-foreground">Ingresos y egresos del mes seleccionado. Las fechas permiten ampliar el período.</p></div><DialogoFinanciero titulo="Registrar movimiento" descripcion="Los pagos de consultas se registran automáticamente. Agregá acá otros ingresos o gastos." boton={<><Plus/>Nuevo movimiento</>} principal>{cerrar=><EditorMovimiento configuracion={configuracion} alGuardar={cerrar}/>}</DialogoFinanciero></div>
      <details className="border-b px-5 py-3"><summary className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5"/>Filtrar movimientos{(desdeCaja||hastaCaja||tipo||categoria||medio)?' · Filtros activos':''}</summary><div className="grid gap-3 py-4 sm:grid-cols-2 lg:grid-cols-3"><Campo etiqueta="Desde"><input type="date" value={desdeCaja} onChange={e=>fijarDesdeCaja(e.target.value)} className={estilo}/></Campo><Campo etiqueta="Hasta"><input type="date" value={hastaCaja} onChange={e=>fijarHastaCaja(e.target.value)} className={estilo}/></Campo><Campo etiqueta="Tipo"><select value={tipo} onChange={e=>fijarTipo(e.target.value)} className={estilo}><option value="">Todos</option><option value="ingreso">Ingresos</option><option value="egreso">Egresos</option></select></Campo><Campo etiqueta="Categoría"><input className={estilo} value={categoria} onChange={e=>fijarCategoria(e.target.value)}/></Campo><Campo etiqueta="Medio de pago"><select className={estilo} value={medio} onChange={e=>fijarMedio(e.target.value)}><option value="">Todos</option>{[...new Set(datos.movimientos.map(m=>m.medio))].map(m=><option key={m}>{m}</option>)}</select></Campo></div></details>
      {!movimientos.length?<EstadoVacio icono={Wallet} titulo="Tu caja, en un solo lugar" descripcion="Los pagos y los movimientos que registres aparecerán acá."/>:<div className="divide-y">{movimientos.map(m=><article key={m.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5"><div><p className="text-sm font-medium">{m.descripcion}</p><p className="mt-1 text-xs text-muted-foreground">{fecha(m.fecha)} · {m.categoria} · {m.medio}</p><p className="mt-2 text-xs font-medium text-muted-foreground">{idsEfectivos.has(m.id)?(m.tipo==='egreso'&&m.pago_id?'Devolución efectiva':'Movimiento efectivo'):(m.compensacion_de?'Compensación · no suma':'Corregido por error · no suma')}</p></div><div className="flex items-center gap-3"><span className={cn('text-sm font-semibold tabular-nums',m.tipo==='ingreso'?'text-exito':'text-foreground')}>{m.tipo==='ingreso'?'+':'−'}{dinero(m.importe)}</span><DetalleMovimiento movimiento={m} datos={datos} zona={zona} efectivo={idsEfectivos.has(m.id)}/>{!m.pago_id&&!m.compensacion_de&&!datos.movimientos.some(c=>c.compensacion_de===m.id)&&<DialogoFinanciero titulo="Corregir movimiento" descripcion="Se conservará el original y se agregará un movimiento compensatorio." boton="Corregir">{cerrar=><FormularioFinanzas accion="revertir_movimiento" fijos={{id:m.id}} alGuardar={cerrar} boton="Confirmar corrección"><Campo etiqueta="Motivo"><input name="motivo" minLength={3} className={estilo} required/></Campo><label className="text-sm"><input type="checkbox" required/> Confirmo la corrección de este movimiento.</label></FormularioFinanzas>}</DialogoFinanciero>}</div></article>)}</div>}
      <p className="border-t px-5 py-3 text-xs text-muted-foreground">Comprobantes internos. No constituyen facturas fiscales.</p>
    </section>}
  </div>;
}

function ConfiguracionDialogo({configuracion}:{configuracion:ConfiguracionFinanciera}) {
  return <DialogoFinanciero titulo="Configuración de cobros" descripcion="Personalizá los vencimientos y los recordatorios de tus consultas." boton={<><Settings2/>Configuración</>}>
    {cerrar=><FormularioFinanzas accion="configuracion" fijos={{moneda:'ARS'}} alGuardar={cerrar}>
      <Campo etiqueta="Días de vencimiento desde la atención"><input name="dias" type="number" min="0" max="365" defaultValue={configuracion.dias_vencimiento} className={estilo} required/></Campo>
      <section className="rounded-xl border p-4 space-y-3"><h3 className="font-medium">Recordatorios automáticos</h3><p className="text-xs text-muted-foreground">Se envía un recordatorio por día por consulta atendida, mientras tenga saldo pendiente y autorización del paciente. Proceso diario: 09:00–09:59 (Argentina).</p><label className="flex items-start gap-3 text-sm"><input className="mt-1 accent-primary" name="recordatorios" type="checkbox" defaultChecked={configuracion.recordatorios}/> Activar envío automático</label>
      </section><details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">Personalizar los correos</summary><div className="grid gap-4 pt-4"><Campo etiqueta="Nombre del consultorio en correos"><input name="nombre" defaultValue={configuracion.nombre_remitente} className={estilo} required/></Campo>
      <Campo etiqueta="Texto del recordatorio"><textarea name="texto" defaultValue={configuracion.texto_recordatorio} className={estilo} required/></Campo>
      <Campo etiqueta="Instrucciones de pago"><textarea name="instrucciones" defaultValue={configuracion.instrucciones} className={estilo}/></Campo>
      </div></details><Campo etiqueta="Medios de pago, separados por comas"><input name="medios" defaultValue={configuracion.medios.join(', ')} className={estilo} required/></Campo>
    </FormularioFinanzas>}
  </DialogoFinanciero>;
}
function EditorMovimiento({configuracion,alGuardar}:{configuracion:ConfiguracionFinanciera;alGuardar:()=>void}) {
  return <FormularioFinanzas accion="movimiento" fijos={{moneda:'ARS'}} alGuardar={alGuardar} boton="Registrar movimiento">
      <div className="grid gap-3 sm:grid-cols-2"><Campo etiqueta="Tipo"><select name="tipo" className={estilo}><option value="egreso">Egreso</option><option value="ingreso">Ingreso</option></select></Campo><Campo etiqueta="Categoría"><input name="categoria" placeholder="Alquiler, materiales, otros…" className={estilo} required/></Campo><Campo etiqueta="Descripción"><input name="descripcion" className={estilo} required/></Campo><Campo etiqueta="Importe"><input name="importe" type="number" min="0.01" step="0.01" className={estilo} required/></Campo><Campo etiqueta="Fecha efectiva"><input name="fecha" type="datetime-local" className={estilo} required/></Campo><Campo etiqueta="Medio"><select name="medio" className={estilo}>{configuracion.medios.map(m=><option key={m}>{m}</option>)}</select></Campo></div>
    </FormularioFinanzas>;
}

function EstadoCobroFila({operacion,ahora}:{operacion:OperacionConsultorio;ahora:string}) {
 const vencido=deudaExigible(operacion)&&!!operacion.vence_en&&operacion.vence_en<ahora;
 return <div className="min-w-0 space-y-1 [&_[data-slot=badge]]:max-w-full [&_[data-slot=badge]]:whitespace-normal [&_[data-slot=badge]]:text-left [&_[data-slot=badge]]:leading-snug"><InsigniaCobro estado={estadoEconomico(operacion)}/>{vencido?<p className="text-xs text-destructive">Vencido</p>:['programado','confirmado'].includes(operacion.estado_turno)&&saldoOperacion(operacion)>0?<p className="text-xs text-muted-foreground">Por atender</p>:null}</div>;
}
