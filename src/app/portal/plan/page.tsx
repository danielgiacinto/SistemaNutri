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
          <article key={plan.id} className="space-y-4 rounded-2xl border bg-card p-5">
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
          </article>
        ))
      )}
    </div>
  );
}
