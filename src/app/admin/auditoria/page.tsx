import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirSuperadmin } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Auditoría" };

export default function PaginaAuditoria() {
  return (
    <Suspense fallback={<Skeleton className="h-80" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await requerirSuperadmin();
  const cliente = await crearClienteServidor();
  const { data } = await cliente
    .from("registros_auditoria")
    .select("id, accion, entidad, creado_en, detalles")
    .order("creado_en", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Auditoría</h1>
      <p className="text-muted-foreground">Acciones administrativas. No incluye el contenido de las historias clínicas.</p>
      <ul className="divide-y rounded-2xl border">
        {(data ?? []).map((fila) => (
          <li key={fila.id} className="px-4 py-3 text-sm">
            <p className="font-medium">{fila.accion}</p>
            <p className="text-muted-foreground">
              {fila.entidad} · {new Date(fila.creado_en).toLocaleString("es-AR")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
