import { Suspense } from "react";
import CargandoSeccionPaciente from "../loading";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { TituloTarjeta } from "@/componentes/comunes/titulo-tarjeta";
import type { Metadata } from "next";
import { Pencil, Plus, Target } from "lucide-react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarObjetivos } from "@/servicios/objetivos";
import { FormularioObjetivo } from "@/componentes/clinica/formulario-objetivo";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { InsigniaObjetivo } from "@/componentes/comunes/insignia-estado";
import { VentanaFormulario } from "@/componentes/comunes/ventana-formulario";
import { InsigniaVisibilidad } from "@/componentes/comunes/insignia-estado";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { ETIQUETAS_CATEGORIA_OBJETIVO } from "@/configuracion/clinica";
import { formatearFechaIso } from "@/lib/fechas";

export const metadata: Metadata = { title: "Objetivos" };

export default function PaginaObjetivos({ params }: PageProps<"/panel/pacientes/[pacienteId]/objetivos">) {
  return <Suspense fallback={<CargandoSeccionPaciente />}><ContenidoSeccion params={params} /></Suspense>;
}

async function ContenidoSeccion({ params }: Pick<PageProps<"/panel/pacientes/[pacienteId]/objetivos">, "params">) {
  const { pacienteId } = await params;
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const objetivos = await listarObjetivos(cliente, contexto.consultorio.id, paciente.id);
  const activos = objetivos.filter((objetivo) => ["pendiente", "en_progreso"].includes(objetivo.estado));
  const historial = objetivos.filter((objetivo) => ["completado", "cancelado"].includes(objetivo.estado));

  return (
    <div className="space-y-6">
      <EncabezadoPagina nivel={2} titulo="Objetivos" descripcion="Acompañá sus metas y actualizá el progreso de cada objetivo." acciones={
        <VentanaFormulario icono={<Plus aria-hidden="true" />} etiqueta="Nuevo objetivo" titulo="Nuevo objetivo" descripcion="Peso, hábito u otra meta.">
          <FormularioObjetivo modo="alta" pacienteId={paciente.id} />
        </VentanaFormulario>
      } />

      {activos.length === 0 ? (
        <EstadoVacio icono={Target} titulo="Sin objetivos activos" descripcion="Definí un objetivo para destacarlo en la ficha." />
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {activos.map((objetivo) => (
            <Card key={objetivo.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Target className="size-4" aria-hidden="true" /></span><h2 className="min-w-0 flex-1 wrap-anywhere">
                  {objetivo.titulo}</h2>
                  <InsigniaObjetivo estado={objetivo.estado} />
                </CardTitle>
                <CardDescription>
                  {ETIQUETAS_CATEGORIA_OBJETIVO[objetivo.categoria]}
                  {objetivo.fecha_objetivo ? ` · meta ${formatearFechaIso(objetivo.fecha_objetivo)}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 space-y-2 text-sm text-muted-foreground wrap-anywhere">
                  {objetivo.descripcion ? <p>{objetivo.descripcion}</p> : null}
                  <InsigniaVisibilidad visible={objetivo.visible_para_paciente} />
                </div>
                <VentanaFormulario icono={<Pencil aria-hidden="true" />} etiqueta="Editar" titulo="Editar objetivo" variante="outline">
                  <FormularioObjetivo
                    modo="edicion"
                    pacienteId={paciente.id}
                    inicial={{
                      objetivoId: objetivo.id,
                      pacienteId: paciente.id,
                      titulo: objetivo.titulo,
                      descripcion: objetivo.descripcion ?? "",
                      categoria: objetivo.categoria,
                      fechaObjetivo: objetivo.fecha_objetivo ?? "",
                      estado: objetivo.estado,
                      progreso: objetivo.progreso ?? "",
                      valorInicial: objetivo.valor_inicial ?? "",
                      valorObjetivo: objetivo.valor_objetivo ?? "",
                      unidad: objetivo.unidad ?? "",
                      observaciones: objetivo.observaciones ?? "",
                      visibleParaPaciente: objetivo.visible_para_paciente,
                    }}
                  />
                </VentanaFormulario>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {historial.length > 0 && (
        <Card>
          <CardHeader>
            <TituloTarjeta icono={Target}>Objetivos finalizados</TituloTarjeta>
          </CardHeader>
          <CardContent className="space-y-3">
            {historial.map((objetivo) => (
              <div key={objetivo.id} className="flex flex-wrap items-start justify-between gap-3 border-b pb-4 last:border-0 last:pb-0 [&>div]:min-w-0 [&>div]:wrap-anywhere">
                <div>
                  <p className="font-medium">{objetivo.titulo}</p>
                  <p className="text-sm text-muted-foreground">{ETIQUETAS_CATEGORIA_OBJETIVO[objetivo.categoria]}</p>
                </div>
                <InsigniaObjetivo estado={objetivo.estado} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
