import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirSuperadmin } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { extenderPrueba } from "@/acciones/facturacion";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

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
    return !q || prueba.correo.includes(q) || nombre.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Profesionales</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Correo o consultorio" className="h-8 flex-1 rounded-lg border px-2 text-sm" />
        <Button type="submit" variant="outline">Buscar</Button>
      </form>
      <div className="overflow-x-auto rounded-2xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Consultorio</th>
              <th className="px-3 py-2 font-medium">Correo</th>
              <th className="px-3 py-2 font-medium">Prueba hasta</th>
              <th className="px-3 py-2 font-medium">Mercado Pago</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((prueba) => {
              const consultorio = porConsultorio.get(prueba.consultorio_id ?? "");
              const suscripcion = porSuscripcion.get(prueba.consultorio_id ?? "");
              return (
                <tr key={prueba.correo} className="border-b last:border-0">
                  <td className="px-3 py-2">{consultorio?.nombre ?? "Sin consultorio"}</td>
                  <td className="px-3 py-2">{prueba.correo}</td>
                  <td className="px-3 py-2">{new Date(prueba.vence_en).toLocaleDateString("es-AR")}</td>
                  <td className="px-3 py-2">{suscripcion?.estado_mp ?? "sin autorizar"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <form action={extenderPrueba} className="grid gap-2 rounded-2xl border p-4 sm:grid-cols-4">
        <input name="consultorioId" placeholder="Id del consultorio" className="h-8 rounded-lg border px-2 text-sm" required />
        <input name="vence" type="datetime-local" className="h-8 rounded-lg border px-2 text-sm" required />
        <input name="motivo" placeholder="Motivo del ajuste" className="h-8 rounded-lg border px-2 text-sm" required minLength={5} />
        <Button type="submit">Ajustar prueba</Button>
      </form>
    </div>
  );
}

function primerValor(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor;
}
