import { Suspense } from "react";
import type { Metadata } from "next";
import { LineChart } from "lucide-react";
import { requerirPaciente } from "@/autorizacion/sesion";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { InsigniaObjetivo } from "@/componentes/comunes/insignia-estado";
import { Skeleton } from "@/componentes/ui/skeleton";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { formatearFechaHora } from "@/lib/fechas";
import { calcularImc } from "@/lib/antropometria";
import { listarMisMediciones, listarMisObjetivos, obtenerFichaPortal } from "@/servicios/portal";

export const metadata: Metadata = { title: "Mi progreso" };

export default function PaginaProgreso() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <Progreso />
    </Suspense>
  );
}

async function Progreso() {
  await requerirPaciente();
  const cliente = await crearClienteServidor();
  const [ficha, objetivos, mediciones] = await Promise.all([
    obtenerFichaPortal(cliente),
    listarMisObjetivos(cliente),
    listarMisMediciones(cliente),
  ]);
  const zona = ficha?.zonaHoraria ?? "America/Argentina/Cordoba";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Progreso</h1>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Objetivos</h2>
        {objetivos.length === 0 ? (
          <EstadoVacio
            icono={LineChart}
            titulo="Sin objetivos compartidos"
            descripcion="Tu nutricionista decide cuáles ves."
            className="py-8"
          />
        ) : (
          <ul className="space-y-3">
            {objetivos.map((objetivo) => (
              <li key={objetivo.id} className="space-y-2 rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{objetivo.titulo}</p>
                  <InsigniaObjetivo estado={objetivo.estado} />
                </div>
                {objetivo.descripcion && <p className="text-sm text-muted-foreground">{objetivo.descripcion}</p>}
                {objetivo.valor_objetivo != null && (
                  <p className="text-sm">
                    Meta: {objetivo.valor_objetivo}
                    {objetivo.unidad ? ` ${objetivo.unidad}` : ""}
                    {objetivo.valor_inicial != null ? ` · partida ${objetivo.valor_inicial}` : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mediciones</h2>
        {mediciones.length === 0 ? (
          <EstadoVacio
            icono={LineChart}
            titulo="Sin mediciones compartidas"
            descripcion="Cuando se publiquen, vas a ver peso y medidas acá."
            className="py-8"
          />
        ) : (
          <ul className="space-y-3">
            {mediciones.map((medicion) => {
              const imc = calcularImc(medicion.peso_kg, medicion.talla_cm);
              return (
                <li key={medicion.id} className="rounded-2xl border bg-card p-4">
                  <p className="text-sm text-muted-foreground">
                    {formatearFechaHora(new Date(medicion.registrado_en), zona)}
                  </p>
                  <p className="mt-1 font-medium">
                    {[
                      medicion.peso_kg != null ? `${medicion.peso_kg} kg` : null,
                      medicion.talla_cm != null ? `${medicion.talla_cm} cm` : null,
                      imc != null ? `IMC ${imc}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Medición"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
