"use client";

import { useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { esFechaIso } from "@/lib/fechas";
import { esquemaHora, esquemaUuid } from "@/esquemas/comunes";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/componentes/ui/dialog";
import { Skeleton } from "@/componentes/ui/skeleton";
import { FormularioTurno, type PropiedadesFormularioTurno } from "./formulario-turno";

function MarcoDialogoTurno({ children, pendiente = false, volverA, alCerrar }: { children: ReactNode; pendiente?: boolean; volverA?: string; alCerrar?: () => void }) {
  const enrutador = useRouter();
  const focoAnterior = useRef<HTMLElement | null>(null);
  function cerrar() {
    if (pendiente) return;
    if (alCerrar) alCerrar();
    else if (volverA) enrutador.replace(volverA, { scroll: false });
    else enrutador.back();
  }

  return <Dialog open onOpenChange={abierto => { if (!abierto) cerrar(); }}>
    <DialogContent className="flex h-[min(90dvh,46rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0"
      onInteractOutside={evento => evento.preventDefault()}
      onOpenAutoFocus={() => { focoAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
      onCloseAutoFocus={evento => { evento.preventDefault(); if (focoAnterior.current?.isConnected) focoAnterior.current.focus(); }}>
      <DialogTitle className="sr-only">Nuevo turno</DialogTitle>
      <DialogDescription className="sr-only">Elegí paciente, servicio, fecha y horario para agendar la consulta.</DialogDescription>
      {children}
    </DialogContent>
  </Dialog>;
}

export function DialogoNuevoTurno({ volverA, fechaPredeterminada, ...propiedades }: Omit<PropiedadesFormularioTurno, "modo" | "enDialogo" | "alCancelar" | "alCambiarPendiente"> & { volverA?: string; fechaPredeterminada: string }) {
  const [pendiente, fijarPendiente] = useState(false);
  const [apertura, fijarApertura] = useState(0);
  const enrutador = useRouter();
  const parametros = useSearchParams();
  const fechaParam = parametros.get("fecha");
  const horaParam = parametros.get("hora");
  const pacienteParam = parametros.get("paciente");
  const inicial = {
    fecha: fechaParam && esFechaIso(fechaParam) ? fechaParam : fechaPredeterminada,
    hora: horaParam && esquemaHora.safeParse(horaParam).success ? horaParam : "09:00",
    pacienteId: pacienteParam && esquemaUuid.safeParse(pacienteParam).success ? pacienteParam : "",
  };
  function cerrar() {
    if (pendiente) return;
    fijarApertura(numero => numero + 1);
    if (volverA) enrutador.replace(volverA, { scroll: false }); else enrutador.back();
  }

  return <MarcoDialogoTurno pendiente={pendiente} volverA={volverA} alCerrar={cerrar}>
    <FormularioTurno key={`${apertura}:${inicial.fecha}:${inicial.hora}:${inicial.pacienteId}`} {...propiedades} inicial={inicial} modo="alta" enDialogo alCambiarPendiente={fijarPendiente} alCancelar={cerrar} />
  </MarcoDialogoTurno>;
}

export function CargandoDialogoTurno({ volverA }: { volverA?: string }) {
  return <MarcoDialogoTurno volverA={volverA}><div className="space-y-6 p-7" role="status" aria-label="Cargando datos del nuevo turno">
    <p className="font-semibold">Preparando tu próximo turno…</p><Skeleton className="h-16 w-3/4" /><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-28" />
  </div></MarcoDialogoTurno>;
}
