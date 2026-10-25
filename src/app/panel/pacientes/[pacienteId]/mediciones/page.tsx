import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { requerirPacienteDelConsultorio } from "@/autorizacion/clinica";
import { listarMediciones } from "@/servicios/mediciones";
import { listarObjetivos } from "@/servicios/objetivos";
import { FormularioMedicion } from "@/componentes/clinica/formulario-medicion";
import { GraficoPeso } from "@/componentes/clinica/grafico-peso";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { calcularImc } from "@/lib/antropometria";
import { fechaEnZona, formatearFechaHora, horaEnZona, hoyEnZona } from "@/lib/fechas";

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
      <Card>
        <CardHeader>
          <CardTitle>Registrar medición</CardTitle>
          <CardDescription>El IMC se calcula cuando hay peso y talla. No se interpreta clínicamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioMedicion
            pacienteId={paciente.id}
            fechaPredeterminada={hoyEnZona(contexto.consultorio.zonaHoraria)}
            horaPredeterminada={horaEnZona(contexto.consultorio.zonaHoraria)}
          />
        </CardContent>
      </Card>

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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Fecha</th>
                    <th className="py-2 pr-3 font-medium">Peso</th>
                    <th className="py-2 pr-3 font-medium">Talla</th>
                    <th className="py-2 pr-3 font-medium">IMC</th>
                    <th className="py-2 font-medium">Visible</th>
                  </tr>
                </thead>
                <tbody>
                  {[...mediciones].reverse().map((medicion) => (
                    <tr key={medicion.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{formatearFechaHora(new Date(medicion.registrado_en), contexto.consultorio.zonaHoraria)}</td>
                      <td className="py-2 pr-3 tabular-nums">{medicion.peso_kg != null ? `${medicion.peso_kg} kg` : "—"}</td>
                      <td className="py-2 pr-3 tabular-nums">{medicion.talla_cm != null ? `${medicion.talla_cm} cm` : "—"}</td>
                      <td className="py-2 pr-3 tabular-nums">{calcularImc(medicion.peso_kg, medicion.talla_cm) ?? "—"}</td>
                      <td className="py-2">{medicion.visible_para_paciente ? "Sí" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
