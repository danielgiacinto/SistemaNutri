import { Suspense } from "react";
import type { Metadata } from "next";
import { MessageSquare, Trophy } from "lucide-react";
import { requerirPaciente } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarDesafios } from "@/servicios/comunidad";
import { obtenerFichaPortal } from "@/servicios/portal";
import { BotonBorrarActividad, BotonSumarse } from "@/componentes/comunidad/controles-desafio";
import { FormularioActividad } from "@/componentes/comunidad/formulario-actividad";
import { VentanaFormulario } from "@/componentes/comunes/ventana-formulario";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { formatearFechaHora, formatearFechaIso } from "@/lib/fechas";

export const metadata: Metadata = { title: "Comunidad" };

export default function PaginaComunidadPortal() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await requerirPaciente();
  const cliente = await crearClienteServidor();
  const [ficha, desafios] = await Promise.all([obtenerFichaPortal(cliente), listarDesafios(cliente)]);
  const zona = ficha?.zonaHoraria ?? "America/Argentina/Cordoba";
  const pacienteId = ficha?.pacienteId;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comunidad</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Desafíos de tu consultorio. Lo que publiques lo leen las otras personas del grupo.
        </p>
      </div>
      {desafios.length === 0 ? (
        <EstadoVacio
          icono={Trophy}
          titulo="Todavía no hay desafíos"
          descripcion="Cuando tu nutricionista publique uno, vas a poder sumarte y contar cómo te fue."
        />
      ) : (
        desafios.map((desafio) => {
          const sumado = desafio.participaciones_desafio.length > 0;
          const abierto = desafio.estado === "publicado";
          return (
            <article key={desafio.id} className="space-y-4 rounded-2xl border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{desafio.titulo}</h2>
                {!abierto && <Badge variant="outline">Cerrado</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatearFechaIso(desafio.inicio)} – {formatearFechaIso(desafio.fin)}
              </p>
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
                      {pacienteId === actividad.paciente_id && abierto && <BotonBorrarActividad actividadId={actividad.id} />}
                    </li>
                  ))}
                </ul>
              )}
              {abierto && !sumado && <BotonSumarse desafioId={desafio.id} />}
              {abierto && sumado && (
                <VentanaFormulario icono={<MessageSquare aria-hidden="true" />} etiqueta="Contar cómo me fue" titulo="Tu actividad" descripcion="Lo leen las otras personas del grupo." variante="outline">
                  <FormularioActividad desafioId={desafio.id} />
                </VentanaFormulario>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
