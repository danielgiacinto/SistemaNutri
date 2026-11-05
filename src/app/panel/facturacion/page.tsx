import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowDown, CalendarDays, Check, CircleCheck, Clock3, CreditCard, Gift, HeartHandshake, LockKeyhole, ReceiptText, Salad, ShieldCheck, Sparkles, Users } from "lucide-react";
import { requerirProfesionalParaFacturacion } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { registrarError } from "@/lib/errores";
import { consultarRecursoMercadoPago, credencialesMercadoPago, obtenerConfiguracionComercial, type SuscripcionMercadoPago } from "@/servicios/facturacion/mercadopago";
import { BotonElegirPlan } from "@/componentes/facturacion/boton-elegir-plan";
import { BotonActualizarPagos } from "@/componentes/facturacion/boton-actualizar-pagos";
import { CancelarRenovacion } from "@/componentes/facturacion/cancelar-renovacion";
import { AvisoComercial } from "@/componentes/facturacion/aviso-comercial";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardHeader } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { LOCALE_PREDETERMINADO } from "@/configuracion/producto";
import { formatearPesos } from "@/lib/moneda";

export const metadata: Metadata = { title: "Plan y facturación" };

const BENEFICIOS = [
  { icono: Users, titulo: "Tus pacientes, sin límite", descripcion: "Fichas e historias clínicas en un solo lugar." },
  { icono: CalendarDays, titulo: "Tu agenda organizada", descripcion: "Turnos, disponibilidad y seguimiento de consultas." },
  { icono: Salad, titulo: "Planes a tu medida", descripcion: "Creá y compartí planes alimentarios con tus pacientes." },
  { icono: HeartHandshake, titulo: "Acompañamiento continuo", descripcion: "Mediciones, objetivos, portal y comunidad de pacientes." },
];

const ETIQUETAS_SUSCRIPCION: Record<string, string> = {
  sin_autorizar: "Sin activar", pending: "Pago por completar", authorized: "Autorizada",
  paused: "Pausada", cancelled: "Cancelada",
};
const ETIQUETAS_PAGO: Record<string, string> = {
  aprobado: "Aprobado", rechazado: "Rechazado", pendiente: "Pendiente", devuelto: "Devuelto",
};

export default function PaginaFacturacion() {
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <EncabezadoPagina titulo="Plan y facturación" descripcion="Todo lo que necesitás para acompañar a tus pacientes, en un solo plan." />
      <Suspense fallback={<div className="space-y-6"><Skeleton className="h-40" /><Skeleton className="h-96" /><Skeleton className="h-40" /></div>}>
        <ContenidoFacturacion />
      </Suspense>
    </div>
  );
}

