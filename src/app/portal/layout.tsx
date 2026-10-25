import { Suspense } from "react";
import { requerirPaciente } from "@/autorizacion/sesion";
import { RUTAS } from "@/autorizacion/rutas";
import { Logo } from "@/componentes/marca/logo";
import { BotonTema } from "@/componentes/disposicion/boton-tema";
import { MenuUsuario } from "@/componentes/disposicion/menu-usuario";
import { NavegacionPortal } from "@/componentes/disposicion/navegacion-portal";
import { SincronizarPreferencias } from "@/componentes/tema/sincronizar-preferencias";
import { datosMenuUsuario, enlacesMenuUsuario } from "@/lib/presentacion-usuario";
import { Skeleton } from "@/componentes/ui/skeleton";

export default function LayoutPortal({ children }: LayoutProps<"/portal">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Logo href={RUTAS.portal} subtitulo="Mi portal" />
          <div className="flex items-center gap-1">
            <BotonTema />
            <Suspense fallback={<Skeleton className="size-9 rounded-xl" />}>
              <MenuPaciente />
            </Suspense>
          </div>
        </div>
        <div className="mx-auto hidden max-w-3xl px-4 pb-2 sm:block">
          <NavegacionPortal />
        </div>
      </header>
      <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-28 sm:pb-10">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <ContenidoProtegido>{children}</ContenidoProtegido>
        </Suspense>
      </main>
      <div className="sm:hidden">
        <NavegacionPortal />
      </div>
    </div>
  );
}

async function MenuPaciente() {
  const contexto = await requerirPaciente();
  return (
    <MenuUsuario usuario={datosMenuUsuario(contexto, "Paciente")} enlaces={enlacesMenuUsuario(contexto, "portal")} compacto />
  );
}

async function ContenidoProtegido({ children }: { children: React.ReactNode }) {
  const contexto = await requerirPaciente();
  return (
    <>
      <SincronizarPreferencias tema={contexto.preferencias.tema} paleta={contexto.preferencias.paleta} />
      {children}
    </>
  );
}
