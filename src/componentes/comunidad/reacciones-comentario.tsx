"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cambiarReaccion } from "@/acciones/comunidad";
import { Button } from "@/componentes/ui/button";

const OPCIONES = [
  { emoji: "👍", etiqueta: "Me gusta" },
  { emoji: "❤️", etiqueta: "Me encanta" },
  { emoji: "🎉", etiqueta: "Celebrar" },
  { emoji: "💪", etiqueta: "Dar ánimo" },
];

export function ReaccionesComentario({ actividadId, reacciones, usuarioId, abierto }: {
  actividadId: string;
  reacciones: { emoji: string; usuario_id: string }[];
  usuarioId: string;
  abierto: boolean;
}) {
  const [pendiente, iniciar] = useTransition();
  return <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Reacciones al comentario">
    {OPCIONES.map(({ emoji, etiqueta }) => {
      const cantidad = reacciones.filter(reaccion => reaccion.emoji === emoji).length;
      const propia = reacciones.some(reaccion => reaccion.emoji === emoji && reaccion.usuario_id === usuarioId);
      if (!abierto && !cantidad) return null;
      return <Button key={emoji} type="button" size="sm" variant={propia ? "secondary" : "outline"}
        className="min-h-11 gap-1.5 rounded-full" aria-label={`${etiqueta}: ${cantidad}`} aria-pressed={propia}
        disabled={pendiente || !abierto} onClick={() => iniciar(async () => {
          try {
            const resultado = await cambiarReaccion(actividadId, emoji, !propia);
            if (!resultado.ok) toast.error(resultado.mensaje);
          } catch { toast.error("No se pudo guardar la reacción."); }
        })}>
        <span aria-hidden="true">{emoji}</span><span>{cantidad}</span>
      </Button>;
    })}
  </div>;
}
