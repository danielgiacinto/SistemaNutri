import { Suspense } from "react";
import type { Metadata } from "next";
import { HeartHandshake } from "lucide-react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarDesafios } from "@/servicios/comunidad";
import { FormularioDesafio } from "@/componentes/comunidad/formulario-desafio";
import { BotonBorrarActividad, ControlesDesafio } from "@/componentes/comunidad/controles-desafio";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { formatearFechaHora, formatearFechaIso } from "@/lib/fechas";
import type { EstadoDesafio } from "@/tipos/entidades";

export const metadata: Metadata = { title: "Comunidad" };

const ETIQUETA_ESTADO: Record<EstadoDesafio, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  cerrado: "Cerrado",
};

export default function PaginaComunidad() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const contexto = await requerirProfesional();
  const cliente = await crearClienteServidor();
  const desafios = await listarDesafios(cliente, contexto.consultorio.id);
  const zona = contexto.consultorio.zonaHoraria;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comunidad</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Armá un desafío para tus pacientes. Ellos escriben la actividad con sus palabras: acá no se cargan mediciones ni notas clínicas.
        </p>
      </div>
      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Nuevo desafío</h2>
        <FormularioDesafio />
      </section>
      {desafios.length === 0 ? (
        <EstadoVacio
          icono={HeartHandshake}
          titulo="Todavía no hay desafíos"
          descripcion="Creá un borrador y publicalo cuando quieras que el grupo lo vea."
        />
      ) : (
        desafios.map((desafio) => (
          <article key={desafio.id} className="space-y-4 rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{desafio.titulo}</h2>
                  <Badge variant="outline">{ETIQUETA_ESTADO[desafio.estado]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatearFechaIso(desafio.inicio)} – {formatearFechaIso(desafio.fin)} · {desafio.participaciones_desafio.length}{" "}
                  {desafio.participaciones_desafio.length === 1 ? "participante" : "participantes"}
                </p>
              </div>
              <ControlesDesafio desafioId={desafio.id} estado={desafio.estado} />
            </div>
            <p className="whitespace-pre-wrap text-sm">{desafio.consigna}</p>
            {desafio.actividades_comunidad.length > 0 && (
              <ul className="space-y-3 border-t pt-4">
                {desafio.actividades_comunidad.map((actividad) => (
                  <li key={actividad.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {actividad.autor_visible}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {formatearFechaHora(new Date(actividad.creado_en), zona)}
                        </span>
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{actividad.texto}</p>
                    </div>
                    <BotonBorrarActividad actividadId={actividad.id} />
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))
      )}
    </div>
  );
}
