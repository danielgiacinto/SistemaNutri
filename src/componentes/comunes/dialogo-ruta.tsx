"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { cn } from "@/lib/utilidades";

const ContextoDialogoRuta = createContext<{ cerrar: () => void; fijarPendiente: (pendiente: boolean) => void; apertura: number } | null>(null);

export function useDialogoRuta() {
  const contexto = useContext(ContextoDialogoRuta);
  if (!contexto) throw new Error("El contenido necesita un diálogo de ruta.");
  return contexto;
}

/** El marco permanece montado mientras Suspense resuelve únicamente el contenido. */
export function DialogoRuta({ titulo, descripcion, children, volverA, formulario = false, compacto = false, icono }: {
  titulo: string;
  descripcion: string;
  children: ReactNode;
  volverA?: string;
  formulario?: boolean;
  compacto?: boolean;
  icono?: ReactNode;
}) {
  const enrutador = useRouter();
  const [pendiente, fijarPendiente] = useState(false);
  const [apertura, fijarApertura] = useState(0);
  const focoAnterior = useRef<HTMLElement | null>(null);
  function cerrar() {
    if (pendiente) return;
    fijarApertura(numero => numero + 1);
    if (volverA) enrutador.replace(volverA, { scroll: false }); else enrutador.back();
  }

  return <Dialog open onOpenChange={abierto => { if (!abierto) cerrar(); }}>
    <DialogContent className={cn("flex flex-col gap-0 overflow-hidden p-0", formulario ? "h-[min(90dvh,46rem)] max-w-4xl" : compacto ? "h-[min(90dvh,32rem)] max-w-3xl" : "h-[min(90dvh,42rem)] max-w-4xl")}
      onInteractOutside={evento => evento.preventDefault()}
      onOpenAutoFocus={() => { focoAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
      onCloseAutoFocus={evento => { evento.preventDefault(); if (focoAnterior.current?.isConnected) focoAnterior.current.focus(); }}>
      {formulario ? <><DialogTitle className="sr-only">{titulo}</DialogTitle><DialogDescription className="sr-only">{descripcion}</DialogDescription></> :
        <div className="flex shrink-0 items-start gap-3 border-b p-5 pr-12 sm:p-6 sm:pr-12">
          {icono && <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">{icono}</span>}
          <DialogHeader className="pr-0"><DialogTitle>{titulo}</DialogTitle><DialogDescription>{descripcion}</DialogDescription></DialogHeader>
        </div>}
      <ContextoDialogoRuta.Provider value={{ cerrar, fijarPendiente, apertura }}>
        {formulario ? children : <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>}
      </ContextoDialogoRuta.Provider>
    </DialogContent>
  </Dialog>;
}
