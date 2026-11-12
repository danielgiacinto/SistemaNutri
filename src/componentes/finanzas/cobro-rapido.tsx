'use client';
import { InsigniaCobro } from "@/componentes/comunes/insignia-estado";
import { ZONA_HORARIA_PREDETERMINADA } from '@/configuracion/producto';
import { ReceiptText, ChevronRight, Send, Clock3 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cargarFinanzas } from '@/acciones/finanzas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/componentes/ui/dialog';
import { Button } from '@/componentes/ui/button';
import { CONFIGURACION_FINANCIERA_INICIAL, dineroFinanzas, estadoEconomico, saldoOperacion, type DatosFinanzas } from '@/tipos/finanzas';
import { CampoFinanciero as Campo, estiloCampoFinanzas as estilo, FormularioFinanzas } from './formulario-finanzas';

function fechaLocal(ahora=new Date()) {return new Date(ahora.getTime()-ahora.getTimezoneOffset()*60000).toISOString().slice(0,16);}
export function CobroRapido({turnoId,estado='Sin configurar',inicial,mostrarEstado=true,compacto=false,zona=ZONA_HORARIA_PREDETERMINADA}:{turnoId:string;estado?:string;inicial?:DatosFinanzas;mostrarEstado?:boolean;compacto?:boolean;zona?:string}) {
  const [seccion,fijarSeccion]=useState('cobro');
  const [datos,fijarDatos]=useState(inicial);
  const [abierto,fijarAbierto]=useState(false);
  const [cargando,iniciar]=useTransition();
  const recargar=()=>iniciar(async()=>{try{fijarDatos(await cargarFinanzas(turnoId));}catch{toast.error('No se pudo cargar el detalle del cobro.');}});
  const operacion=datos?.operaciones.find(o=>o.turno_id===turnoId);
  const configuracion=datos?.configuracion??CONFIGURACION_FINANCIERA_INICIAL;
  return <Dialog open={abierto} onOpenChange={valor=>{fijarAbierto(valor);if(valor)recargar();}}>
    <Button variant="outline" size={compacto?"icon":"sm"} aria-label={compacto?`Ver cobro de ${operacion?.paciente??"la consulta"}`:undefined} title={compacto?"Ver cobro":undefined} className={compacto?"size-9 shrink-0 rounded-xl p-0":"h-9 shrink-0 gap-2 rounded-xl px-3"} onClick={()=>{fijarAbierto(true);recargar();}}><ReceiptText className="size-4 text-primary" aria-hidden="true"/>{!compacto&&<span>Cobros</span>}{mostrarEstado&&<InsigniaCobro estado={datos ? estadoEconomico(operacion) : estado} />}{!compacto&&<ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true"/>}</Button>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>{operacion?operacion.paciente:'Configurar cobro'}</DialogTitle><DialogDescription>{operacion?`${operacion.servicio_nombre} · ${new Date(operacion.inicio).toLocaleString('es-AR',{timeZone:zona,hourCycle:'h23'})}`:'Asigná un servicio para definir el precio. Un turno sin configurar no se considera gratuito.'}</DialogDescription></DialogHeader>
      {cargando && <p role="status">Actualizando…</p>}
      {!datos ? <p>Cargando información económica…</p> : !operacion ? <FormularioFinanzas accion="asignar" fijos={{turno:turnoId}} alGuardar={recargar} boton="Asignar servicio">
        <Campo etiqueta="Servicio"><select name="servicio" className={estilo} required><option value="">Elegí un servicio</option>{datos.servicios.filter(s=>s.activo).map(s=><option key={s.id} value={s.id}>{s.nombre} · {dineroFinanzas(s.precio,s.moneda)}</option>)}</select></Campo>
      </FormularioFinanzas> : <div className="grid gap-6">
        <div className="rounded-xl bg-muted/50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Saldo de la consulta</p><InsigniaCobro estado={estadoEconomico(operacion)}/></div><p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{dineroFinanzas(saldoOperacion(operacion),operacion.moneda)}</p><p className="mt-2 text-xs text-muted-foreground">Total: {dineroFinanzas(operacion.original-operacion.descuento,operacion.moneda)} · Abonado: {dineroFinanzas(operacion.abonado,operacion.moneda)}</p></div>
        <nav aria-label="Detalle del cobro" className="flex gap-1 border-b">{[['cobro','Cobro'],['recordatorios','Recordatorios'],['historial','Historial']].map(([valor,nombre])=><button type="button" key={valor} aria-current={seccion===valor?'page':undefined} onClick={()=>fijarSeccion(valor)} className={`px-3 py-2 text-sm font-medium border-b-2 ${seccion===valor?'border-primary text-primary':'border-transparent text-muted-foreground'}`}>{nombre}</button>)}</nav>
        <div hidden={seccion!=='cobro'} className="space-y-5">
        {operacion.estado_turno==='cancelado' && operacion.abonado>0 && <p role="alert" className="text-sm text-destructive">El anticipo sigue registrado. Registrá su devolución desde el historial para resolverlo.</p>}
        {saldoOperacion(operacion)>0 && !['cancelado','ausente'].includes(operacion.estado_turno) && <FormularioFinanzas accion="pago" fijos={{turno:turnoId}} alGuardar={recargar} boton="Registrar pago">
          <h3 className="font-semibold">Registrar pago</h3>
          <div className="grid gap-3 sm:grid-cols-2"><Campo etiqueta={`Importe (${operacion.moneda})`}><input name="importe" type="number" min="0.01" step="0.01" max={saldoOperacion(operacion)} defaultValue={saldoOperacion(operacion)} key={`${operacion.abonado}-${operacion.descuento}`} required className={estilo}/></Campo>
          <Campo etiqueta="Fecha efectiva del pago"><input name="fecha" type="datetime-local" defaultValue={fechaLocal()} required className={estilo}/></Campo></div>
          <Campo etiqueta="Medio de pago"><select name="medio" className={estilo}>{configuracion.medios.map(m=><option key={m}>{m}</option>)}</select></Campo>
          <Campo etiqueta="Referencia (opcional)"><input name="referencia" maxLength={200} className={estilo}/></Campo>
          <Campo etiqueta="Observaciones (opcional)"><textarea name="observaciones" maxLength={1000} className={estilo}/></Campo>
        </FormularioFinanzas>}
        <details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">Descuento, bonificación y vencimiento</summary><div className="pt-4"><FormularioFinanzas accion="ajuste" fijos={{turno:turnoId}} alGuardar={recargar} boton="Guardar ajuste">
          <p className="text-xs text-muted-foreground">El valor reemplaza el descuento de esta consulta. No cambia el precio del servicio ni puede reducir el importe final por debajo de lo ya abonado.</p>
          <Campo etiqueta="Tipo de descuento"><select name="tipo" className={estilo}><option value="fijo">Importe fijo</option><option value="porcentaje">Porcentaje del precio original</option></select></Campo>
          <Campo etiqueta="Descuento"><input name="descuento" type="number" min="0" step="0.01" defaultValue={operacion.descuento} className={estilo} required/></Campo>
          <label className="flex gap-2 text-sm"><input name="bonificado" type="checkbox" defaultChecked={operacion.bonificado}/>Bonificar el 100 %</label>
          <Campo etiqueta="Motivo (opcional)"><input name="motivo" defaultValue={operacion.motivo??''} className={estilo}/></Campo>
          <Campo etiqueta="Vencimiento (opcional)"><input name="vence" type="datetime-local" defaultValue={operacion.vence_en?fechaLocal(new Date(operacion.vence_en)):''} className={estilo}/></Campo>
          <label className="text-sm"><input type="checkbox" required/> Confirmo el ajuste de esta consulta.</label>
        </FormularioFinanzas></div></details>
        </div><section hidden={seccion!=='historial'} className="space-y-3"><h3 className="font-semibold">Historial de pagos</h3>
          {datos.pagos.filter(p=>p.operacion_id===operacion.id).map(p=><div key={p.id} className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{dineroFinanzas(p.importe,operacion.moneda)} · {p.medio}</p><p>{new Date(p.fecha).toLocaleString('es-AR',{timeZone:zona,hourCycle:'h23'})} {p.referencia&&`· ${p.referencia}`}</p>{p.observaciones&&<p>{p.observaciones}</p>}
            {p.revertido_en?<p className="text-muted-foreground">Revertido: {p.motivo_reversion} · {new Date(p.revertido_en).toLocaleString('es-AR',{timeZone:zona,hourCycle:'h23'})}</p>:<details className="mt-2"><summary className="cursor-pointer">Corregir o devolver pago</summary><FormularioFinanzas accion="reversion" fijos={{turno:turnoId,pago:p.id}} alGuardar={recargar} boton="Confirmar reversión"><Campo etiqueta="Operación"><select name="tipo" className={estilo}><option value="error">Reversión por error</option><option value="devolucion">Devolución del pago completo</option></select></Campo><Campo etiqueta="Motivo obligatorio"><input name="motivo" minLength={3} required className={estilo}/></Campo><label><input type="checkbox" required/> Confirmo la reversión y el ajuste del saldo.</label></FormularioFinanzas></details>}
          </div>)}
          {!datos.pagos.some(p=>p.operacion_id===operacion.id)&&<p className="text-sm text-muted-foreground">Sin pagos registrados.</p>}
          {datos.ajustes.filter(a=>a.operacion_id===operacion.id).map(a=><p key={a.id} className="text-xs text-muted-foreground">{new Date(a.fecha).toLocaleString('es-AR',{timeZone:zona,hourCycle:'h23'})} · Descuento: {dineroFinanzas(a.detalle.anterior,operacion.moneda)} → {dineroFinanzas(a.detalle.nuevo,operacion.moneda)} · {a.detalle.motivo}</p>)}
        </section>
        <section hidden={seccion!=='recordatorios'} className="space-y-5">
          <FormularioFinanzas accion="consentimiento" fijos={{paciente:operacion.paciente_id}} alGuardar={recargar} boton="Guardar autorización"><label className="flex items-start gap-3 text-sm"><input className="mt-1 accent-primary" name="autorizado" type="checkbox" defaultChecked={datos.consentimientos.some(c=>c.paciente_id===operacion.paciente_id&&c.autorizado)}/><span>Autoriza correos de pago<span className="mt-1 block text-xs text-muted-foreground">Registrá el consentimiento del paciente antes de enviar.</span></span></label></FormularioFinanzas>
          <div className="rounded-xl border p-4 space-y-3"><h3 className="flex items-center gap-2 font-medium"><Send className="size-4 text-primary"/> Enviar ahora</h3><p className="text-sm text-muted-foreground">Notificá al paciente en este momento. La consulta debe haber finalizado y mantener saldo pendiente.</p><FormularioFinanzas accion="enviar_recordatorio" fijos={{turno:turnoId}} alGuardar={recargar} boton="Enviar recordatorio ahora" deshabilitado={operacion.estado_turno!=='completado'||new Date(operacion.inicio)>new Date()||saldoOperacion(operacion)<=0||!datos.consentimientos.some(c=>c.paciente_id===operacion.paciente_id&&c.autorizado)}><span className="sr-only">Enviar correo inmediato de esta consulta</span></FormularioFinanzas></div>
          <div className="rounded-xl bg-muted/40 p-4"><h3 className="flex items-center gap-2 font-medium"><Clock3 className="size-4 text-primary"/> Envío automático · {configuracion.recordatorios?'Activo':'Desactivado'}</h3><p className="mt-2 text-sm text-muted-foreground">{configuracion.recordatorios?'Un recordatorio por día por consulta atendida, mientras tenga saldo pendiente y autorización. Se procesa de 09:00 a 09:59 (Argentina).':'Activá los recordatorios desde Configuración de cobros para enviarlos con el proceso diario.'}</p></div>
          <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">Actividad reciente</summary><div className="mt-3 space-y-2">{datos.recordatorios.filter(r=>r.operacion_id===operacion.id).slice(0,5).map(r=><p key={r.id} className="flex flex-wrap justify-between gap-2 text-xs"><span>{r.estado==='pendiente'?'En cola':r.estado==='enviado'?'Enviado':r.estado==='incierto'?'Revisar envío':r.estado==='enviando'?'Enviando':r.estado==='cancelado'?'Cancelado':'Error de envío'}</span><span className="text-muted-foreground">{new Date(r.programado_en).toLocaleString('es-AR',{timeZone:zona,hourCycle:'h23'})}</span></p>)}</div></details>
        </section>
      </div>}
    </DialogContent>
  </Dialog>;
}
