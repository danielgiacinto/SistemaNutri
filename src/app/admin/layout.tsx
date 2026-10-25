import { Suspense } from "react";
import { requerirSuperadmin } from "@/autorizacion/sesion";
import { MarcoAplicacion } from "@/componentes/disposicion/marco-aplicacion";
import { EsqueletoMarco } from "@/componentes/disposicion/esqueleto-marco";
import { SincronizarPreferencias } from "@/componentes/tema/sincronizar-preferencias";
import { datosMenuUsuario, enlacesMenuUsuario } from "@/lib/presentacion-usuario";
import { RUTAS } from "@/autorizacion/rutas";

export default function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<EsqueletoMarco />}>
      <MarcoAdmin>{children}</MarcoAdmin>
    </Suspense>
  );
}

async function MarcoAdmin({ children }: { children: React.ReactNode }) {
  const contexto = await requerirSuperadmin();

  return (
    <MarcoAplicacion
      variante="admin"
      hrefInicio={RUTAS.admin}
      subtitulo="Administración"
      usuario={datosMenuUsuario(contexto, "Superadministrador")}
      enlacesUsuario={enlacesMenuUsuario(contexto, "admin")}
    >
      <SincronizarPreferencias tema={contexto.preferencias.tema} paleta={contexto.preferencias.paleta} />
      {children}
    </MarcoAplicacion>
  );
}
