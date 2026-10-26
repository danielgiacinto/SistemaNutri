import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerContextoUsuario } from "@/autorizacion/sesion";
import { RUTAS } from "@/autorizacion/rutas";
import { BotonAceptarInvitacion } from "@/componentes/portal/boton-aceptar-invitacion";
import { MarcoSimple } from "@/componentes/disposicion/marco-simple";
import { EsqueletoFormulario } from "@/componentes/autenticacion/esqueleto-formulario";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarInvitacionesPendientes } from "@/servicios/invitaciones";

export const metadata: Metadata = { title: "Aceptar invitación" };

export default function PaginaAceptarInvitacion() {
  return (
    <MarcoSimple>
      <div className="w-full max-w-lg space-y-6">
        <Suspense fallback={<EsqueletoFormulario />}>
          <Contenido />
        </Suspense>
      </div>
    </MarcoSimple>
  );
}

async function Contenido() {
  const contexto = await obtenerContextoUsuario();
  if (!contexto) redirect(`${RUTAS.ingresar}?siguiente=${encodeURIComponent(RUTAS.invitacionAceptar)}`);
  if (contexto.tipoCuenta === "paciente") redirect(RUTAS.portal);
  if (contexto.tipoCuenta === "profesional" || contexto.esSuperadmin) {
    return (
      <Aviso
        titulo="Esta cuenta no puede aceptar la invitación"
        texto="Ingresaste con una cuenta de consultorio. Cerrá sesión e ingresá con el correo al que te invitaron."
      />
    );
  }

  const invitaciones = await listarInvitacionesPendientes(await crearClienteServidor());
  if (invitaciones.length === 0) {
    return (
      <Aviso
        titulo="No hay una invitación pendiente"
        texto="Si tu nutricionista te envió un enlace, abrilo desde el mismo correo. Si no, podés crear tu consultorio."
        enlace={{ href: `${RUTAS.bienvenida}?omitir=1`, etiqueta: "Crear mi consultorio" }}
      />
    );
  }
  if (invitaciones.length > 1) {
    return (
      <Aviso
        titulo="Tenés más de una invitación"
        texto="Abrí el enlace que te envió tu nutricionista para elegir cuál aceptar."
      />
    );
  }

  const invitacion = invitaciones[0];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Te invitaron al portal</h1>
      <p className="text-muted-foreground">
        <strong className="text-foreground">{invitacion.consultorio_nombre}</strong> te invitó a ver tus turnos y lo que
        compartan con vos. La invitación es para {invitacion.correo}.
      </p>
      <BotonAceptarInvitacion token={null} />
      <Link href={`${RUTAS.bienvenida}?omitir=1`} className="block text-center text-sm text-primary hover:underline">
        No soy paciente: crear un consultorio
      </Link>
    </div>
  );
}

function Aviso({
  titulo,
  texto,
  enlace,
}: {
  titulo: string;
  texto: string;
  enlace?: { href: string; etiqueta: string };
}) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
      <p className="text-muted-foreground">{texto}</p>
      {enlace && (
        <Link href={enlace.href} className="text-sm font-medium text-primary hover:underline">
          {enlace.etiqueta}
        </Link>
      )}
    </div>
  );
}
