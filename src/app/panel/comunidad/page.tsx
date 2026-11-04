import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarDays, HeartHandshake, Plus, Users } from "lucide-react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarDesafios } from "@/servicios/comunidad";
import { FormularioDesafio } from "@/componentes/comunidad/formulario-desafio";
import { VentanaFormulario } from "@/componentes/comunes/ventana-formulario";
import { BotonBorrarActividad, ControlesDesafio } from "@/componentes/comunidad/controles-desafio";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
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
    <div className="space-y-8">
      <EncabezadoPagina titulo="Comunidad" descripcion="Pequeños desafíos para acompañar los hábitos de tus pacientes." acciones={
        <VentanaFormulario icono={<Plus aria-hidden="true" />} etiqueta="Nuevo desafío" titulo="Nuevo desafío" descripcion="Título, consigna y fechas. Arranca como borrador.">
          <FormularioDesafio />
        </VentanaFormulario>
      } />
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
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold wrap-anywhere">{desafio.titulo}</h2>
                  <Badge variant={desafio.estado === "publicado" ? "default" : desafio.estado === "borrador" ? "secondary" : "outline"}>{ETIQUETA_ESTADO[desafio.estado]}</Badge>
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />{formatearFechaIso(desafio.inicio)} – {formatearFechaIso(desafio.fin)}</span>
                  <span className="inline-flex items-center gap-1.5"><Users className="size-3.5 shrink-0" aria-hidden="true" />{desafio.participaciones_desafio.length} {desafio.participaciones_desafio.length === 1 ? "participante" : "participantes"}</span>
                </p>
              </div>
              <ControlesDesafio desafioId={desafio.id} estado={desafio.estado} />
            </div>
            <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">{desafio.consigna}</p>
            {desafio.actividades_comunidad.length > 0 && (
              <ul className="space-y-3 rounded-xl border bg-muted/20 p-4">
                {desafio.actividades_comunidad.map((actividad) => (
                  <li key={actividad.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {actividad.autor_visible}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {formatearFechaHora(new Date(actividad.creado_en), zona)}
                        </span>
                      </p>
                      <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">{actividad.texto}</p>
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
