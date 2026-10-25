import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { obtenerDatosTablero } from "@/servicios/tablero";
import { contarPacientes } from "@/servicios/pacientes";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { LOCALE_PREDETERMINADO } from "@/configuracion/producto";
import { hoyEnZona } from "@/lib/fechas";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Analíticas" };

export default function PaginaAnaliticas() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const contexto = await requerirProfesional();
  const cliente = await crearClienteServidor();
  const hoy = hoyEnZona(contexto.consultorio.zonaHoraria);
  const [tablero, pacientes] = await Promise.all([
    obtenerDatosTablero(cliente, contexto.consultorio.id, contexto.consultorio.zonaHoraria, hoy),
    contarPacientes(cliente, contexto.consultorio.id),
  ]);

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Analíticas"
        descripcion="Indicadores calculados con datos reales del consultorio. Sin estimaciones ni cifras de demostración."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metrica titulo="Pacientes activos" valor={pacientes.activos} detalle={`de ${pacientes.total} registrados`} />
        <Metrica titulo="Turnos de hoy" valor={tablero.metricas.turnosHoy} detalle={`${tablero.metricas.atendidosHoy} completados`} />
        <Metrica titulo="Consultas pendientes de cerrar" valor={tablero.metricas.consultasPendientes} detalle="Turnos vencidos aún programados o confirmados" />
        <Metrica titulo="Controles próximos" valor={tablero.metricas.proximosControles} detalle="Turnos de tipo control a futuro" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Actividad de los últimos 5 días hábiles</CardTitle>
          <CardDescription>Cantidad de turnos no cancelados, en la zona horaria del consultorio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {tablero.actividadHabil.map((punto) => (
            <p key={punto.fecha} className="flex justify-between text-sm">
              <span>{punto.fecha}</span>
              <span className="tabular-nums font-medium">{punto.cantidad.toLocaleString(LOCALE_PREDETERMINADO)}</span>
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metrica({ titulo, valor, detalle }: { titulo: string; valor: number; detalle: string }) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{titulo}</p>
        <p className="text-3xl font-bold tabular-nums">{valor.toLocaleString(LOCALE_PREDETERMINADO)}</p>
        <p className="text-sm text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  );
}
