"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{nombreNatural(paciente)}</h1>
            <InsigniaPaciente estado={paciente.estado} />
          </div>
          <p className="text-sm text-muted-foreground">
            {[paciente.documento ? `Doc. ${paciente.documento}` : null, edad != null ? `${edad} años` : null, paciente.telefono]
              .filter(Boolean)
              .join(" · ") || "Sin datos de contacto adicionales"}
          </p>
        </div>
        <div className="grid gap-1 text-sm sm:text-right">
          <p>
            <span className="text-muted-foreground">Última consulta: </span>
            {ultimaConsultaInicio ? formatearFechaHora(new Date(ultimaConsultaInicio), zonaHoraria) : "Sin consultas"}
          </p>
          <p>
            <span className="text-muted-foreground">Próximo turno: </span>
            {proximoTurnoInicio ? formatearFechaHora(new Date(proximoTurnoInicio), zonaHoraria) : "Sin turnos próximos"}
          </p>
          <Link href={`${base}/editar`} className="text-primary hover:underline">
            Editar ficha
          </Link>
        </div>
      </div>
      <Pestanas
        actual={rutaActual}
        items={[
          { href: base, etiqueta: "Resumen", exacta: true },
          { href: `${base}/historia`, etiqueta: "Historia clínica" },
          { href: `${base}/mediciones`, etiqueta: "Mediciones" },
          { href: `${base}/objetivos`, etiqueta: "Objetivos" },
          { href: `${base}/turnos`, etiqueta: "Turnos" },
          { href: `${base}/planes`, etiqueta: "Planes" },
          { href: `${base}/visibilidad`, etiqueta: "Visibilidad" },
        ]}
      />
    </div>
  );
}
