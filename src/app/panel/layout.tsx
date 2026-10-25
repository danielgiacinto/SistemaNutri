import { Suspense } from "react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { MarcoAplicacion } from "@/componentes/disposicion/marco-aplicacion";
import { EsqueletoMarco } from "@/componentes/disposicion/esqueleto-marco";
import { SincronizarPreferencias } from "@/componentes/tema/sincronizar-preferencias";
import { datosMenuUsuario, enlacesMenuUsuario } from "@/lib/presentacion-usuario";
import { RUTAS } from "@/autorizacion/rutas";

export default function LayoutPanel({ children }: LayoutProps<"/panel">) {
  return (
    <Suspense fallback={<EsqueletoMarco />}>
      <MarcoPanel>{children}</MarcoPanel>
    </Suspense>
  );
}

async function MarcoPanel({ children }: { children: React.ReactNode }) {
  // Primera verificación del área; cada página y acción vuelve a verificar por su cuenta.
  const contexto = await requerirProfesional();

  return (
    <MarcoAplicacion
      variante="profesional"
      hrefInicio={RUTAS.panel}
      subtitulo={contexto.consultorio.nombre}
      usuario={datosMenuUsuario(contexto, contexto.consultorio.rol === "titular" ? "Titular" : "Colaborador")}
      enlacesUsuario={enlacesMenuUsuario(contexto, "panel")}
    >
      <SincronizarPreferencias tema={contexto.preferencias.tema} paleta={contexto.preferencias.paleta} />
      {children}
    </MarcoAplicacion>
  );
}
