"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { invitarPaciente } from "@/acciones/invitaciones";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";
import { Button } from "@/componentes/ui/button";

export function FormularioInvitacion({
  pacienteId,
  correo,
  vinculado,
}: {
  pacienteId: string;
  correo: string | null;
  vinculado: boolean;
}) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [enlace, setEnlace] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  if (vinculado) {
    return <p className="text-sm text-muted-foreground">Esta persona ya aceptó la invitación y puede entrar al portal.</p>;
  }

  if (!correo) {
    return (
      <p className="text-sm text-muted-foreground">
        Cargá un correo en la ficha para poder invitarla. La invitación solo se acepta con ese correo.
      </p>
    );
  }

  const invitar = () =>
    iniciarTransicion(async () => {
      const resultado = await invitarPaciente(pacienteId);
      if (!resultado.ok) {
        toast.error(resultado.mensaje);
        return;
      }
      setEnlace(resultado.datos?.enlace ?? null);
      setCopiado(false);
      toast.success(resultado.mensaje ?? "Invitación creada.");
    });

  const copiar = () =>
    iniciarTransicion(async () => {
      if (!enlace) return;
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      toast.success("Enlace copiado.");
    });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        La invitación es para <strong className="text-foreground">{correo}</strong>. Dura 7 días y reemplaza a la anterior
        si todavía no se aceptó.
      </p>
      <BotonEnvio type="button" pendiente={pendiente} textoPendiente="Enviando…" onClick={invitar}>
        <Mail aria-hidden="true" />
        Invitar al portal
      </BotonEnvio>
      {enlace && (
        <div className="space-y-2">
          <p className="break-all rounded-xl bg-muted px-3 py-2 text-xs">{enlace}</p>
          <Button type="button" variant="outline" onClick={copiar} disabled={pendiente}>
            {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copiado ? "Copiado" : "Copiar enlace"}
          </Button>
        </div>
      )}
    </div>
  );
}
