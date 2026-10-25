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
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Skeleton } from "@/componentes/ui/skeleton";
import { nombreNatural } from "@/lib/antropometria";
import { formatearFechaHora } from "@/lib/fechas";

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
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ContenidoPacientes searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ContenidoPacientes({ searchParams }: { searchParams: PageProps<"/panel/pacientes">["searchParams"] }) {
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
    <div className="space-y-4">
      <form className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_10rem_10rem_auto] sm:items-end">
        <label className="space-y-1 text-sm font-medium">
          Buscar
          <Input name="q" defaultValue={filtro.q} placeholder="Nombre, apellido, documento o correo" />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Estado
          <select name="estado" defaultValue={filtro.estado} className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          Orden
          <select name="orden" defaultValue={filtro.orden} className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="apellido">Apellido</option>
            <option value="reciente">Más recientes</option>
          </select>
        </label>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {filas.length === 0 ? (
        <EstadoVacio
          icono={Users}
          titulo={filtro.q ? "No hay resultados" : "Todavía no registraste pacientes"}
          descripcion={
            filtro.q
              ? "Probá con otro nombre, documento o correo."
              : "El alta es el primer paso para agenda, historia clínica y seguimiento."
          }
          accion={
            !filtro.q ? (
              <Button asChild>
                <Link href="/panel/pacientes/nuevo">Registrar paciente</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <caption className="sr-only">Listado de pacientes</caption>
            <thead>
              <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="px-4 py-3 font-medium">Documento</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Última consulta</th>
                <th className="px-4 py-3 font-medium">Próximo turno</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((paciente) => (
                <tr key={paciente.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/panel/pacientes/${paciente.id}`} className="font-medium hover:text-primary">
                      {nombreNatural(paciente)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{paciente.documento ?? "—"}</td>
                  <td className="px-4 py-3">
                    <InsigniaPaciente estado={paciente.estado} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {paciente.ultimaConsultaInicio
                      ? formatearFechaHora(new Date(paciente.ultimaConsultaInicio), contexto.consultorio.zonaHoraria)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {paciente.proximoTurnoInicio
                      ? formatearFechaHora(new Date(paciente.proximoTurnoInicio), contexto.consultorio.zonaHoraria)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paginas > 1 && (
        <p className="flex flex-wrap gap-2 text-sm">
          {Array.from({ length: paginas }, (_, indice) => indice + 1).map((pagina) => (
            <Link
              key={pagina}
              href={`?q=${encodeURIComponent(filtro.q)}&estado=${filtro.estado}&orden=${filtro.orden}&pagina=${pagina}`}
              className={pagina === filtro.pagina ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}
            >
              {pagina}
            </Link>
          ))}
        </p>
      )}
    </div>
  );
}

function primerValor(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}
