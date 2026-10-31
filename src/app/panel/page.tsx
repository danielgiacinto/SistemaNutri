import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, CalendarDays, CalendarPlus, CheckCircle2, ClipboardList, ClipboardPen, UserPlus, Users } from "lucide-react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { obtenerDatosTablero } from "@/servicios/tablero";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { LOCALE_PREDETERMINADO } from "@/configuracion/producto";
import { formatearFechaHora, formatearFechaIso, hoyEnZona, minutosEntre } from "@/lib/fechas";
import { nombreNatural } from "@/lib/antropometria";
import { cn } from "@/lib/utilidades";

export const metadata: Metadata = { title: "Inicio" };

export default function PaginaInicioPanel() {
  return (
    <Suspense fallback={<EsqueletoInicio />}>
      <ContenidoInicio />
    </Suspense>
  );
}

async function ContenidoInicio() {
  const contexto = await requerirProfesional();
  const cliente = await crearClienteServidor();
  const hoy = hoyEnZona(contexto.consultorio.zonaHoraria);
  const tablero = await obtenerDatosTablero(cliente, contexto.consultorio.id, contexto.consultorio.zonaHoraria, hoy);
  const fechaHoy = new Intl.DateTimeFormat(LOCALE_PREDETERMINADO, {
    dateStyle: "full",
    timeZone: contexto.consultorio.zonaHoraria,
  }).format(new Date());
  const maximoActividad = Math.max(1, ...tablero.actividadHabil.map((punto) => punto.cantidad));
  const destacado = tablero.turnoEnCurso ?? tablero.proximoTurno;
  const progresoConsulta =
    tablero.turnoEnCurso != null
      ? Math.min(
          100,
          Math.max(
            0,
            ((new Date().getTime() - new Date(tablero.turnoEnCurso.inicio).getTime()) /
              (new Date(tablero.turnoEnCurso.fin).getTime() - new Date(tablero.turnoEnCurso.inicio).getTime())) *
              100,
          ),
        )
      : null;

  const tarjetas = [
    { titulo: "Pacientes", valor: tablero.metricas.pacientesTotales, detalle: `${tablero.metricas.pacientesActivos} activos`, icono: Users, href: "/panel/pacientes" },
    { titulo: "Turnos hoy", valor: tablero.metricas.turnosHoy, detalle: "Programados para hoy", icono: CalendarDays, href: "/panel/agenda?vista=dia" },
    { titulo: "Atendidos hoy", valor: tablero.metricas.atendidosHoy, detalle: "Consultas completadas", icono: CheckCircle2, href: "/panel/agenda?vista=dia" },
    { titulo: "Pendientes", valor: tablero.metricas.consultasPendientes, detalle: "Turnos pasados sin cerrar", icono: ClipboardList, href: "/panel/agenda" },
    { titulo: "Controles próximos", valor: tablero.metricas.proximosControles, detalle: "Turnos de tipo control a futuro", icono: CalendarClock, href: "/panel/agenda" },
  ];

  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo={
          <>
            Hola, <span className="text-primary">{contexto.nombre || "colega"}</span>
          </>
        }
        descripcion={<span className="first-letter:uppercase">{fechaHoy}</span>}
        acciones={
          <>
            <Button asChild variant="outline">
              <Link href="/panel/pacientes/nuevo">
                <UserPlus aria-hidden="true" />
                Paciente
              </Link>
            </Button>
            <Button asChild>
              <Link href="/panel/agenda/nuevo">
                <CalendarDays aria-hidden="true" />
                Turno
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(({ titulo, valor, detalle, icono: Icono, href }) => (
          <Link key={titulo} href={href} className="rounded-2xl border bg-card p-4 transition-colors hover:border-primary/30">
            <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Icono className="size-4" aria-hidden="true" />
              {titulo}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{valor.toLocaleString(LOCALE_PREDETERMINADO)}</p>
            <p className="text-sm text-muted-foreground">{detalle}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{tablero.turnoEnCurso ? "En consulta" : "Próximo paciente"}</CardTitle>
            <CardDescription>
              {tablero.turnoEnCurso ? "La consulta está en curso." : "El siguiente turno de la agenda."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {destacado?.pacientes ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    {destacado.pacientes.nombre[0]}
                    {destacado.pacientes.apellido[0]}
                  </span>
                  <div>
                    <p className="font-semibold">{nombreNatural(destacado.pacientes)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatearFechaHora(new Date(destacado.inicio), contexto.consultorio.zonaHoraria)}
                      {destacado.pacientes.documento ? ` · DNI ${destacado.pacientes.documento}` : ""}
                    </p>
                  </div>
                </div>
                {progresoConsulta != null && (
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progresoConsulta)} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full bg-primary" style={{ width: `${progresoConsulta}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Math.round(minutosEntre(new Date(destacado.inicio), new Date()))} min transcurridos
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={`/panel/agenda/${destacado.id}`}>
                      <CalendarDays aria-hidden="true" />
                      Ver turno
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/panel/pacientes/${destacado.paciente_id}/historia/nueva?turno=${destacado.id}`}>
                      <ClipboardPen aria-hidden="true" />
                      Continuar historia
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <EstadoVacio
                icono={CalendarDays}
                titulo="No hay turnos próximos"
                descripcion="Cuando agendes una consulta, el próximo paciente va a aparecer acá."
                accion={
                  <Button asChild>
                    <Link href="/panel/agenda/nuevo">
                      <CalendarPlus aria-hidden="true" />
                      Agendar turno
                    </Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="bg-foreground text-background ring-0">
          <CardHeader>
            <CardTitle className="text-background">Evolución</CardTitle>
            <CardDescription className="text-background/70">Turnos de los últimos 5 días hábiles</CardDescription>
          </CardHeader>
          <CardContent className="flex h-44 items-end gap-2">
            {tablero.actividadHabil.every((punto) => punto.cantidad === 0) ? (
              <p className="self-center text-sm text-background/70">Todavía no hay actividad para graficar.</p>
            ) : (
              tablero.actividadHabil.map((punto) => (
                <div key={punto.fecha} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={cn("w-full rounded-t-md bg-primary", punto.cantidad === 0 && "bg-background/20")}
                    style={{ height: `${Math.max(8, (punto.cantidad / maximoActividad) * 100)}%` }}
                    title={`${punto.cantidad} turnos`}
                  />
                  <span className="text-[0.65rem] text-background/70">{formatearFechaIso(punto.fecha, "short").slice(0, 5)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evoluciones recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {tablero.evolucionesRecientes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Cuando publiques una nota clínica va a aparecer en este listado.</p>
          ) : (
            <ul className="divide-y">
              {tablero.evolucionesRecientes.map((evolucion) => (
                <li key={evolucion.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{evolucion.titulo || "Evolución clínica"}</p>
                    <p className="text-sm text-muted-foreground">
                      {evolucion.pacientes ? nombreNatural(evolucion.pacientes) : "Paciente"} ·{" "}
                      {formatearFechaHora(new Date(evolucion.actualizado_en), contexto.consultorio.zonaHoraria)}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/panel/pacientes/${evolucion.paciente_id}/historia/${evolucion.id}`}>
                      <ArrowUpRight aria-hidden="true" />
                      Abrir
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EsqueletoInicio() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Cargando inicio">
      <Skeleton className="h-16 w-80" />
      <div className="grid gap-3 sm:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
