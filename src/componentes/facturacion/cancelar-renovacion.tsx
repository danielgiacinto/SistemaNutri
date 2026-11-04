"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { CircleStop } from "lucide-react";
import { Dialog as DialogoPrimitivo } from "radix-ui";
import { cancelarMiSuscripcion } from "@/acciones/cancelar-suscripcion";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";

export function CancelarRenovacion({ solicitada }: { solicitada: boolean }) {
  const id = useId();
  const [abierto, cambiarAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [error, cambiarError] = useState<string | null>(null);
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    cambiarError(null);
    iniciar(async () => {
      try {
        const resultado = await cancelarMiSuscripcion(datos);
        if (resultado.ok) { toast.success(resultado.mensaje); cambiarAbierto(false); }
        else cambiarError(resultado.mensaje);
      } catch { cambiarError("No pudimos enviar la solicitud. Revisá tu conexión e intentá nuevamente."); }
    });
  }
  return (
    <Dialog open={abierto} onOpenChange={(valor) => { if (!pendiente) { cambiarAbierto(valor); cambiarError(null); } }}>
      <DialogoPrimitivo.Trigger asChild><Button variant="outline" className="w-full"><CircleStop aria-hidden="true" />{solicitada ? "Revisar cancelación pendiente" : "Cancelar renovación"}</Button></DialogoPrimitivo.Trigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar la renovación mensual</DialogTitle>
          <DialogDescription>Se detendrán los próximos cobros cuando Mercado Pago confirme la cancelación. Conservás tu prueba o período ya pagado y tus datos no se eliminan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2"><Label htmlFor={`${id}-motivo`}>Motivo</Label><Textarea id={`${id}-motivo`} name="motivo" minLength={5} maxLength={500} required disabled={pendiente} /></div>
          <label className="flex items-start gap-2 text-sm"><input className="mt-1 size-4 accent-primary" name="confirmacion" type="checkbox" value="si" required disabled={pendiente} />Entiendo que se cancelará la renovación automática.</label>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" variant="destructive" disabled={pendiente} aria-busy={pendiente} className="w-full">{pendiente ? "Verificando con Mercado Pago…" : "Confirmar cancelación"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
