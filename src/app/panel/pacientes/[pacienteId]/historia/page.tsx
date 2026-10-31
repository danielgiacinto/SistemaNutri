import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, ArrowUpRight, ClipboardPen } from "lucide-react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { obtenerLineaDeTiempo } from "@/servicios/linea-tiempo";
import { listarTurnosDelPaciente } from "@/servicios/turnos";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { VentanaFormulario } from "@/componentes/comunes/ventana-formulario";
import { FormularioEvolucion } from "@/componentes/clinica/formulario-evolucion";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { formatearFechaHora } from "@/lib/fechas";
import { ETIQUETAS_ESTADO_OBJETIVO, ETIQUETAS_ESTADO_TURNO } from "@/configuracion/clinica";

export const metadata: Metadata = { title: "Historia clínica" };

const ETIQUETA_TIPO = {
  evolucion: "Evolución",
  medicion: "Medición",
  objetivo: "Objetivo",
  turno: "Turno",
  plan: "Plan",
};

export default async function PaginaHistoria({ params }: PageProps<"/panel/pacientes/[pacienteId]/historia">) {
  const { pacienteId } = await params;
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const eventos = await obtenerLineaDeTiempo(cliente, contexto.consultorio.id, paciente.id);
  const turnos = await listarTurnosDelPaciente(cliente, contexto.consultorio.id, paciente.id);

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Historia clínica"
        descripcion="Evoluciones, mediciones, objetivos y turnos."
        acciones={
          <VentanaFormulario icono={<ClipboardPen aria-hidden="true" />} etiqueta="Nueva evolución" titulo="Nueva evolución" descripcion="Nace como borrador y privada." className="max-w-2xl">
            <FormularioEvolucion
              modo="alta"
              pacienteId={paciente.id}
              zonaHoraria={contexto.consultorio.zonaHoraria}
              turnos={turnos}
              inicial={{ esBorrador: true, visibleParaPaciente: false }}
            />
          </VentanaFormulario>
        }
      />
      {eventos.length === 0 ? (
        <EstadoVacio
          icono={ClipboardList}
          titulo="Todavía no hay eventos en la historia"
          descripcion="Registrá una evolución, una medición o un turno para construir la línea de tiempo."
        />
      ) : (
        <ol className="space-y-4">
          {eventos.map((evento) => (
            <li key={evento.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Badge variant="outline">{ETIQUETA_TIPO[evento.tipo]}</Badge>
                <time className="text-xs text-muted-foreground" dateTime={evento.instante}>
                  {formatearFechaHora(new Date(evento.instante), contexto.consultorio.zonaHoraria)}
                </time>
              </div>
              <h2 className="mt-1 font-semibold">{evento.titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{evento.resumen}</p>
              {evento.destacado && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {evento.tipo === "turno"
                    ? ETIQUETAS_ESTADO_TURNO[evento.destacado as keyof typeof ETIQUETAS_ESTADO_TURNO] ?? evento.destacado
                    : evento.tipo === "objetivo"
                      ? ETIQUETAS_ESTADO_OBJETIVO[evento.destacado as keyof typeof ETIQUETAS_ESTADO_OBJETIVO] ?? evento.destacado
                      : evento.destacado}
                </p>
              )}
              {evento.href && (
                <Button asChild variant="ghost" size="sm" className="mt-2 px-0">
                  <Link href={evento.href}>
                    <ArrowUpRight aria-hidden="true" />
                    Ver detalle
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
