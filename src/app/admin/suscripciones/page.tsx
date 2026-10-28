import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirSuperadmin } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { obtenerConfiguracionComercial } from "@/servicios/facturacion/mercadopago";
import { FormularioConfiguracionComercial } from "@/componentes/facturacion/formulario-configuracion";
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
  const [configuracion, pruebas, suscripciones, pagos] = await Promise.all([
    obtenerConfiguracionComercial(cliente),
    cliente.from("pruebas_profesionales").select("vence_en"),
    cliente.from("suscripciones").select("estado_mp, cobertura_hasta"),
    cliente.from("pagos_suscripcion").select("estado, monto"),
  ]);
  const ahora = new Date();
  const enPrueba = (pruebas.data ?? []).filter((prueba) => new Date(prueba.vence_en).getTime() > ahora.getTime()).length;
  const activas = (suscripciones.data ?? []).filter((item) => item.cobertura_hasta && new Date(item.cobertura_hasta).getTime() > ahora.getTime()).length;
  const cobrado = (pagos.data ?? []).filter((pago) => pago.estado === "aprobado").reduce((total, pago) => total + Number(pago.monto), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Suscripciones</h1>
        <p className="text-muted-foreground">Los importes son cobros aprobados. No incluyen autorizaciones ni pagos pendientes.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Dato titulo="En prueba" valor={String(enPrueba)} />
        <Dato titulo="Con cobertura paga" valor={String(activas)} />
        <Dato titulo="Cobrado aprobado" valor={formatearPesos(cobrado) ?? "0"} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Configuración para las nuevas altas</CardTitle>
          <CardDescription>
            Este precio es el que ve la página de inicio y el que se cobra después de la prueba. Cambiarlo no modifica las pruebas ya concedidas ni una suscripción ya autorizada.
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
