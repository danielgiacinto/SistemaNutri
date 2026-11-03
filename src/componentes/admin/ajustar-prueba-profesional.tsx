"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog as DialogoPrimitivo } from "radix-ui";
import { CalendarClock } from "lucide-react";
import { extenderPrueba } from "@/acciones/facturacion";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Textarea } from "@/componentes/ui/textarea";
import { cn } from "@/lib/utilidades";

type Propiedades = {
  consultorioId: string | null;
  consultorio: string;
  correo: string;
  vence: string;
  estadoMercadoPago: string;
  className: string;
};

export function AjustarPruebaProfesional({
  consultorioId,
  consultorio,
  correo,
  vence,
  estadoMercadoPago,
  className,
}: Propiedades) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();
  const contenidoFila = (
    <>
      <span className="min-w-0">
        <span className="block truncate font-medium">{consultorio}</span>
        <span className="mt-0.5 block truncate text-muted-foreground sm:hidden">
          {correo} · {vence}
        </span>
      </span>
      <span className="hidden min-w-0 truncate sm:block">{correo}</span>
      <span className="hidden min-w-0 truncate text-muted-foreground sm:block">{vence}</span>
      <span className="justify-self-end text-muted-foreground sm:justify-self-start">{estadoMercadoPago}</span>
    </>
  );

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    const fechaLocal = String(formulario.get("vence") ?? "");
    const fecha = new Date(fechaLocal);
    if (!fechaLocal || Number.isNaN(fecha.getTime())) {
      toast.error("Elegí una fecha y hora de vencimiento válidas.");
      return;
    }
    formulario.set("vence", fecha.toISOString());

    iniciarTransicion(async () => {
      try {
        const resultado = await extenderPrueba(formulario);
        if (!resultado.ok) {
          toast.error(resultado.mensaje);
          return;
        }
        toast.success(resultado.mensaje ?? "La prueba gratuita quedó ajustada.");
        setAbierto(false);
      } catch {
        toast.error("No se pudo ajustar la prueba gratuita. Intentá nuevamente.");
      }
    });
  }

  if (!consultorioId) {
    return (
      <div className={cn(className, "cursor-not-allowed text-muted-foreground")} aria-disabled="true" title="No hay consultorio asociado a esta prueba">
        {contenidoFila}
      </div>
    );
  }

  return (
    <Dialog open={abierto} onOpenChange={(siguiente) => !pendiente && setAbierto(siguiente)}>
      <DialogoPrimitivo.Trigger asChild>
        <button
          type="button"
          className={cn(
            className,
            "w-full cursor-pointer text-left transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          )}
          aria-label={`Ajustar la prueba gratuita de ${consultorio} (${correo})`}
          title="Clic para ajustar la prueba gratuita"
        >
          {contenidoFila}
        </button>
      </DialogoPrimitivo.Trigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar prueba gratuita</DialogTitle>
          <DialogDescription>
            Elegí la nueva fecha de vencimiento para {consultorio}. El cambio queda registrado en la auditoría.
          </DialogDescription>
        </DialogHeader>
        <div className="-mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <p className="font-medium">{consultorio}</p>
          <p className="text-muted-foreground">{correo} · vence actualmente el {vence}</p>
        </div>
        <form onSubmit={enviar} className="space-y-4">
          <input type="hidden" name="consultorioId" value={consultorioId} />
          <div className="space-y-1.5">
            <Label htmlFor={`vence-${consultorioId}`}>Nueva fecha y hora de vencimiento</Label>
            <Input id={`vence-${consultorioId}`} name="vence" type="datetime-local" required className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`motivo-${consultorioId}`}>Motivo del ajuste</Label>
            <Textarea
              id={`motivo-${consultorioId}`}
              name="motivo"
              placeholder="Contá por qué se modifica esta prueba…"
              required
              minLength={5}
              maxLength={500}
              rows={3}
            />
          </div>
          <Button type="submit" disabled={pendiente} className="w-full">
            <CalendarClock aria-hidden="true" />
            {pendiente ? "Guardando…" : "Ajustar prueba"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
