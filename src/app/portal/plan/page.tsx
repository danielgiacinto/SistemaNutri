import { Suspense } from "react";
import type { Metadata } from "next";
import { Salad } from "lucide-react";
import { requerirPaciente } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarPlanesPublicados } from "@/servicios/planes";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { ETIQUETAS_MOMENTO_COMIDA } from "@/configuracion/clinica";
import { formatearFechaHora } from "@/lib/fechas";
import { obtenerFichaPortal } from "@/servicios/portal";
import { Skeleton } from "@/componentes/ui/skeleton";
import Link from "next/link";
import { Button } from "@/componentes/ui/button";
import { DocumentoDelPlan } from "@/componentes/planes/documento-plan";
import type { DocumentoPlan } from "@/tipos/plan-visual";

export const metadata: Metadata = { title: "Mi plan" };

export default function PaginaPlanPortal() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await requerirPaciente();
  const cliente = await crearClienteServidor();
  const [ficha, planes] = await Promise.all([obtenerFichaPortal(cliente), listarPlanesPublicados(cliente)]);
  const zona = ficha?.zonaHoraria ?? "America/Argentina/Cordoba";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Mi plan</h1>
      {planes.length === 0 ? (
        <EstadoVacio
          icono={Salad}
          titulo="Todavía no hay un plan publicado"
          descripcion="Cuando tu nutricionista publique uno, lo vas a ver acá."
        />
      ) : (
        planes.map((plan) => (
          <div key={plan.id} className="space-y-3">
          <div className="flex justify-end"><Button asChild variant="outline" className="min-h-10"><Link href={`/planes/impresion/${plan.id}`} target="_blank">Imprimir / guardar PDF<span className="sr-only">, abre en otra pestaña</span></Link></Button></div>
          {plan.documento ? <DocumentoDelPlan titulo={plan.titulo} indicaciones={plan.indicaciones ?? ""} documento={plan.documento as unknown as DocumentoPlan} paciente={ficha ? `${ficha.nombre} ${ficha.apellido}` : undefined} profesional={(plan.presentacion as { profesional?: string } | null)?.profesional ?? ficha?.consultorioNombre} version={plan.numero} fecha={formatearFechaHora(new Date(plan.publicada_en), zona)} /> : <article className="space-y-4 rounded-2xl border bg-card p-5">
            <div>
              <h2 className="text-lg font-semibold">{plan.titulo}</h2>
              <p className="text-sm text-muted-foreground">
                Versión {plan.numero} · {formatearFechaHora(new Date(plan.publicada_en), zona)}
              </p>
              {plan.indicaciones && <p className="mt-2 whitespace-pre-wrap text-sm">{plan.indicaciones}</p>}
            </div>
            <ul className="space-y-3">
              {plan.comidas.map((comida) => (
                <li key={comida.id}>
                  <p className="text-sm font-medium">{ETIQUETAS_MOMENTO_COMIDA[comida.momento]}</p>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{comida.detalle}</p>
                </li>
              ))}
            </ul>
          </article>}
          </div>
        ))
      )}
    </div>
  );
}
