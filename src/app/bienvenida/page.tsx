import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { requerirUsuario } from "@/autorizacion/sesion";
import { calcularDestino, nombreVisible } from "@/autorizacion/contexto";
import { RUTAS } from "@/autorizacion/rutas";
import { MarcoSimple } from "@/componentes/disposicion/marco-simple";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarInvitacionesPendientes } from "@/servicios/invitaciones";
import { FormularioAltaConsultorio } from "@/componentes/consultorio/formulario-alta-consultorio";
import { EsqueletoFormulario } from "@/componentes/autenticacion/esqueleto-formulario";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";

export const metadata: Metadata = { title: "Bienvenida" };

export default function PaginaBienvenida({ searchParams }: PageProps<"/bienvenida">) {
  return (
    <MarcoSimple>
      <div className="w-full max-w-lg space-y-6">
        <Suspense fallback={<EsqueletoFormulario />}>
          <ContenidoBienvenida parametros={searchParams} />
        </Suspense>
      </div>
    </MarcoSimple>
  );
}

async function ContenidoBienvenida({ parametros }: { parametros: PageProps<"/bienvenida">["searchParams"] }) {
  const contexto = await requerirUsuario();
  // Quien ya completó el alta no vuelve a esta pantalla.
  if (contexto.tipoCuenta !== null || contexto.esSuperadmin) redirect(calcularDestino(contexto));

  const { omitir } = await parametros;
  if (omitir !== "1") {
    const pendientes = await listarInvitacionesPendientes(await crearClienteServidor());
    if (pendientes.length === 1) redirect(RUTAS.invitacionAceptar);
  }

  return (
    <>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">¡Te damos la bienvenida, {nombreVisible(contexto)}!</h1>
        <p className="text-muted-foreground">Para empezar, configurá tu consultorio. Te lleva menos de un minuto.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tu consultorio</CardTitle>
          <CardDescription>Es tu espacio de trabajo privado: pacientes, agenda e historias clínicas.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioAltaConsultorio />
        </CardContent>
      </Card>
      <div className="flex items-start gap-3 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
        <HeartPulse className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>
          ¿Sos paciente? No necesitás crear un consultorio: tu nutricionista te va a enviar una invitación para acceder
          a tu portal con este mismo correo.
        </p>
      </div>
    </>
  );
}
