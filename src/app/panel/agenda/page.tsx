import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Clock } from "lucide-react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaFiltroAgenda } from "@/esquemas/turno";
import { listarTurnosEnRango } from "@/servicios/turnos";
import { listarBloqueos, listarHorarios } from "@/servicios/agenda";
import { hoyEnZona, rangoDeVista } from "@/lib/fechas";
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
        descripcion="Turnos por día, semana y mes. La disponibilidad se valida contra horarios y bloqueos."
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
  const fecha = filtro.fecha ?? hoyEnZona(contexto.consultorio.zonaHoraria);
  const rango = rangoDeVista(filtro.vista, fecha, contexto.consultorio.zonaHoraria);
  const cliente = await crearClienteServidor();
  const [turnos, horarios, bloqueos] = await Promise.all([
    listarTurnosEnRango(cliente, contexto.consultorio.id, rango.desde, rango.hasta),
    listarHorarios(cliente, contexto.consultorio.id),
    listarBloqueos(cliente, contexto.consultorio.id, rango.desde),
  ]);

  return (
    <CalendarioAgenda
      vista={filtro.vista}
      fecha={fecha}
      zonaHoraria={contexto.consultorio.zonaHoraria}
      turnos={turnos}
      horarios={horarios}
      bloqueos={bloqueos}
    />
  );
}
