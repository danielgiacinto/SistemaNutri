import { consultarEconomiaTurnos } from "@/servicios/finanzas";
import { estadoEconomico } from "@/tipos/finanzas";
import { CobroRapido } from "@/componentes/finanzas/cobro-rapido";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Clock } from "lucide-react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaFiltroAgenda } from "@/esquemas/turno";
import { listarTurnosEnRango } from "@/servicios/turnos";
import { listarBloqueos, listarHorarios } from "@/servicios/agenda";
import { horaEnZona, hoyEnZona, rangoDeVista } from "@/lib/fechas";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { CalendarioAgenda } from "@/componentes/agenda/calendario-agenda";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { esFechaIso } from "@/lib/fechas";

export const metadata: Metadata = { title: "Agenda" };

export default function PaginaAgenda({ searchParams }: PageProps<"/panel/agenda">) {
  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Agenda"
        descripcion="Tu día, organizado. Consultá tus turnos y encontrá el próximo espacio disponible."
        acciones={
          <>
            <Button asChild variant="outline">
              <Link href="/panel/agenda/disponibilidad">
                <Clock aria-hidden="true" />
                Horarios
              </Link>
            </Button>
            <Button asChild>
              <Link href="/panel/agenda/nuevo">
                <CalendarPlus aria-hidden="true" />
                Nuevo turno
              </Link>
            </Button>
          </>
        }
      />
      <Suspense fallback={<Skeleton className="h-[32rem]" />}>
        <ContenidoAgenda searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ContenidoAgenda({ searchParams }: { searchParams: PageProps<"/panel/agenda">["searchParams"] }) {
  const contexto = await requerirProfesional();
  const parametros = await searchParams;
  const fechaParam = typeof parametros.fecha === "string" && esFechaIso(parametros.fecha) ? parametros.fecha : undefined;
  const leido = esquemaFiltroAgenda.safeParse({
    vista: typeof parametros.vista === "string" ? parametros.vista : undefined,
    fecha: fechaParam,
  });
  const filtro = leido.success ? leido.data : esquemaFiltroAgenda.parse({ fecha: fechaParam });
  const ahora = new Date();
  const fechaHoy = hoyEnZona(contexto.consultorio.zonaHoraria, ahora);
  const horaHoy = horaEnZona(contexto.consultorio.zonaHoraria, ahora);
  const fecha = filtro.fecha ?? fechaHoy;
  const rango = rangoDeVista(filtro.vista, fecha, contexto.consultorio.zonaHoraria);
  const cliente = await crearClienteServidor();
  const [turnos, horarios, bloqueos] = await Promise.all([
    listarTurnosEnRango(cliente, contexto.consultorio.id, rango.desde, rango.hasta),
    listarHorarios(cliente, contexto.consultorio.id),
    listarBloqueos(cliente, contexto.consultorio.id, rango.desde),
  ]);

  const operaciones = await consultarEconomiaTurnos(cliente,turnos.map(t=>t.id));
  return (
    <>
    <CalendarioAgenda
      vista={filtro.vista}
      fecha={fecha}
      fechaHoy={fechaHoy}
      horaHoy={horaHoy}
      zonaHoraria={contexto.consultorio.zonaHoraria}
      turnos={turnos.map(t=>({...t,estadoEconomico:estadoEconomico(operaciones.find(o=>o.turno_id===t.id))}))}
      horarios={horarios}
      bloqueos={bloqueos}
    />
    <section className="grid gap-3 rounded-xl border bg-card p-4" aria-label="Cobro rápido de los turnos"><h2 className="font-semibold">Cobros de esta agenda</h2>{turnos.filter(t=>t.profesional_id===contexto.usuarioId).map(t=><div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm"><span>{t.pacientes?.nombre} {t.pacientes?.apellido} · {new Date(t.inicio).toLocaleString("es-AR",{timeZone:contexto.consultorio.zonaHoraria})}</span><CobroRapido zona={contexto.consultorio.zonaHoraria} turnoId={t.id} estado={estadoEconomico(operaciones.find(o=>o.turno_id===t.id))}/></div>)}{!turnos.length&&<p className="text-sm text-muted-foreground">Sin turnos en este período.</p>}</section>
    </>
  );
}
