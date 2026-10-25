import { Suspense } from "react";
import type { Metadata } from "next";
import { Building2, CheckCircle2, UserRound } from "lucide-react";
import { requerirSuperadmin } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { obtenerConsultoriosRecientes, obtenerMetricasPlataforma } from "@/servicios/plataforma";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Badge } from "@/componentes/ui/badge";
import { Skeleton } from "@/componentes/ui/skeleton";
import { LOCALE_PREDETERMINADO } from "@/configuracion/producto";
import type { EstadoConsultorio } from "@/tipos/entidades";

export const metadata: Metadata = { title: "Administración" };

const ETIQUETAS_ESTADO: Record<EstadoConsultorio, { texto: string; variante: "default" | "secondary" | "destructive" }> = {
  activo: { texto: "Activo", variante: "default" },
  suspendido: { texto: "Suspendido", variante: "destructive" },
  baja: { texto: "Baja", variante: "secondary" },
};

export default function PaginaAdmin() {
  return (
    <div className="space-y-8">
      <EncabezadoPagina
        titulo="Resumen de la plataforma"
        descripcion="Información comercial y de cuentas. No incluye datos clínicos de pacientes."
      />
      <Suspense fallback={<EsqueletoAdmin />}>
        <ContenidoAdmin />
      </Suspense>
    </div>
  );
}

async function ContenidoAdmin() {
  await requerirSuperadmin();
  const cliente = await crearClienteServidor();
  const [metricas, recientes] = await Promise.all([
    obtenerMetricasPlataforma(cliente),
    obtenerConsultoriosRecientes(cliente),
  ]);

  const tarjetas = [
    { titulo: "Consultorios registrados", valor: metricas.consultoriosTotales, icono: Building2 },
    { titulo: "Consultorios activos", valor: metricas.consultoriosActivos, icono: CheckCircle2 },
    { titulo: "Cuentas profesionales", valor: metricas.cuentasProfesionales, icono: UserRound },
  ];
  const formatoFecha = new Intl.DateTimeFormat(LOCALE_PREDETERMINADO, { dateStyle: "medium" });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {tarjetas.map(({ titulo, valor, icono: Icono }) => (
          <Card key={titulo}>
            <CardContent className="flex items-center gap-4">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <Icono className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-3xl font-bold tabular-nums">{valor.toLocaleString(LOCALE_PREDETERMINADO)}</p>
                <p className="text-sm text-muted-foreground">{titulo}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Altas recientes</CardTitle>
          <CardDescription>Últimos consultorios creados en la plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          {recientes.length === 0 ? (
            <EstadoVacio
              icono={Building2}
              titulo="Todavía no hay consultorios"
              descripcion="Cuando un profesional complete su registro, va a aparecer en este listado."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Consultorios registrados recientemente</caption>
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">Consultorio</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Alta</th>
                    <th scope="col" className="py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recientes.map((consultorio) => (
                    <tr key={consultorio.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{consultorio.nombre}</td>
                      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                        {formatoFecha.format(new Date(consultorio.creado_en))}
                      </td>
                      <td className="py-3">
                        <Badge variant={ETIQUETAS_ESTADO[consultorio.estado].variante}>
                          {ETIQUETAS_ESTADO[consultorio.estado].texto}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EsqueletoAdmin() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando métricas">
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
