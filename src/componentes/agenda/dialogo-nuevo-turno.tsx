"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { esFechaIso } from "@/lib/fechas";
import { esquemaHora, esquemaUuid } from "@/esquemas/comunes";
import { useDialogoRuta } from "@/componentes/comunes/dialogo-ruta";
import { Skeleton } from "@/componentes/ui/skeleton";
import { FormularioTurno, type PropiedadesFormularioTurno } from "./formulario-turno";

export function DialogoNuevoTurno({ fechaPredeterminada, ...propiedades }: Omit<PropiedadesFormularioTurno, "modo" | "enDialogo" | "alCancelar" | "alCambiarPendiente"> & { fechaPredeterminada: string }) {
  const { cerrar, fijarPendiente, apertura } = useDialogoRuta();
  const contenido = useRef<HTMLDivElement>(null);
  const parametros = useSearchParams();
  const fechaParam = parametros.get("fecha");
  const horaParam = parametros.get("hora");
  const pacienteParam = parametros.get("paciente");
  const inicial = {
    fecha: fechaParam && esFechaIso(fechaParam) ? fechaParam : fechaPredeterminada,
    hora: horaParam && esquemaHora.safeParse(horaParam).success ? horaParam : "09:00",
    pacienteId: pacienteParam && esquemaUuid.safeParse(pacienteParam).success ? pacienteParam : "",
  };
  useEffect(() => {
    contenido.current?.querySelector<HTMLButtonElement>('[role="combobox"]')?.focus();
  }, []);

  return <div ref={contenido} className="flex min-h-0 flex-1 flex-col">
    <FormularioTurno key={`${apertura}:${inicial.fecha}:${inicial.hora}:${inicial.pacienteId}`} {...propiedades} inicial={inicial} modo="alta" enDialogo alCambiarPendiente={fijarPendiente}
      alCancelar={cerrar} />
  </div>;
}

export function CargandoDialogoTurno() {
  return <div className="grid min-h-0 flex-1 lg:grid-cols-[16rem_minmax(0,1fr)]" role="status" aria-label="Cargando datos del nuevo turno">
    <div className="hidden flex-col gap-6 bg-primary p-7 text-primary-foreground lg:flex" aria-hidden="true">
      <div className="size-14 rounded-2xl bg-primary-foreground/15" />
      <div className="h-16 rounded-xl bg-primary-foreground/10" /><div className="h-24 rounded-xl bg-primary-foreground/10" />
      <div className="mt-auto h-24 rounded-xl bg-primary-foreground/10" />
    </div>
    <div className="flex min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-hidden p-5 sm:p-7" aria-hidden="true">
        <header className="pr-7"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Nuevo turno</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Reservá su próxima consulta</h2><p className="mt-1 text-sm text-muted-foreground">Elegí paciente, día y horario. El resto lo podés completar después.</p></header>
        <Skeleton className="h-4 w-36" /><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-3 gap-4"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t p-4 sm:px-7" aria-hidden="true"><Skeleton className="h-8 w-20" /><Skeleton className="h-8 w-32" /></div>
    </div>
  </div>;
}
