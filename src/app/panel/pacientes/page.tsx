import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, Users } from "lucide-react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaFiltroPacientes } from "@/esquemas/paciente";
import { listarPacientes } from "@/servicios/pacientes";
import { PACIENTES_POR_PAGINA } from "@/configuracion/clinica";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { InsigniaPaciente } from "@/componentes/comunes/insignia-estado";
import { hrefListadoPacientes } from "@/componentes/pacientes/consulta-pacientes";
import { FiltroPacientes } from "@/componentes/pacientes/filtro-pacientes";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { nombreNatural } from "@/lib/antropometria";
import { formatearFechaHora } from "@/lib/fechas";
import { cn } from "@/lib/utilidades";

const COLUMNAS_PACIENTE =
  "md:grid-cols-[minmax(0,1.5fr)_minmax(0,7.5rem)_6.5rem_minmax(0,1fr)_minmax(0,1fr)]";

export const metadata: Metadata = { title: "Pacientes" };

export default function PaginaPacientes({ searchParams }: PageProps<"/panel/pacientes">) {
  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Pacientes"
        descripcion="Buscá, filtrá y abrí la ficha de cada persona de tu consultorio."
        acciones={
          <Button asChild>
            <Link href="/panel/pacientes/nuevo">
              <UserPlus aria-hidden="true" />
              Nuevo paciente
            </Link>
          </Button>
        }
      />
      <div className="space-y-4">
        <Suspense fallback={<Skeleton className="h-24 rounded-2xl" />}>
          <FiltroPacientes />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-72 rounded-2xl" />}>
          <ListadoPacientes searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ListadoPacientes({ searchParams }: { searchParams: PageProps<"/panel/pacientes">["searchParams"] }) {
  const contexto = await requerirProfesional();
  const parametros = await searchParams;
  const leido = esquemaFiltroPacientes.safeParse({
    q: primerValor(parametros.q),
    estado: primerValor(parametros.estado) || "activo",
    orden: primerValor(parametros.orden) || "apellido",
    pagina: primerValor(parametros.pagina) || "1",
  });
  const filtro = leido.success ? leido.data : esquemaFiltroPacientes.parse({});
  const cliente = await crearClienteServidor();
  const { filas, total } = await listarPacientes(cliente, contexto.consultorio.id, filtro);
  const paginas = Math.max(1, Math.ceil(total / PACIENTES_POR_PAGINA));

  return (
    <>
      {filas.length === 0 ? (
        <EstadoVacio
          icono={Users}
          titulo={filtro.q || filtro.estado !== "activo" ? "No hay resultados" : "Todavía no registraste pacientes"}
          descripcion={
            filtro.q || filtro.estado !== "activo"
              ? "Probá con otro nombre, documento o estado."
              : "El alta es el primer paso para agenda, historia clínica y seguimiento."
          }
          accion={
            !filtro.q && filtro.estado === "activo" ? (
              <Button asChild>
                <Link href="/panel/pacientes/nuevo">
                  <UserPlus aria-hidden="true" />
                  Registrar paciente
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <div
            className={cn(
              "hidden border-b bg-muted/40 px-4 py-2.5 text-sm font-medium text-muted-foreground md:grid md:items-center md:gap-4",
              COLUMNAS_PACIENTE,
            )}
          >
            <span>Paciente</span>
            <span>Documento</span>
            <span>Estado</span>
            <span>Última consulta</span>
            <span>Próximo turno</span>
          </div>
          <ul>
            {filas.map((paciente) => {
              const ultima = paciente.ultimaConsultaInicio
                ? formatearFechaHora(new Date(paciente.ultimaConsultaInicio), contexto.consultorio.zonaHoraria)
                : "Sin consultas";
              const proximo = paciente.proximoTurnoInicio
                ? formatearFechaHora(new Date(paciente.proximoTurnoInicio), contexto.consultorio.zonaHoraria)
                : "Sin turno";
              return (
                <li key={paciente.id} className="border-b last:border-0">
                  <Link
                    href={`/panel/pacientes/${paciente.id}`}
                    className={cn(
                      "grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-muted/40 md:gap-4",
                      COLUMNAS_PACIENTE,
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{nombreNatural(paciente)}</span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground md:hidden">
                        {paciente.proximoTurnoInicio ? `Próximo: ${proximo}` : ultima}
                      </span>
                    </span>
                    <span className="hidden min-w-0 truncate text-muted-foreground md:block">{paciente.documento ?? "—"}</span>
                    <span className="justify-self-end md:justify-self-start">
                      <InsigniaPaciente estado={paciente.estado} />
                    </span>
                    <span className="hidden min-w-0 truncate text-muted-foreground md:block">{ultima}</span>
                    <span className="hidden min-w-0 truncate text-muted-foreground md:block">{proximo}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {paginas > 1 && (
        <p className="flex flex-wrap gap-2 text-sm">
          {Array.from({ length: paginas }, (_, indice) => indice + 1).map((pagina) => (
            <Link
              key={pagina}
              href={hrefListadoPacientes({ q: filtro.q, estado: filtro.estado, orden: filtro.orden, pagina })}
              className={pagina === filtro.pagina ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}
            >
              {pagina}
            </Link>
          ))}
        </p>
      )}
    </>
  );
}

function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}