async function ContenidoFacturacion() {
  const contexto = await requerirProfesionalParaFacturacion();
  const cliente = await crearClienteServidor();
  const [configuracion, estado, prueba, suscripcion, pacientes] = await Promise.all([
    obtenerConfiguracionComercial(cliente),
    cliente.rpc("estado_acceso_comercial", { p_consultorio_id: contexto.consultorio.id }),
    cliente.from("pruebas_profesionales").select("inicio, vence_en").eq("consultorio_id", contexto.consultorio.id).maybeSingle(),
    cliente.from("suscripciones").select("id, estado_mp, precio, cobertura_hasta, proximo_cobro_en, mp_id, cancelacion_solicitada_en, conciliada_en, conciliacion_error, conciliacion_cursor").eq("consultorio_id", contexto.consultorio.id).maybeSingle(),
    cliente.from("pacientes").select("id", { count: "exact", head: true }).eq("consultorio_id", contexto.consultorio.id).eq("estado", "activo"),
  ]);
  for (const resultado of [estado, prueba, suscripcion, pacientes]) {
    if (resultado.error) {
      registrarError("facturacion_cargar", resultado.error);
      throw new Error("No pudimos cargar la información de tu plan. Intentá nuevamente.");
    }
  }
  // El webhook puede demorar o no llegar a localhost. Consultar el proveedor
  // permite mostrar una cancelación o autorización reciente sin acreditar pagos.
  let estadoSuscripcion = suscripcion.data?.estado_mp;
  let proximoCobro = suscripcion.data?.proximo_cobro_en;
  let estadoSinActualizar = false;
  if (suscripcion.data?.mp_id && credencialesMercadoPago()) {
    try {
      const remota = await consultarRecursoMercadoPago(`/preapproval/${encodeURIComponent(suscripcion.data.mp_id)}`) as SuscripcionMercadoPago | null;
      if (remota?.status === "canceled") remota.status = "cancelled";
      if (!remota || remota.id !== suscripcion.data.mp_id || remota.external_reference !== contexto.consultorio.id ||
          Number(remota.auto_recurring?.transaction_amount) !== Number(suscripcion.data.precio) || remota.auto_recurring?.currency_id !== "ARS" ||
          !["pending", "authorized", "paused", "cancelled"].includes(remota.status)) {
        throw new Error("La suscripción de Mercado Pago no coincide con el plan.");
      }
      estadoSuscripcion = remota.status;
      proximoCobro = remota.next_payment_date ?? null;
    } catch (error) {
      registrarError("facturacion_estado_mercadopago", error);
      estadoSinActualizar = true;
    }
  }
  const codigo = estado.data ?? "vencido";
  const enPrueba = codigo === "prueba";
  const activo = codigo === "activo";
  const vencido = codigo === "vencido";
  const autorizada = estadoSuscripcion === "authorized";
  const pendienteDePago = estadoSuscripcion === "pending";
  const precio = (autorizada || pendienteDePago) ? suscripcion.data!.precio : configuracion.precioMensual;
  const precioVisible = formatearPesos(precio);
  const dias = prueba.data ? Math.max(0, Math.ceil((new Date(prueba.data.vence_en).getTime() - new Date().getTime()) / 86_400_000)) : 0;
  const fecha = new Intl.DateTimeFormat(LOCALE_PREDETERMINADO, { dateStyle: "long", timeZone: contexto.consultorio.zonaHoraria });
  const fechaPrueba = prueba.data ? fecha.format(new Date(prueba.data.vence_en)) : null;
  const cobertura = suscripcion.data?.cobertura_hasta;
  const disponible = Boolean(credencialesMercadoPago() && configuracion.precioMensual);
  const puedeElegir = contexto.consultorio.rol === "titular" && disponible && !autorizada && estadoSuscripcion !== "paused" &&
    (!suscripcion.data?.cancelacion_solicitada_en || estadoSuscripcion === "cancelled") && codigo !== "suspendido_admin";
  const tituloEstado = enPrueba ? "Estás en tu prueba gratis" : activo ? "Tu plan está activo" : codigo === "gracia" ? "Hay un cobro pendiente" : vencido ? "Es momento de activar tu plan" : "Tu cuenta está suspendida";
  const IconoEstado = enPrueba ? Gift : activo ? CircleCheck : Clock3;
  const pagos = suscripcion.data
    ? await cliente.from("pagos_suscripcion").select("estado, monto, cobrado_en, creado_en, mp_pago_id").eq("suscripcion_id", suscripcion.data.id).order("creado_en", { ascending: false }).limit(30)
    : { data: [], error: null };
  if (pagos.error) {
    registrarError("facturacion_pagos", pagos.error);
    throw new Error("No pudimos cargar el historial de pagos.");
  }

  return (
    <>
      <AvisoComercial consultorioId={contexto.consultorio.id} zona={contexto.consultorio.zonaHoraria} />
      <Card className={vencido ? "ring-destructive/25" : "ring-primary/15"}>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${vencido ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
                <IconoEstado className="size-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <h2 className="font-semibold">{tituloEstado}</h2>
                <p className="max-w-xl text-sm text-muted-foreground">
                  {enPrueba ? `Te quedan ${dias} ${dias === 1 ? "día" : "días"} para disfrutar todas las funciones. Elegí tu plan para seguir cuando termine.`
                    : activo ? "Seguí acompañando a tus pacientes con todas las funciones de Nutrisfera."
                    : codigo === "gracia" ? "Mercado Pago está reintentando el cobro. Revisá tu medio de pago para mantener el acceso."
                    : vencido ? "Tu prueba o cobertura terminó. Tus datos se conservan: completá el pago para retomar el acceso."
                    : "Contactá al soporte para revisar el estado de tu cuenta."}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit shrink-0 gap-1.5 px-3 py-1.5">
              <Users className="size-3.5" aria-hidden="true" />
              {pacientes.count ?? 0} {(pacientes.count ?? 0) === 1 ? "paciente activo" : "pacientes activos"} · sin límite
            </Badge>
          </div>
          <dl className="grid gap-4 rounded-xl bg-muted/50 p-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted-foreground">{enPrueba ? "Tu prueba termina" : "Cobertura hasta"}</dt><dd className="mt-1 font-medium">{enPrueba ? fechaPrueba : cobertura ? fecha.format(new Date(cobertura)) : "Sin cobertura vigente"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Suscripción mensual</dt><dd className="mt-1 font-medium">{ETIQUETAS_SUSCRIPCION[estadoSuscripcion ?? "sin_autorizar"] ?? "Por confirmar"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{autorizada ? "Próximo cobro" : "Forma de pago"}</dt><dd className="mt-1 font-medium">{autorizada ? proximoCobro ? fecha.format(new Date(proximoCobro)) : enPrueba ? fechaPrueba : "Pendiente de confirmación" : "Mercado Pago"}</dd></div>
          </dl>
          {estadoSinActualizar ? <p role="status" className="text-xs text-muted-foreground">No pudimos actualizar la suscripción con Mercado Pago. Mostramos el último estado registrado; volvé a actualizar en unos instantes.</p> : null}
        </CardContent>
      </Card>

      <section id="opciones-de-pago" aria-labelledby="titulo-plan" className="scroll-mt-24">
        <Card className="gap-0 overflow-hidden p-0">
          <div className="grid md:grid-cols-[1.1fr_1fr]">
            <div className="space-y-7 p-5 sm:p-8">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase"><Sparkles className="size-3.5" aria-hidden="true" /> Tu consultorio, completo</span>
                <h2 id="titulo-plan" className="text-2xl font-bold tracking-tight">Un plan. Todas las posibilidades.</h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">Más tiempo para tus pacientes. Todas las herramientas de Nutrisfera, sin límites de pacientes ni funciones por desbloquear.</p>
              </div>
              <ul className="grid gap-5 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                {BENEFICIOS.map(({ icono: Icono, titulo, descripcion }) => (
                  <li key={titulo} className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icono className="size-4" aria-hidden="true" /></span>
                    <div><p className="text-sm font-semibold">{titulo}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{descripcion}</p></div>
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" /> Tus datos y los de tus pacientes, protegidos en tu consultorio.</p>
            </div>

            <div className="flex items-center border-t bg-accent/35 p-5 sm:p-8 md:border-t-0 md:border-l">
              <div className="w-full space-y-5 rounded-2xl border border-primary/25 bg-card p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Salad className="size-5" aria-hidden="true" /></span><Badge variant="secondary" className="bg-accent text-accent-foreground">{autorizada || activo ? "Tu plan" : "Todo incluido"}</Badge></div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">Nutrisfera Profesional</h3>
                  <p className="text-sm text-muted-foreground">El espacio para hacer crecer tu consultorio.</p>
                  <div className="flex flex-wrap items-baseline gap-x-2 pt-2"><span className={precioVisible ? "text-4xl font-bold tracking-tight" : "text-xl font-semibold"}>{precioVisible ?? "Precio por confirmar"}</span>{precioVisible ? <span className="text-sm text-muted-foreground">ARS / mes</span> : null}</div>
                </div>
                <ul className="space-y-2.5 border-y py-4 text-sm">
                  {["Pacientes activos y archivados ilimitados", "Todas las funciones incluidas", "Renovación automática cada mes"].map((texto) => <li key={texto} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{texto}</li>)}
                </ul>
                {puedeElegir ? <BotonElegirPlan pendienteDePago={pendienteDePago} /> : <Button className="h-12 w-full" disabled>{autorizada ? <><CircleCheck aria-hidden="true" /> Plan autorizado</> : contexto.consultorio.rol !== "titular" ? "Solo disponible para el titular" : "Plan no disponible"}</Button>}
                <div className="space-y-2 text-center text-xs leading-relaxed text-muted-foreground">
                  <p className="flex items-center justify-center gap-1.5 font-medium"><LockKeyhole className="size-3.5" aria-hidden="true" /> Pago seguro con Mercado Pago</p>
                  <p>{autorizada ? enPrueba ? `Tu plan ya está autorizado. El cobro mensual comenzará al terminar tu prueba, el ${fechaPrueba}.` : "La suscripción está autorizada. La cobertura se actualiza con cada cobro confirmado."
                    : contexto.consultorio.rol !== "titular" ? "El titular del consultorio puede elegir y autorizar el plan."
                    : !disponible ? "Estamos preparando los pagos. Contactá al soporte para activar tu plan."
                    : enPrueba ? `Elegilo hoy y conservá tu prueba: el cobro mensual comienza el ${fechaPrueba}.`
                    : "Te llevamos a Mercado Pago para elegir tu medio de pago y confirmar la suscripción."}</p>
                  {estadoSuscripcion === "cancelled" ? <p>Renovación cancelada. Se conserva la prueba y el período ya pagado.</p> : null}
                </div>
                {contexto.consultorio.rol === "titular" && disponible && suscripcion.data?.mp_id && estadoSuscripcion !== "cancelled" ? <CancelarRenovacion solicitada={Boolean(suscripcion.data.cancelacion_solicitada_en)} /> : null}
                {suscripcion.data?.cancelacion_solicitada_en && estadoSuscripcion !== "cancelled" ? <p role="status" className="text-sm text-muted-foreground">La cancelación está solicitada y pendiente de confirmación por Mercado Pago.</p> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t bg-muted/30 px-5 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="flex items-center gap-2"><CreditCard className="size-4 shrink-0" aria-hidden="true" /> Los datos de tu tarjeta se ingresan en Mercado Pago.</p>
            <a href="#historial-pagos" className="inline-flex w-fit items-center gap-1.5 font-medium text-primary hover:underline">Ver mis pagos <ArrowDown className="size-3.5" aria-hidden="true" /></a>
          </div>
        </Card>
      </section>

      <Card id="historial-pagos" className="scroll-mt-24">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1"><h2 className="flex items-center gap-2 font-semibold"><ReceiptText className="size-4 text-primary" aria-hidden="true" /> Historial de pagos</h2><p className="text-sm text-muted-foreground">Tus últimos 30 cobros y su estado en Mercado Pago.</p></div>
          <BotonActualizarPagos puedeSincronizar={contexto.consultorio.rol === "titular" && Boolean(suscripcion.data?.mp_id)} />
        </CardHeader>
        <CardContent>
          {suscripcion.data?.conciliada_en ? <p className="mb-4 text-xs text-muted-foreground">Última verificación: {fecha.format(new Date(suscripcion.data.conciliada_en))}.{suscripcion.data.conciliacion_cursor > 0 ? " Hay más movimientos pendientes de revisar." : ""}</p> : null}
          {suscripcion.data?.conciliacion_error ? <p role="status" className="mb-4 text-sm text-destructive">La última verificación quedó pendiente. Los datos confirmados se conservan; podés volver a verificar los cobros.</p> : null}
          {(pagos.data ?? []).length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed px-5 py-8 text-center"><span className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"><ReceiptText className="size-5" aria-hidden="true" /></span><p className="text-sm font-medium">Todavía no tenés pagos registrados</p><p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">Cuando Mercado Pago confirme un cobro, vas a verlo acá. Si acabás de pagar, puede demorar unos instantes.</p></div>
          ) : (
            <ul className="divide-y">
              {(pagos.data ?? []).map((pago) => (
                <li key={pago.mp_pago_id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div><p className="text-sm font-medium">{Number(pago.monto) < Number(suscripcion.data?.precio) ? "Validación del medio de pago" : "Suscripción mensual"}</p><p className="mt-1 text-xs text-muted-foreground">{fecha.format(new Date(pago.cobrado_en ?? pago.creado_en))} · Operación {pago.mp_pago_id}</p></div>
                  <div className="flex items-center gap-3"><span className="text-sm font-semibold">{formatearPesos(pago.monto)}</span><Badge variant={pago.estado === "rechazado" ? "destructive" : pago.estado === "aprobado" ? "default" : "secondary"}>{ETIQUETAS_PAGO[pago.estado] ?? "Por confirmar"}</Badge></div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
