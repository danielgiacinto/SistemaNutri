"use client";
import { useId, useState, useTransition, type FormEvent } from "react";
import { Dialog as DialogoPrimitivo } from "radix-ui";
import { toast } from "sonner";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { conciliarSuscripcionProfesional } from "@/acciones/sincronizar-suscripcion";
import { cambiarEstadoComercial } from "@/acciones/administracion-comercial";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/componentes/ui/dialog";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";

export function ControlesComerciales({ consultorioId, suspendido, tieneSuscripcion }: { consultorioId: string; suspendido: boolean; tieneSuscripcion: boolean }) {
  const id = useId();
  const [abierto, cambiarAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    iniciar(async () => {
      try {
        const resultado = await cambiarEstadoComercial(datos);
        if (resultado.ok) { toast.success(resultado.mensaje); cambiarAbierto(false); }
        else toast.error(resultado.mensaje);
      } catch { toast.error("No pudimos guardar el cambio."); }
    });
  }
  return <div className="flex flex-wrap gap-3">
    {tieneSuscripcion ? <Button variant="outline" disabled={pendiente} onClick={() => iniciar(async () => {
      try { const resultado = await conciliarSuscripcionProfesional(consultorioId); if (resultado.ok) toast.success(resultado.mensaje); else toast.error(resultado.mensaje); }
      catch { toast.error("No pudimos verificar los cobros."); }
    })}><RefreshCw className={pendiente ? "animate-spin" : undefined} aria-hidden="true" />Verificar cobros en Mercado Pago</Button> : null}
    <Dialog open={abierto} onOpenChange={(valor) => !pendiente && cambiarAbierto(valor)}>
      <DialogoPrimitivo.Trigger asChild><Button variant={suspendido ? "outline" : "destructive"}><ShieldAlert aria-hidden="true" />{suspendido ? "Retirar suspensión administrativa" : "Suspender consultorio"}</Button></DialogoPrimitivo.Trigger>
      <DialogContent><DialogHeader><DialogTitle>{suspendido ? "Retirar suspensión administrativa" : "Suspender consultorio"}</DialogTitle><DialogDescription>Esta acción queda auditada. No modifica pagos ni cancela la renovación de Mercado Pago. Los datos clínicos se conservan.</DialogDescription></DialogHeader>
        <form onSubmit={enviar} className="space-y-4">
          <input type="hidden" name="consultorioId" value={consultorioId} /><input type="hidden" name="estado" value={suspendido ? "activo" : "suspendido"} />
          <div className="space-y-2"><Label htmlFor={`${id}-motivo`}>Motivo</Label><Textarea id={`${id}-motivo`} name="motivo" required minLength={5} maxLength={500} disabled={pendiente} /></div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirmacion" value="si" required disabled={pendiente} className="mt-1 size-4 accent-primary" />Confirmo este cambio de acceso administrativo.</label>
          <Button type="submit" disabled={pendiente} className="w-full">{pendiente ? "Guardando…" : "Confirmar cambio"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
