import type { Metadata } from "next";
import { Plus, Scale } from "lucide-react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarMediciones } from "@/servicios/mediciones";
import { listarObjetivos } from "@/servicios/objetivos";
import { FormularioMedicion } from "@/componentes/clinica/formulario-medicion";
import { GraficoPeso } from "@/componentes/clinica/grafico-peso";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { VentanaFormulario } from "@/componentes/comunes/ventana-formulario";
import { Badge } from "@/componentes/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";
import { calcularImc } from "@/lib/antropometria";
import { fechaEnZona, formatearFechaHora, horaEnZona, hoyEnZona } from "@/lib/fechas";
import { cn } from "@/lib/utilidades";

const COLUMNAS_MEDICION = "sm:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.7fr))_auto]";

export const metadata: Metadata = { title: "Mediciones" };

export default async function PaginaMediciones({ params }: PageProps<"/panel/pacientes/[pacienteId]/mediciones">) {
  const { pacienteId } = await params;
  const { paciente, contexto, cliente } = await requerirPacienteDelConsultorio(pacienteId);
  const [mediciones, objetivos] = await Promise.all([
    listarMediciones(cliente, contexto.consultorio.id, paciente.id),
    listarObjetivos(cliente, contexto.consultorio.id, paciente.id),
  ]);
  const puntosPeso = mediciones
    .filter((medicion) => medicion.peso_kg != null)
    .map((medicion) => ({
      fecha: fechaEnZona(new Date(medicion.registrado_en), contexto.consultorio.zonaHoraria),
      peso: Number(medicion.peso_kg),
    }));
  const objetivoPeso = objetivos.find(
    (objetivo) => objetivo.categoria === "peso" && objetivo.valor_objetivo != null && ["pendiente", "en_progreso"].includes(objetivo.estado),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Registros</h2>
        <VentanaFormulario icono={<Plus aria-hidden="true" />} etiqueta="Registrar medición" titulo="Nueva medición" descripcion="El IMC se calcula con peso y talla.">
          <FormularioMedicion
            pacienteId={paciente.id}
            fechaPredeterminada={hoyEnZona(contexto.consultorio.zonaHoraria)}
            horaPredeterminada={horaEnZona(contexto.consultorio.zonaHoraria)}
          />
        </VentanaFormulario>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolución del peso</CardTitle>
        </CardHeader>
        <CardContent>
          {puntosPeso.length === 0 ? (
            <EstadoVacio icono={Scale} titulo="Sin peso registrado" descripcion="Cuando cargues mediciones de peso vas a ver el gráfico acá." />
          ) : (
            <GraficoPeso puntos={puntosPeso} pesoObjetivo={objetivoPeso?.valor_objetivo ?? null} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {mediciones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay mediciones.</p>
          ) : (
            <div>
              <div
                className={cn(
                  "hidden border-b pb-2 text-sm font-medium text-muted-foreground sm:grid sm:items-center sm:gap-3",
                  COLUMNAS_MEDICION,
                )}
              >
                <span>Fecha</span>
                <span>Peso</span>
                <span>Talla</span>
                <span>IMC</span>
                <span>Portal</span>
              </div>
              <ul>
                {[...mediciones].reverse().map((medicion) => (
                  <li
                    key={medicion.id}
                    className={cn(
                      "grid grid-cols-2 items-center gap-x-4 gap-y-2 border-b py-3 text-sm last:border-0 sm:gap-3",
                      COLUMNAS_MEDICION,
                    )}
                  >
                    <span className="col-span-2 min-w-0 sm:col-span-1">
                      <span className="block text-xs text-muted-foreground sm:sr-only">Fecha</span>
                      <span className="block truncate">
                        {formatearFechaHora(new Date(medicion.registrado_en), contexto.consultorio.zonaHoraria)}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs text-muted-foreground sm:sr-only">Peso</span>
                      <span className="block truncate tabular-nums">{medicion.peso_kg != null ? `${medicion.peso_kg} kg` : "—"}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs text-muted-foreground sm:sr-only">Talla</span>
                      <span className="block truncate tabular-nums">{medicion.talla_cm != null ? `${medicion.talla_cm} cm` : "—"}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs text-muted-foreground sm:sr-only">IMC</span>
                      <span className="block truncate tabular-nums">{calcularImc(medicion.peso_kg, medicion.talla_cm) ?? "—"}</span>
                    </span>
                    <span className="justify-self-start">
                      <span className="mb-1 block text-xs text-muted-foreground sm:sr-only">Portal</span>
                      <Badge variant={medicion.visible_para_paciente ? "default" : "outline"}>
                        {medicion.visible_para_paciente ? "Visible" : "Privada"}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
