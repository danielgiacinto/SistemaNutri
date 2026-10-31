import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Salad, Search, X } from "lucide-react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaUuid } from "@/esquemas/comunes";
import { listarPacientesActivos } from "@/servicios/pacientes";
import { listarPlanesDelConsultorio } from "@/servicios/planes";
import { estadoDelPlan } from "@/componentes/planes/estado-plan";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { nombreNatural } from "@/lib/antropometria";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Planes" };

export default function PaginaPlanes({ searchParams }: PageProps<"/panel/planes">) {
  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Planes"
        descripcion="Borradores y versiones publicadas de tus pacientes. Ellos ven solo lo publicado."
      />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Contenido parametros={searchParams} />
      </Suspense>
    </div>
  );
}

async function Contenido({ parametros }: { parametros: PageProps<"/panel/planes">["searchParams"] }) {
  const contexto = await requerirProfesional();
  const consulta = await parametros;
  const elegido = primerValor(consulta.paciente);
  const pacienteId = esquemaUuid.safeParse(elegido).success ? elegido : undefined;
  const cliente = await crearClienteServidor();
  const [pacientes, planes] = await Promise.all([
    listarPacientesActivos(cliente, contexto.consultorio.id),
    listarPlanesDelConsultorio(cliente, contexto.consultorio.id, pacienteId),
  ]);
  const paciente = pacientes.find((item) => item.id === pacienteId);

  return (
    <div className="space-y-4">
      <form className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 space-y-1 text-sm font-medium">
          Paciente
          <select
            name="paciente"
            defaultValue={pacienteId ?? ""}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Todos</option>
            {pacientes.map((item) => (
              <option key={item.id} value={item.id}>
                {nombreNatural(item)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <Button type="submit" variant="outline">
            <Search aria-hidden="true" />
            Filtrar
          </Button>
          {pacienteId && (
            <Button asChild variant="ghost">
              <Link href="/panel/planes">
                <X aria-hidden="true" />
                Quitar filtro
              </Link>
            </Button>
          )}
        </div>
      </form>

      {planes.length === 0 ? (
        <EstadoVacio
          icono={Salad}
          titulo={paciente ? `No hay planes de ${nombreNatural(paciente)}` : "Todavía no hay planes"}
          descripcion={
            paciente
              ? "Probá con otro paciente o creá un borrador desde su ficha."
              : "Entrá a la ficha de un paciente y creá el primer borrador."
          }
        />
      ) : (
        <ul className="divide-y rounded-2xl border">
          {planes.map((plan) => (
            <li key={plan.id}>
              <Link
                href={`/panel/pacientes/${plan.paciente_id}/planes/${plan.id}`}
                className="block px-4 py-3 hover:bg-muted/40"
              >
                <p className="font-medium">{plan.titulo}</p>
                <p className="text-sm text-muted-foreground">
                  {plan.pacientes ? nombreNatural(plan.pacientes) : "Paciente"} ·{" "}
                  {estadoDelPlan(plan.cambios_sin_publicar, plan.planes_publicaciones.length)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}
