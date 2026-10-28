import { Suspense } from "react";
import type { Metadata } from "next";
import { cargarProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { credencialesMercadoPago, obtenerConfiguracionComercial } from "@/servicios/facturacion/mercadopago";
import { FormularioTarjeta } from "@/componentes/facturacion/formulario-tarjeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Skeleton } from "@/componentes/ui/skeleton";
import { LOCALE_PREDETERMINADO } from "@/configuracion/producto";
import { formatearPesos } from "@/lib/moneda";

export const metadata: Metadata = { title: "Facturación" };

const TEXTOS: Record<string, { titulo: string; texto: string }> = {
  prueba: {
    titulo: "Estás en el período de prueba",
    texto: "Podés usar el consultorio hasta la fecha de vencimiento. Para que el servicio no se corte, autorizá el cobro mensual antes de esa fecha.",
  },
  activo: {
    titulo: "Suscripción con cobertura vigente",
    texto: "El acceso está habilitado por un cobro confirmado. Autorizar la suscripción no alcanza: hace falta un pago aprobado del precio mensual.",
  },
  gracia: {
    titulo: "El último cobro no se pudo confirmar",
    texto: "Tenés un período de gracia para regularizar el medio de pago. Mercado Pago reintenta el cobro por su cuenta. No reintentamos el débito desde acá.",
  },
  vencido: {
    titulo: "El acceso comercial está suspendido",
    texto: "La prueba terminó o no hay un período pago vigente. Los pacientes, turnos e historias se conservan. Autorizá la suscripción para volver a trabajar.",
  },
  suspendido_admin: {
    titulo: "La cuenta fue suspendida por la administración",
    texto: "Esta suspensión no es un rechazo de pago. Escribí al soporte de la plataforma. Tus datos clínicos no se borran.",
  },
};

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
  const zona = contexto.consultorio.zonaHoraria;
  const fecha = new Intl.DateTimeFormat(LOCALE_PREDETERMINADO, { dateStyle: "long", timeZone: zona });
  const credenciales = credencialesMercadoPago();
  const dias = prueba.data ? Math.max(0, Math.ceil((new Date(prueba.data.vence_en).getTime() - new Date().getTime()) / 86_400_000)) : 0;
  const pagosLista = pagos.data
    ? await cliente.from("pagos_suscripcion").select("estado, monto, cobrado_en, mp_pago_id").eq("suscripcion_id", pagos.data.id).order("creado_en", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Facturación</h1>
        <p className="text-muted-foreground">La prueba y los cobros se verifican en el servidor. Volver de Mercado Pago no acredita un pago.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{aviso.titulo}</CardTitle>
          <CardDescription>{aviso.texto}</CardDescription>
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
                {formatearPesos(configuracion.precioMensual) ?? "Todavía no definido por la administración"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Autorización en Mercado Pago</dt>
              <dd className="mt-1 font-medium">{suscripcion.data?.estado_mp ?? "Sin autorizar"}</dd>
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
      {credenciales && configuracion.precioMensual && contexto.consultorio.rol === "titular" ? (
        <FormularioTarjeta
          clavePublica={credenciales.clavePublica}
          precio={configuracion.precioMensual}
          correo={contexto.correo ?? ""}
          pagadorDePrueba={Boolean(process.env.MERCADOPAGO_CORREO_PAGADOR_PRUEBA?.trim())}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Autorizar la suscripción</CardTitle>
            <CardDescription>
              {contexto.consultorio.rol !== "titular"
                ? "Solo el titular puede autorizar el cobro."
                : "Falta el precio o las credenciales de Mercado Pago en el servidor. No se simula ningún cobro."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Cobros</CardTitle>
          <CardDescription>Solo aparecen pagos consultados en Mercado Pago. Un monto menor al precio es la validación de la tarjeta y no suma un mes.</CardDescription>
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
