"use client";

import { useTransition } from "react";
import { Lock, Send, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { borrarBorradorDesafio, cerrarDesafio, publicarDesafio, quitarActividad, unirseADesafio } from "@/acciones/comunidad";
import { Button } from "@/componentes/ui/button";
import type { EstadoDesafio } from "@/tipos/entidades";

export function ControlesDesafio({ desafioId, estado }: { desafioId: string; estado: EstadoDesafio }) {
  const [pendiente, iniciar] = useTransition();

  const ejecutar = (accion: () => Promise<{ ok: boolean; mensaje?: string }>) =>
    iniciar(async () => {
      const resultado = await accion();
      if (!resultado.ok) toast.error(resultado.mensaje ?? "No se pudo completar.");
      else if (resultado.mensaje) toast.success(resultado.mensaje);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {estado === "borrador" && (
        <>
          <Button type="button" disabled={pendiente} onClick={() => ejecutar(() => publicarDesafio(desafioId))}>
            <Send aria-hidden="true" />
            Publicar
          </Button>
          <Button type="button" variant="outline" disabled={pendiente} onClick={() => ejecutar(() => borrarBorradorDesafio(desafioId))}>
            <Trash2 aria-hidden="true" />
            Borrar borrador
          </Button>
        </>
      )}
      {estado === "publicado" && (
        <Button type="button" variant="outline" disabled={pendiente} onClick={() => ejecutar(() => cerrarDesafio(desafioId))}>
          <Lock aria-hidden="true" />
          Cerrar
        </Button>
      )}
    </div>
  );
}

export function BotonSumarse({ desafioId }: { desafioId: string }) {
  const [pendiente, iniciar] = useTransition();

  return (
    <Button
      type="button"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          const resultado = await unirseADesafio(desafioId);
          if (!resultado.ok) toast.error(resultado.mensaje);
          else toast.success(resultado.mensaje ?? "Ya estás en el desafío.");
        })
      }
    >
      {pendiente ? "Sumándote…" : <><UserPlus aria-hidden="true" /> Sumarme</>}
    </Button>
  );
}

export function BotonBorrarActividad({ actividadId }: { actividadId: string }) {
  const [pendiente, iniciar] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          const resultado = await quitarActividad(actividadId);
          if (!resultado.ok) toast.error(resultado.mensaje);
          else if (resultado.mensaje) toast.success(resultado.mensaje);
        })
      }
    >
      <Trash2 aria-hidden="true" />
      Borrar
    </Button>
  );
}
