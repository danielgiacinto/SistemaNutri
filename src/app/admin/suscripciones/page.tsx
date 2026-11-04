import { Suspense } from "react";
import type { Metadata } from "next";
import { Info } from "lucide-react";
import { requerirSuperadmin } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { obtenerConfiguracionComercial } from "@/servicios/facturacion/mercadopago";
import { FormularioConfiguracionComercial } from "@/componentes/facturacion/formulario-configuracion";
import { DescripcionConIcono } from "@/componentes/comunes/descripcion-con-icono";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { formatearPesos } from "@/lib/moneda";

export const metadata: Metadata = { title: "Suscripciones" };

export default function PaginaSuscripciones() {
  return (
    <Suspense fallback={<Skeleton className="h-80" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await requerirSuperadmin();
  const cliente = await crearClienteServidor();
  const [configuracion, resumen] = await Promise.all([
    obtenerConfiguracionComercial(cliente),
    cliente.rpc("resumen_comercial").single(),
  ]);
  if (resumen.error || !resumen.data) throw new Error("No pudimos cargar el resumen comercial.");
  const metricas = resumen.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suscripciones</h1>
        <p className="text-muted-foreground">Los importes son cobros aprobados. No incluyen autorizaciones ni pagos pendientes.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Dato titulo="Profesionales registrados" valor={String(metricas.profesionales)} />
        <Dato titulo="En prueba" valor={String(metricas.en_prueba)} />
        <Dato titulo="Con cobertura paga" valor={String(metricas.cobertura_paga)} />
        <Dato titulo="Pruebas por vencer en 7 días" valor={String(metricas.por_vencer)} />
        <Dato titulo="Pruebas vencidas sin cobertura" valor={String(metricas.pruebas_vencidas)} />
        <Dato titulo="Suscripciones canceladas" valor={String(metricas.canceladas)} />
        <Dato titulo="Último cobro pendiente o rechazado" valor={String(metricas.cobros_por_resolver)} />
        <Dato titulo="Cobros de suscripción aprobados este mes (ARS)" valor={formatearPesos(metricas.ingreso_mes) ?? "0"} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Configuración para las nuevas altas</CardTitle>
          <CardDescription>
            <DescripcionConIcono icono={Info}>
              Este precio es el que ve la página de inicio y el que se cobra después de la prueba. Cambiarlo no modifica las pruebas ya concedidas ni una suscripción ya autorizada.
            </DescripcionConIcono>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioConfiguracionComercial inicial={configuracion} />
        </CardContent>
      </Card>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-2xl font-bold">{valor}</p>
      <p className="text-sm text-muted-foreground">{titulo}</p>
    </div>
  );
}
