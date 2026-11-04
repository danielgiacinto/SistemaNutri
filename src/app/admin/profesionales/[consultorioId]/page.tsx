import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requerirSuperadmin } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esquemaUuid } from "@/esquemas/comunes";
import { formatearFechaHora } from "@/lib/fechas";
import { formatearPesos } from "@/lib/moneda";
import { Card, CardHeader, CardTitle, CardContent } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { ControlesComerciales } from "@/componentes/admin/controles-comerciales";

export const metadata = { title: "Detalle comercial" };
export default function PaginaDetalleComercial({ params }: { params: Promise<{ consultorioId: string }> }) {
  return <Suspense fallback={<Skeleton className="h-80" />}><Contenido parametros={params} /></Suspense>;
}
async function Contenido({ parametros }: { parametros: Promise<{ consultorioId: string }> }) {
  await requerirSuperadmin();
  const { consultorioId } = await parametros;
  if (!esquemaUuid.safeParse(consultorioId).success) notFound();
  const cliente = await crearClienteServidor();
  const [consultorio, prueba, suscripcion, estado] = await Promise.all([
    cliente.from("consultorios").select("nombre, estado, creado_en, zona_horaria").eq("id", consultorioId).maybeSingle(),
    cliente.from("pruebas_profesionales").select("correo, inicio, vence_en").eq("consultorio_id", consultorioId).maybeSingle(),
    cliente.from("suscripciones").select("*").eq("consultorio_id", consultorioId).maybeSingle(),
    cliente.rpc("estado_acceso_comercial", { p_consultorio_id: consultorioId }),
  ]);
  if ([consultorio, prueba, suscripcion, estado].some((r) => r.error)) throw new Error("No pudimos cargar el detalle comercial.");
  if (!consultorio.data) notFound();
  const s = suscripcion.data;
  const fecha = (valor: string | null | undefined) => valor ? formatearFechaHora(new Date(valor), consultorio.data!.zona_horaria) : "Sin registro";
  const [pagos, eventos] = await Promise.all([
    s ? cliente.from("pagos_suscripcion").select("mp_pago_id, estado, monto, cobrado_en, periodo_desde, periodo_hasta").eq("suscripcion_id", s.id).order("creado_en", { ascending: false }).limit(30) : { data: [], error: null },
    s?.mp_id ? cliente.from("eventos_proveedor").select("id, tipo, creado_en, procesado_en, error").eq("recurso_id", s.mp_id).order("creado_en", { ascending: false }).limit(20) : { data: [], error: null },
  ]);
  if (pagos.error || eventos.error) throw new Error("No pudimos cargar los movimientos comerciales.");
  const etiquetas: Record<string, string> = { prueba: "Prueba vigente", activo: "Cobertura paga vigente", gracia: "Período de gracia", vencido: "Acceso vencido", suspendido_admin: "Suspensión administrativa", authorized: "Autorizada", cancelled: "Cancelada", paused: "Pausada", pending: "Pendiente", sin_autorizar: "Sin autorizar" };
  const datos = [
    ["Correo", prueba.data?.correo ?? "Sin registro"], ["Cuenta", consultorio.data.estado],
    ["Registro", fecha(consultorio.data.creado_en)], ["Acceso", etiquetas[estado.data ?? ""] ?? "Por verificar"],
    ["Inicio de prueba", fecha(prueba.data?.inicio)], ["Fin de prueba", fecha(prueba.data?.vence_en)],
    ["Autorización recurrente", etiquetas[s?.estado_mp ?? "sin_autorizar"] ?? "Por verificar"], ["Precio contratado", s ? `${formatearPesos(s.precio)} ${s.moneda}` : "Sin contrato"],
    ["Último cobro", fecha(s?.ultimo_cobro_en)], ["Próximo cobro informado", fecha(s?.proximo_cobro_en)],
    ["Cobertura paga hasta", fecha(s?.cobertura_hasta)], ["Referencia Mercado Pago", s?.mp_id ?? "Sin autorizar"],
    ["Última conciliación", fecha(s?.conciliada_en)], ["Revisión de cobros", s?.conciliacion_error ? "Pendiente: hubo un error de verificación" : s?.conciliacion_cursor ? "Hay más páginas por verificar" : "Sin errores registrados"],
    ["Cancelación solicitada", fecha(s?.cancelacion_solicitada_en)], ["Cancelación confirmada", fecha(s?.cancelada_en)],
  ];
  return <div className="space-y-6">
    <Link href="/admin/profesionales" className="text-sm text-primary underline underline-offset-4">Volver a profesionales</Link>
    <h1 className="text-2xl font-bold">{consultorio.data.nombre}</h1>
    <Card><CardHeader><CardTitle>Estado comercial</CardTitle></CardHeader><CardContent className="space-y-6">
      <dl className="grid gap-5 sm:grid-cols-2">{datos.map(([titulo, valor]) => <div key={titulo} className="min-w-0"><dt className="text-xs text-muted-foreground">{titulo}</dt><dd className="mt-1 break-words text-sm font-medium">{valor}</dd></div>)}</dl>
      {consultorio.data.estado !== "baja" ? <ControlesComerciales consultorioId={consultorioId} suspendido={consultorio.data.estado === "suspendido"} tieneSuscripcion={Boolean(s?.mp_id)} /> : null}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Últimos 30 cobros</CardTitle></CardHeader><CardContent>
      {!pagos.data?.length ? <p className="text-sm text-muted-foreground">Todavía no hay cobros registrados.</p> : <ul className="divide-y">{pagos.data.map((pago) => <li key={pago.mp_pago_id} className="space-y-1 py-3 text-sm"><p className="font-medium">{formatearPesos(pago.monto)} · {pago.estado}</p><p className="break-words text-muted-foreground">{fecha(pago.cobrado_en)} · Operación {pago.mp_pago_id}</p>{pago.periodo_hasta ? <p className="text-muted-foreground">Período: {fecha(pago.periodo_desde)} — {fecha(pago.periodo_hasta)}</p> : null}</li>)}</ul>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Últimos eventos de autorización</CardTitle></CardHeader><CardContent>
      {!eventos.data?.length ? <p className="text-sm text-muted-foreground">Todavía no hay eventos de autorización recibidos.</p> : <ul className="divide-y">{eventos.data.map((evento) => <li key={evento.id} className="py-3 text-sm"><p className="break-all font-medium">{evento.tipo}</p><p className="text-muted-foreground">{fecha(evento.creado_en)} · {evento.error ? "Verificación pendiente" : evento.procesado_en ? "Procesado" : "Pendiente"}</p></li>)}</ul>}
    </CardContent></Card>
  </div>;
}
