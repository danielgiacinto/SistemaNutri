import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerContextoUsuario } from "@/autorizacion/sesion";
import { RUTAS } from "@/autorizacion/rutas";
import { BotonAceptarInvitacion } from "@/componentes/portal/boton-aceptar-invitacion";
import { MarcoSimple } from "@/componentes/disposicion/marco-simple";
import { EsqueletoFormulario } from "@/componentes/autenticacion/esqueleto-formulario";

export const metadata: Metadata = { title: "Invitación" };

const TOKEN_VALIDO = /^[A-Za-z0-9_-]{32,80}$/;

export default function PaginaInvitacion({ params }: PageProps<"/invitacion/[token]">) {
  return (
    <MarcoSimple>
      <div className="w-full max-w-lg space-y-6">
        <Suspense fallback={<EsqueletoFormulario />}>
          <Contenido params={params} />
        </Suspense>
      </div>
    </MarcoSimple>
  );
}

async function Contenido({ params }: { params: PageProps<"/invitacion/[token]">["params"] }) {
  const { token } = await params;
  if (!TOKEN_VALIDO.test(token)) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">El enlace no es válido</h1>
        <p className="text-muted-foreground">Pedile a tu nutricionista que te envíe una invitación nueva.</p>
      </div>
    );
  }

  const contexto = await obtenerContextoUsuario();
  const siguiente = `/invitacion/${token}`;
  if (!contexto) {
    const destino = encodeURIComponent(siguiente);
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Tenés una invitación</h1>
        <p className="text-muted-foreground">
          Ingresá o creá una cuenta con el correo que te indicó tu nutricionista. Después vas a poder aceptar.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={`${RUTAS.ingresar}?siguiente=${destino}`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Ingresar
          </Link>
          <Link
            href={`${RUTAS.registro}?siguiente=${destino}`}
            className="inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    );
  }

  if (contexto.tipoCuenta === "paciente") redirect(RUTAS.portal);
  if (contexto.tipoCuenta === "profesional" || contexto.esSuperadmin) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Esta cuenta no puede aceptar la invitación</h1>
        <p className="text-muted-foreground">
          Cerrá sesión e ingresá con el correo de la invitación, no con la cuenta del consultorio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Aceptá tu lugar en el portal</h1>
      <p className="text-muted-foreground">
        Estás ingresando como {contexto.correo ?? "tu cuenta"}. Solo funciona si ese es el correo de la invitación.
      </p>
      <BotonAceptarInvitacion token={token} />
    </div>
  );
}
