"use client";

import Link from "next/link";
import { CalendarDays, Clock3, Pencil, UserRound } from "lucide-react";
import { Button } from "@/componentes/ui/button";
import { usePathname } from "next/navigation";
import { Volver } from "@/componentes/comunes/volver";
import { Pestanas } from "@/componentes/comunes/pestanas";
import { InsigniaPaciente } from "@/componentes/comunes/insignia-estado";
import { nombreNatural } from "@/lib/antropometria";
import { edadEnAnios, formatearFechaHora } from "@/lib/fechas";
import type { Paciente } from "@/tipos/entidades";

export function EncabezadoFicha({
  paciente,
  zonaHoraria,
  proximoTurnoInicio,
  ultimaConsultaInicio,
}: {
  paciente: Paciente;
  zonaHoraria: string;
  proximoTurnoInicio: string | null;
  ultimaConsultaInicio: string | null;
}) {
  const rutaActual = usePathname();
  const base = `/panel/pacientes/${paciente.id}`;
  const edad = paciente.fecha_nacimiento ? edadEnAnios(paciente.fecha_nacimiento) : null;

  return (
    <div className="space-y-6">
      <Volver href="/panel/pacientes" etiqueta="Pacientes" />
      <div className="grid gap-5 rounded-2xl border bg-card p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-accent-foreground" aria-hidden="true">{paciente.nombre[0]}{paciente.apellido[0]}</span>
          <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight wrap-anywhere">{nombreNatural(paciente)}</h1>
            <InsigniaPaciente estado={paciente.estado} />
          </div>
          <p className="flex items-start gap-2 text-sm text-muted-foreground wrap-anywhere">
            <UserRound className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {[paciente.documento ? `Doc. ${paciente.documento}` : null, edad != null ? `${edad} años` : null, paciente.telefono]
              .filter(Boolean)
              .join(" · ") || "Sin datos de contacto adicionales"}
          </p>
        </div>
        </div>
        <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1"><Clock3 className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-muted-foreground">Última consulta: </span>
            {ultimaConsultaInicio ? formatearFechaHora(new Date(ultimaConsultaInicio), zonaHoraria) : "Sin consultas"}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1"><CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-muted-foreground">Próximo turno: </span>
            {proximoTurnoInicio ? formatearFechaHora(new Date(proximoTurnoInicio), zonaHoraria) : "Sin turnos próximos"}
          </p>
          <Button asChild variant="outline" size="sm" className="w-full xl:w-fit xl:justify-self-end"><Link href={`${base}/editar`}><Pencil aria-hidden="true" />Editar ficha</Link></Button>
        </div>
      </div>
      <Pestanas
        cuadriculaMovil
        precargar
        actual={rutaActual}
        items={[
          { href: base, etiqueta: "Resumen", exacta: true },
          { href: `${base}/historia`, etiqueta: "Historia clínica" },
          { href: `${base}/mediciones`, etiqueta: "Mediciones" },
          { href: `${base}/objetivos`, etiqueta: "Objetivos" },
          { href: `${base}/turnos`, etiqueta: "Turnos" },
          { href: `${base}/pagos`, etiqueta: "Pagos y deudas" },
          { href: `${base}/planes`, etiqueta: "Planes" },
          { href: `${base}/visibilidad`, etiqueta: "Visibilidad" },
        ]}
      />
    </div>
  );
}
