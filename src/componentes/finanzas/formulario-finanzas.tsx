'use client';
import { useRef, useTransition, type ReactNode } from 'react';
import { toast } from 'sonner';
import { guardarFinanzas } from '@/acciones/finanzas';
import { Button } from '@/componentes/ui/button';

export const estiloCampoFinanzas='w-full min-w-0 rounded-lg border bg-background px-3 py-2 text-sm';
export function CampoFinanciero({etiqueta,children}:{etiqueta:string;children:ReactNode}) { return <label className="grid gap-1.5 text-sm"><span className="font-medium">{etiqueta}</span>{children}</label>; }
export function FormularioFinanzas({accion,fijos={},children,boton='Guardar',alGuardar}:{accion:string;fijos?:Record<string,unknown>;children:ReactNode;boton?:string;alGuardar?:()=>void}) {
  const [pendiente,iniciar]=useTransition();
  const clave=useRef<string|null>(null);
  return <form className="grid gap-4" onSubmit={evento=>{
    evento.preventDefault();
    const formulario=evento.currentTarget;
    const campos=new FormData(formulario);
    const datos: Record<string,unknown>={...Object.fromEntries(campos),...fijos,accion};
    for (const campo of ['precio','importe','descuento','dias']) if (campo in datos) datos[campo]=Number(datos[campo]);
    for (const campo of ['activo','recordatorios','bonificado','autorizado']) if (formulario.elements.namedItem(campo)) datos[campo]=campos.get(campo)==='on';
    for (const campo of ['plazos','medios']) if (typeof datos[campo]==='string') datos[campo]=String(datos[campo]).split(',').map(v=>campo==='plazos'?Number(v.trim()):v.trim()).filter(v=>v!=='');
    for (const campo of ['fecha','vence']) if (datos[campo]) datos[campo]=new Date(String(datos[campo])).toISOString();
    clave.current??=crypto.randomUUID(); datos.clave=clave.current;
    iniciar(async()=>{
      try {
        const resultado=await guardarFinanzas(datos);
        if (!resultado.ok) {toast.error(resultado.mensaje);return;}
        clave.current=null; toast.success(resultado.mensaje);alGuardar?.();
      } catch {toast.error('No se pudo confirmar la operación. Podés reintentar sin duplicarla.');}
    });
  }}>
    <fieldset disabled={pendiente} className="grid min-w-0 gap-4">{children}</fieldset>
    <Button type="submit" disabled={pendiente} className="w-fit">{pendiente?'Guardando…':boton}</Button>
  </form>;
}
