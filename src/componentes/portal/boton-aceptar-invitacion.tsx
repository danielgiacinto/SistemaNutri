"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { aceptarInvitacionActual } from "@/acciones/invitaciones";
import { BotonEnvio } from "@/componentes/formularios/boton-envio";

export function BotonAceptarInvitacion({ token }: { token: string | null }) {
  const [pendiente, iniciarTransicion] = useTransition();

  const aceptar = () =>
    iniciarTransicion(async () => {
      const resultado = await aceptarInvitacionActual(token);
      if (!resultado?.ok) toast.error(resultado?.mensaje ?? "No pudimos aceptar la invitación.");
    });

  return (
    <BotonEnvio type="button" pendiente={pendiente} textoPendiente="Aceptando…" icono={Check} className="h-10 w-full" onClick={aceptar}>
      Aceptar invitación
    </BotonEnvio>
  );
}
