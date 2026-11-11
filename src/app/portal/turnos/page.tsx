import { z } from "zod";
import { InsigniaCobro } from "@/componentes/comunes/insignia-estado";
import { dineroFinanzas } from "@/tipos/finanzas";
import Link from "next/link";
import { TiempoRestanteTurno } from "@/componentes/panel/tiempo-restante-turno";
import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { requerirPaciente } from "@/autorizacion/sesion";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { InsigniaTurno } from "@/componentes/comunes/insignia-estado";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ETIQUETAS_TIPO_CONSULTA } from "@/configuracion/clinica";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { formatearFechaHora } from "@/lib/fechas";
import { listarMisTurnos, listarMisCobros, obtenerFichaPortal } from "@/servicios/portal";

export const metadata: Metadata = { title: "Mis turnos" };

type Busqueda = Promise<{turno?:string}>;
export default function PaginaTurnosPortal({searchParams}:{searchParams:Busqueda}) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Listado busqueda={searchParams} />
    </Suspense>
  );
}

async function Listado({busqueda}:{busqueda:Busqueda}) {
  await requerirPaciente();
  const cliente = await crearClienteServidor();
  const parametros=await busqueda;
  const turnoId=z.uuid().safeParse(parametros.turno);
  const [ficha, turnos,cobros] = await Promise.all([obtenerFichaPortal(cliente), listarMisTurnos(cliente,turnoId.success?turnoId.data:undefined),listarMisCobros(cliente)]);
  const ahora = new Date().toISOString();
  const zona = ficha?.zonaHoraria ?? "America/Argentina/Cordoba";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{turnoId.success?"Tu turno":"Turnos"}</h1>{turnoId.success&&<Link href="/portal/turnos" className="text-sm text-primary underline">Ver todos mis turnos</Link>}
      {turnos.length === 0 ? (
        <EstadoVacio icono={CalendarDays} titulo="Todavía no tenés turnos" descripcion="Cuando te agenden, aparecen acá." />
      ) : (
        <ul className="space-y-3">
          {turnos.map((turno) => {
            const cobro=cobros.find(c=>c.turno_id===turno.id);
            const saldo=cobro?Math.max(0,cobro.original-cobro.descuento-cobro.abonado):0;
            return (
            <li key={turno.id} className="rounded-2xl border bg-card p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{formatearFechaHora(new Date(turno.inicio), zona)}</p>
                <InsigniaTurno estado={turno.estado} />
              </div>
              {["programado", "confirmado"].includes(turno.estado) && new Date(turno.inicio).getTime() >= new Date(ahora).getTime() && (
                <TiempoRestanteTurno inicio={turno.inicio} ahoraInicial={ahora} />
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                {ETIQUETAS_TIPO_CONSULTA[turno.tipo]}
                {turno.motivo ? ` · ${turno.motivo}` : ""}
              </p>
              {cobro&&<div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div><p className="text-xs text-muted-foreground">Pago de la consulta</p><p className="mt-1 font-semibold tabular-nums">{saldo>0?dineroFinanzas(saldo,cobro.moneda)+' pendientes':'Sin saldo pendiente'}</p></div><InsigniaCobro estado={cobro.original===0?'Sin cargo':cobro.bonificado||cobro.descuento===cobro.original?'Bonificado':saldo===0?'Pagado':cobro.abonado>0?'Pago parcial':'Pendiente'}/></div>}
            </li>
          );})}
        </ul>
      )}
    </div>
  );
}
