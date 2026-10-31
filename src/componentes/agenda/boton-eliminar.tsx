"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { quitarBloqueo, quitarHorario } from "@/acciones/agenda";
import { Button } from "@/componentes/ui/button";

export function BotonEliminarHorario({ id }: { id: string }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          const resultado = await quitarHorario(id);
          if (!resultado.ok) toast.error(resultado.mensaje);
          else toast.success(resultado.mensaje);
        })
      }
    >
      <Trash2 aria-hidden="true" />
      Quitar
    </Button>
  );
}

export function BotonEliminarBloqueo({ id }: { id: string }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          const resultado = await quitarBloqueo(id);
          if (!resultado.ok) toast.error(resultado.mensaje);
          else toast.success(resultado.mensaje);
        })
      }
    >
      <Trash2 aria-hidden="true" />
      Quitar
    </Button>
  );
}
