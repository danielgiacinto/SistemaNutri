import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirSuperadmin } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { Skeleton } from "@/componentes/ui/skeleton";
import { formatearFechaHora } from "@/lib/fechas";
import { ZONA_HORARIA_PREDETERMINADA } from "@/configuracion/producto";
import { registrarError } from "@/lib/errores";

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
  const { data, error } = await cliente
    .from("registros_auditoria")
    .select("id, accion, entidad, creado_en, detalles, actor_id, consultorio_id")
    .order("creado_en", { ascending: false })
    .limit(50);
  if (error) {
    registrarError("auditoria_cargar", error);
    throw new Error("No pudimos cargar la auditoría. Intentá nuevamente.");
  }
  const actores = [...new Set((data ?? []).flatMap((fila) => fila.actor_id ? [fila.actor_id] : []))];
  const idsConsultorios = [...new Set((data ?? []).flatMap((fila) => fila.consultorio_id ? [fila.consultorio_id] : []))];
  const [perfiles, consultorios] = await Promise.all([
    actores.length ? cliente.from("perfiles").select("id, nombre, apellido").in("id", actores) : { data: [], error: null },
    idsConsultorios.length ? cliente.from("consultorios").select("id, nombre").in("id", idsConsultorios) : { data: [], error: null },
  ]);
  if (perfiles.error || consultorios.error) {
    registrarError("auditoria_referencias", perfiles.error ?? consultorios.error);
    throw new Error("No pudimos identificar los responsables de la auditoría.");
  }
  const porActor = new Map((perfiles.data ?? []).map((perfil) => [perfil.id, `${perfil.nombre} ${perfil.apellido}`.trim()]));
  const porConsultorio = new Map((consultorios.data ?? []).map((consultorio) => [consultorio.id, consultorio.nombre]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Auditoría</h1>
      <p className="text-muted-foreground">Acciones administrativas. No incluye el contenido de las historias clínicas.</p>
      <p className="text-xs text-muted-foreground">Últimos 50 eventos · Horario de Argentina (Córdoba).</p>
      {(data ?? []).length === 0 ? <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">Todavía no hay acciones registradas.</p> : null}
      <ul className="divide-y rounded-2xl border empty:hidden">
        {(data ?? []).map((fila) => {
          // Se muestra solo el motivo administrativo, nunca el JSON completo del evento.
          const motivo = fila.detalles && typeof fila.detalles === "object" && !Array.isArray(fila.detalles) &&
            typeof fila.detalles.motivo === "string" ? fila.detalles.motivo : null;
          return (
          <li key={fila.id} className="px-4 py-3 text-sm">
            <p className="font-medium">{fila.accion}</p>
            <p className="text-muted-foreground">
              {fila.entidad} · {formatearFechaHora(new Date(fila.creado_en), ZONA_HORARIA_PREDETERMINADA)}
            </p>
            <dl className="mt-2 space-y-1 break-words">
              <div><dt className="inline text-muted-foreground">Responsable: </dt><dd className="inline">{fila.actor_id ? porActor.get(fila.actor_id) || "Cuenta sin nombre o eliminada" : "Sistema"}{fila.actor_id ? <span className="ml-1 break-all text-xs text-muted-foreground">({fila.actor_id})</span> : null}</dd></div>
              {fila.consultorio_id ? <div><dt className="inline text-muted-foreground">Consultorio: </dt><dd className="inline">{porConsultorio.get(fila.consultorio_id) ?? "Consultorio no disponible"}</dd></div> : null}
              {motivo ? <div><dt className="inline text-muted-foreground">Motivo: </dt><dd className="inline whitespace-pre-wrap">{motivo}</dd></div> : null}
            </dl>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
