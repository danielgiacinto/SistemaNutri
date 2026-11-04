import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Building2, KeyRound, Palette, ShieldCheck, UserRound } from "lucide-react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { RUTAS } from "@/autorizacion/rutas";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { obtenerDatosConsultorio } from "@/servicios/consultorios";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { FormularioPerfil } from "@/componentes/configuracion/formulario-perfil";
import { FormularioApariencia } from "@/componentes/configuracion/formulario-apariencia";
import { FormularioConsultorio } from "@/componentes/configuracion/formulario-consultorio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Configuración" };

export default function PaginaConfiguracion() {
  return (
    <div className="space-y-8">
      <EncabezadoPagina titulo="Configuración" descripcion="Tu perfil, tu consultorio y la apariencia de la aplicación." />
      <Suspense fallback={<EsqueletoConfiguracion />}>
        <SeccionesConfiguracion />
      </Suspense>
    </div>
  );
}

async function SeccionesConfiguracion() {
  const contexto = await requerirProfesional();
  const esTitular = contexto.consultorio.rol === "titular";
  const consultorio = esTitular
    ? await obtenerDatosConsultorio(await crearClienteServidor(), contexto.consultorio.id)
    : null;

  return (
    <div className="space-y-6">
      <nav aria-label="Secciones de configuración" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[{ id: "perfil", titulo: "Mi perfil", icono: UserRound }, { id: "consultorio", titulo: "Consultorio", icono: Building2 }, { id: "apariencia", titulo: "Apariencia", icono: Palette }, { id: "seguridad", titulo: "Seguridad", icono: ShieldCheck }].map(({ id, titulo, icono: Icono }) => <a key={id} href={`#${id}`} className="flex items-center gap-2 rounded-xl border bg-card p-3 text-xs font-medium transition-colors outline-none hover:border-primary/30 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"><Icono className="size-4 shrink-0 text-primary" aria-hidden="true" />{titulo}</a>)}
      </nav>
      <Card id="perfil" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><UserRound className="size-4" aria-hidden="true" /></span><h2>Perfil profesional</h2></CardTitle>
          <CardDescription className="sm:pl-12">
            Así te ven tus pacientes en su portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioPerfil
            inicial={{ nombre: contexto.nombre, apellido: contexto.apellido }}
            correo={contexto.correo}
          />
        </CardContent>
      </Card>

      <Card id="consultorio" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Building2 className="size-4" aria-hidden="true" /></span><h2>Consultorio</h2></CardTitle>
          <CardDescription className="sm:pl-12">
            Datos generales y zona horaria para la agenda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {consultorio ? (
            <FormularioConsultorio
              inicial={{
                nombre: consultorio.nombre,
                zonaHoraria: consultorio.zona_horaria,
                telefono: consultorio.telefono ?? "",
                direccion: consultorio.direccion ?? "",
                duracionTurnoMinutos: consultorio.duracion_turno_minutos,
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Solo la persona titular del consultorio puede modificar estos datos.
            </p>
          )}
        </CardContent>
      </Card>

      <Card id="apariencia" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Palette className="size-4" aria-hidden="true" /></span><h2>Apariencia</h2></CardTitle>
          <CardDescription className="sm:pl-12">
            Se guarda en tu cuenta y se aplica en todos tus dispositivos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormularioApariencia inicial={contexto.preferencias} />
        </CardContent>
      </Card>

      <Card id="seguridad" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><ShieldCheck className="size-4" aria-hidden="true" /></span><h2>Seguridad</h2></CardTitle>
          <CardDescription className="sm:pl-12">
            Si ingresás con Google también podés definir una contraseña para ingresar con tu correo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={RUTAS.restablecerContrasena}>
              <KeyRound aria-hidden="true" />
              Cambiar contraseña
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function EsqueletoConfiguracion() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Cargando configuración">
      <Skeleton className="h-64" />
      <Skeleton className="h-80" />
      <Skeleton className="h-56" />
    </div>
  );
}
