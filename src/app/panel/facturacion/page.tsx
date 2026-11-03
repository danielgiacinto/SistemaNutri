import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Ban, CalendarDays, CircleCheck, Clock3, CreditCard, ReceiptText, ShieldAlert } from "lucide-react";
import { cargarProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { credencialesMercadoPago, obtenerConfiguracionComercial } from "@/servicios/facturacion/mercadopago";
import { FormularioTarjeta } from "@/componentes/facturacion/formulario-tarjeta";
import { FranjaAviso } from "@/componentes/comunes/franja-aviso";
import { DescripcionConIcono } from "@/componentes/comunes/descripcion-con-icono";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { LOCALE_PREDETERMINADO } from "@/configuracion/producto";
import { formatearPesos } from "@/lib/moneda";

export const metadata: Metadata = { title: "Facturación" };

const TEXTOS: Record<string, { titulo: string; texto: string }> = {
  prueba: {
    titulo: "Período de prueba",
    texto: "El consultorio está habilitado hasta la fecha de vencimiento.",
  },
  activo: {
    titulo: "Cobertura vigente",
    texto: "Hay un cobro confirmado del precio mensual.",
  },
  gracia: {
    titulo: "Cobro pendiente",
    texto: "Mercado Pago reintenta el débito. El acceso sigue unos días.",
  },
  vencido: {
    titulo: "Acceso suspendido",
    texto: "Los datos se conservan. El cobro se retoma al elegir el plan.",
  },
  suspendido_admin: {
    titulo: "Cuenta suspendida",
    texto: "Escribí al soporte. Los datos clínicos no se borran.",
  },
};

const ICONOS_ESTADO = {
  prueba: CalendarDays,
  activo: CircleCheck,
  gracia: Clock3,
  vencido: Ban,
  suspendido_admin: ShieldAlert,
} as const;

export default function PaginaFacturacion() {
  return (
    <Suspense fallback={<Skeleton className="h-80" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const contexto = await cargarProfesional();
  const cliente = await crearClienteServidor();
  const [configuracion, estado, prueba, suscripcion, pagos] = await Promise.all([
    obtenerConfiguracionComercial(cliente),
    cliente.rpc("estado_acceso_comercial", { p_consultorio_id: contexto.consultorio.id }),
    cliente.from("pruebas_profesionales").select("inicio, vence_en").eq("consultorio_id", contexto.consultorio.id).maybeSingle(),
    cliente.from("suscripciones").select("estado_mp, precio, cobertura_hasta, mp_id").eq("consultorio_id", contexto.consultorio.id).maybeSingle(),
    cliente.from("suscripciones").select("id").eq("consultorio_id", contexto.consultorio.id).maybeSingle(),
  ]);
  const codigo = estado.data ?? "vencido";
  const aviso = TEXTOS[codigo] ?? TEXTOS.vencido;
  const IconoEstado = ICONOS_ESTADO[codigo as keyof typeof ICONOS_ESTADO] ?? Ban;
  const zona = contexto.consultorio.zonaHoraria;
  const fecha = new Intl.DateTimeFormat(LOCALE_PREDETERMINADO, { dateStyle: "long", timeZone: zona });
  const credenciales = credencialesMercadoPago();
  const precioMensual = formatearPesos(configuracion.precioMensual);
  const autorizacionActiva = suscripcion.data?.estado_mp === "authorized" || suscripcion.data?.estado_mp === "active";
  const puedeAutorizar =
    contexto.consultorio.rol === "titular" &&
    Boolean(credenciales && configuracion.precioMensual) &&
    !autorizacionActiva;
  const dias = prueba.data ? Math.max(0, Math.ceil((new Date(prueba.data.vence_en).getTime() - new Date().getTime()) / 86_400_000)) : 0;
  const pagosLista = pagos.data
    ? await cliente.from("pagos_suscripcion").select("estado, monto, cobrado_en, mp_pago_id").eq("suscripcion_id", pagos.data.id).order("creado_en", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
        <p className="text-sm text-muted-foreground">Precio, prueba y cobros confirmados.</p>
      </div>
      {codigo === "prueba" && prueba.data ? (
        <FranjaAviso>
          Disfrutá tu prueba gratis. Tenés el consultorio completo, sin tarjeta, hasta el {fecha.format(new Date(prueba.data.vence_en))}.
        </FranjaAviso>
      ) : null}
      {codigo === "vencido" ? (
        <Card role="alert" className="border-destructive/40 bg-destructive/5">
          <CardHeader className="gap-3 sm:flex-row sm:items-start">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-destructive">Acceso suspendido</CardTitle>
              <CardDescription>
                {autorizacionActiva
                  ? "Terminó el período de prueba y todavía no hay un cobro confirmado. La autorización recurrente por sí sola no reactiva el acceso."
                  : precioMensual
                    ? `Terminó el período de prueba. Para recuperar el acceso completo al consultorio, activá el plan mensual de ${precioMensual}.`
                    : "Terminó el período de prueba y no hay cobertura vigente. El plan todavía no tiene un precio configurado; contactá al soporte para regularizar el acceso."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-3 text-sm sm:grid-cols-2 sm:gap-x-8">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Prueba finalizada</p>
                <p className="mt-1 font-medium">{prueba.data ? fecha.format(new Date(prueba.data.vence_en)) : "No hay prueba activa"}</p>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Datos del consultorio</p>
                <p className="mt-1 font-medium">Se conservan mientras regularizás el acceso.</p>
              </div>
            </div>
            <Button asChild variant="destructive" className="shrink-0">
              <Link href="#opciones-de-pago">
                <CreditCard aria-hidden="true" />
                {puedeAutorizar ? "Activar plan mensual" : "Ver opciones de pago"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{aviso.titulo}</CardTitle>
            <CardDescription>
              <DescripcionConIcono icono={IconoEstado}>{aviso.texto}</DescripcionConIcono>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Vencimiento de la prueba</dt>
                <dd className="mt-1 font-medium">
                  {prueba.data ? fecha.format(new Date(prueba.data.vence_en)) : "Sin prueba"}
                  {prueba.data ? ` · ${dias} ${dias === 1 ? "día" : "días"}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Precio mensual</dt>
                <dd className="mt-1 font-medium">
                  {precioMensual ?? "Todavía no definido por la administración"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Autorización en Mercado Pago</dt>
                <dd className="mt-1 font-medium">
                  {suscripcion.data?.estado_mp ? <Badge variant="outline">{suscripcion.data.estado_mp}</Badge> : "Sin autorizar"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Cobertura paga hasta</dt>
                <dd className="mt-1 font-medium">
                  {suscripcion.data?.cobertura_hasta ? fecha.format(new Date(suscripcion.data.cobertura_hasta)) : "Ningún cobro confirmado"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
      <section id="opciones-de-pago" className="scroll-mt-24 space-y-4" aria-label="Opciones de pago">
        <Card>
          <CardHeader>
            <CardTitle>Pago con Mercado Pago</CardTitle>
            <CardDescription>
              <DescripcionConIcono icono={CreditCard}>
                {contexto.consultorio.rol !== "titular"
                  ? "Solo el titular puede autorizar la suscripción."
                  : autorizacionActiva
                    ? "La suscripción recurrente ya está autorizada. El acceso se habilita cuando Mercado Pago confirme un cobro."
                    : credenciales && configuracion.precioMensual
                      ? "Los datos de la tarjeta se ingresan en campos seguros de Mercado Pago y no se guardan en Nutrisfera."
                      : "Falta configurar el precio mensual o las credenciales de Mercado Pago. No se simula ningún cobro."}
              </DescripcionConIcono>
            </CardDescription>
          </CardHeader>
        </Card>
        {puedeAutorizar ? (
          <FormularioTarjeta
            clavePublica={credenciales!.clavePublica}
            precio={configuracion.precioMensual!}
            correo={contexto.correo ?? ""}
          />
        ) : null}
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Cobros</CardTitle>
          <CardDescription>
            <DescripcionConIcono icono={ReceiptText}>
              Pagos confirmados por Mercado Pago. Un monto menor al precio no suma un mes.
            </DescripcionConIcono>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(pagosLista.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay cobros registrados.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {(pagosLista.data ?? []).map((pago) => (
                <li key={pago.mp_pago_id}>
                  {pago.estado} · {formatearPesos(pago.monto) ?? pago.monto}
                  {pago.cobrado_en ? ` · ${fecha.format(new Date(pago.cobrado_en))}` : ""}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
