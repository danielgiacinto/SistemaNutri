import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, LineChart, NotebookPen, Salad, Target } from "lucide-react";
import { requerirPaciente } from "@/autorizacion/sesion";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { InsigniaTurno } from "@/componentes/comunes/insignia-estado";
import { Skeleton } from "@/componentes/ui/skeleton";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { formatearFechaHora } from "@/lib/fechas";
import { nombreNatural } from "@/lib/antropometria";
import { ETIQUETAS_TIPO_CONSULTA } from "@/configuracion/clinica";
import { listarMisEvoluciones, listarMisObjetivos, listarMisTurnos, obtenerFichaPortal } from "@/servicios/portal";
import { listarPlanesPublicados } from "@/servicios/planes";

export const metadata: Metadata = { title: "Mi portal" };

export default function PaginaPortal() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <InicioPaciente />
    </Suspense>
  );
}

async function InicioPaciente() {
  const contexto = await requerirPaciente();
  const cliente = await crearClienteServidor();
  const ficha = await obtenerFichaPortal(cliente);
  if (!ficha) {
    return (
      <EstadoVacio
        icono={NotebookPen}
        titulo="No encontramos tu ficha"
        descripcion="Pedile a tu nutricionista que vuelva a enviarte la invitación."
      />
    );
  }

  const [turnos, notas, objetivos, planes] = await Promise.all([
    listarMisTurnos(cliente),
    listarMisEvoluciones(cliente),
    listarMisObjetivos(cliente),
    listarPlanesPublicados(cliente),
  ]);
  const ahora = new Date();
  const proximo = turnos
    .filter((turno) => ["programado", "confirmado"].includes(turno.estado) && new Date(turno.inicio) >= ahora)
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0];
  const ultimaNota = notas[0];
  const plan = planes[0];
  const objetivosActivos = objetivos.filter((objetivo) => objetivo.estado === "pendiente" || objetivo.estado === "en_progreso");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Hola, {nombreNatural(contexto) || "bienvenida/o"}</h1>
        <p className="text-muted-foreground">Esto es lo que {ficha.consultorioNombre} compartió con vos.</p>
      </div>

      {proximo ? (
        <Link href="/portal/turnos" className="block rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Próximo turno</p>
          <p className="mt-1 text-lg font-semibold">{formatearFechaHora(new Date(proximo.inicio), ficha.zonaHoraria)}</p>
          <div className="mt-2 flex items-center gap-2">
            <InsigniaTurno estado={proximo.estado} />
            <span className="text-sm text-muted-foreground">{ETIQUETAS_TIPO_CONSULTA[proximo.tipo]}</span>
          </div>
        </Link>
      ) : (
        <EstadoVacio
          icono={CalendarDays}
          titulo="Sin turnos próximos"
          descripcion="Cuando tu nutricionista te agende, lo vas a ver acá."
          className="py-8"
        />
      )}

      {plan ? (
        <Link href="/portal/plan" className="block space-y-2 rounded-2xl border bg-card p-5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Salad className="size-4" aria-hidden="true" />
            Plan publicado
          </p>
          <h2 className="text-lg font-semibold">{plan.titulo}</h2>
          {plan.indicaciones && <p className="line-clamp-3 whitespace-pre-wrap text-sm">{plan.indicaciones}</p>}
          <p className="text-sm text-muted-foreground">Versión {plan.numero}</p>
        </Link>
      ) : (
        <EstadoVacio
          icono={Salad}
          titulo="Todavía no hay un plan publicado"
          descripcion="Cuando tu nutricionista publique uno, lo vas a ver acá."
          className="py-8"
        />
      )}

      {objetivosActivos.length > 0 ? (
        <Link href="/portal/progreso" className="block space-y-2 rounded-2xl border bg-card p-5">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="size-4" aria-hidden="true" />
            Objetivos compartidos
          </p>
          <ul className="space-y-1">
            {objetivosActivos.slice(0, 3).map((objetivo) => (
              <li key={objetivo.id} className="text-sm font-medium">
                {objetivo.titulo}
              </li>
            ))}
          </ul>
        </Link>
      ) : null}
      {ultimaNota ? (
        <article className="space-y-2 rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Última nota compartida</p>
          <h2 className="text-lg font-semibold">{ultimaNota.titulo}</h2>
          <p className="whitespace-pre-wrap text-sm">{ultimaNota.contenido}</p>
          {ultimaNota.indicaciones && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Indicaciones: </span>
              {ultimaNota.indicaciones}
            </p>
          )}
        </article>
      ) : (
        <EstadoVacio
          icono={LineChart}
          titulo="Todavía no hay notas compartidas"
          descripcion="Las mediciones visibles están en Progreso."
          className="py-8"
        />
      )}
    </div>
  );
}
