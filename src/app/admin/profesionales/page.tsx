import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirSuperadmin } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { AjustarPruebaProfesional } from "@/componentes/admin/ajustar-prueba-profesional";
import { FiltroProfesionales } from "@/componentes/admin/filtro-profesionales";
import { Skeleton } from "@/componentes/ui/skeleton";
import { cn } from "@/lib/utilidades";

const COLUMNAS_PROFESIONAL = "sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,8rem)_minmax(0,8rem)]";

export const metadata: Metadata = { title: "Profesionales" };

export default function PaginaProfesionales({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-80" />}>
      <Contenido parametros={searchParams} />
    </Suspense>
  );
}

async function Contenido({ parametros }: { parametros: Promise<{ q?: string | string[] }> }) {
  await requerirSuperadmin();
  const q = primerValor((await parametros).q)?.trim().toLowerCase() ?? "";
  const cliente = await crearClienteServidor();
  const [pruebas, consultorios, suscripciones] = await Promise.all([
    cliente.from("pruebas_profesionales").select("consultorio_id, correo, inicio, vence_en").order("inicio", { ascending: false }),
    cliente.from("consultorios").select("id, nombre, estado"),
    cliente.from("suscripciones").select("consultorio_id, estado_mp, cobertura_hasta, mp_id, precio"),
  ]);
  const porConsultorio = new Map((consultorios.data ?? []).map((item) => [item.id, item]));
  const porSuscripcion = new Map((suscripciones.data ?? []).map((item) => [item.consultorio_id, item]));
  const filas = (pruebas.data ?? []).filter((prueba) => {
    const nombre = porConsultorio.get(prueba.consultorio_id ?? "")?.nombre ?? "";
    return !q || prueba.correo.toLowerCase().includes(q) || nombre.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Profesionales</h1>
      <FiltroProfesionales />
      <div className="overflow-hidden rounded-2xl border text-sm">
        <div className={cn("hidden border-b bg-muted/40 px-4 py-2.5 font-medium text-muted-foreground sm:grid sm:gap-3", COLUMNAS_PROFESIONAL)}>
          <span>Consultorio</span>
          <span>Correo</span>
          <span>Prueba hasta</span>
          <span>Mercado Pago</span>
        </div>
        <ul>
          {filas.map((prueba) => {
            const consultorio = porConsultorio.get(prueba.consultorio_id ?? "");
            const suscripcion = porSuscripcion.get(prueba.consultorio_id ?? "");
            const vence = new Date(prueba.vence_en).toLocaleDateString("es-AR");
            return (
              <li key={prueba.correo} className="border-b last:border-0">
                <AjustarPruebaProfesional
                  consultorioId={prueba.consultorio_id}
                  consultorio={consultorio?.nombre ?? "Sin consultorio"}
                  correo={prueba.correo}
                  vence={vence}
                  estadoMercadoPago={suscripcion?.estado_mp ?? "sin autorizar"}
                  className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:gap-3", COLUMNAS_PROFESIONAL)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function primerValor(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}
