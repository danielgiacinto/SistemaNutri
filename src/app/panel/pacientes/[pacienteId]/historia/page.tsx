import { InsigniaEvolucion } from "@/componentes/comunes/insignia-estado";
import { Suspense } from "react";
import CargandoSeccionPaciente from "../loading";
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

export const metadata: Metadata = { title: "Historia clínica" };

const ETIQUETA_TIPO = { evolucion: "Evolución" };
const ICONOS_TIPO = { evolucion: ClipboardPen };

export default function PaginaHistoria({ params }: PageProps<"/panel/pacientes/[pacienteId]/historia">) {
  return <Suspense fallback={<CargandoSeccionPaciente />}><ContenidoSeccion params={params} /></Suspense>;
}

async function ContenidoSeccion({ params }: Pick<PageProps<"/panel/pacientes/[pacienteId]/historia">, "params">) {
  const { pacienteId } = await params;
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const [eventos, turnos] = await Promise.all([
    obtenerLineaDeTiempo(cliente, contexto.consultorio.id, paciente.id),
    listarTurnosDelPaciente(cliente, contexto.consultorio.id, paciente.id),
  ]);

  return (
    <div className="space-y-6">
      <EncabezadoPagina nivel={2}
        titulo="Historia clínica"
        descripcion="Notas y evoluciones clínicas del paciente."
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
          descripcion="Registrá la primera evolución para iniciar la historia clínica."
        />
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-5 sm:pl-8">
          {eventos.map((evento) => {
            const Icono = ICONOS_TIPO[evento.tipo];
            return (
              <li key={evento.id} className="relative min-w-0 space-y-2 rounded-2xl border bg-card p-4 sm:p-5"><span className="absolute -left-8 top-5 flex size-6 items-center justify-center rounded-full border bg-accent text-accent-foreground sm:-left-11"><Icono className="size-3.5" aria-hidden="true" /></span>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Badge variant="outline">{ETIQUETA_TIPO[evento.tipo]}</Badge>
                  <time className="text-xs text-muted-foreground" dateTime={evento.instante}>
                    {formatearFechaHora(new Date(evento.instante), contexto.consultorio.zonaHoraria)}
                  </time>
                </div>
                <h2 className="mt-1 font-semibold wrap-anywhere">{evento.titulo}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground wrap-anywhere">{evento.resumen}</p>
                {evento.destacado && (
                  <InsigniaEvolucion estado={evento.destacado} />
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
            );
          })}
        </ol>
      )}
    </div>
  );
}
