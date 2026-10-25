import { Logo } from "@/componentes/marca/logo";
import { ListaNavegacion } from "@/componentes/disposicion/lista-navegacion";
import { NavegacionMovil } from "@/componentes/disposicion/navegacion-movil";
import { BotonTema } from "@/componentes/disposicion/boton-tema";
import { MenuUsuario, type DatosUsuarioMenu, type EnlaceMenuUsuario } from "@/componentes/disposicion/menu-usuario";
import type { VarianteNavegacion } from "@/configuracion/navegacion";

type PropiedadesMarco = {
  variante: Extract<VarianteNavegacion, "profesional" | "admin">;
  hrefInicio: string;
  subtitulo: string;
  usuario: DatosUsuarioMenu;
  enlacesUsuario: EnlaceMenuUsuario[];
  children: React.ReactNode;
};

/** Estructura del panel profesional y del panel de administración: barra lateral y cabecera móvil. */
export function MarcoAplicacion({ variante, hrefInicio, subtitulo, usuario, enlacesUsuario, children }: PropiedadesMarco) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="px-5 pt-6 pb-5">
          <Logo href={hrefInicio} subtitulo={subtitulo} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <ListaNavegacion variante={variante} />
        </div>
        <div className="flex items-center gap-1 border-t border-sidebar-border p-3">
          <MenuUsuario usuario={usuario} enlaces={enlacesUsuario} />
          <BotonTema />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur lg:hidden">
          <NavegacionMovil variante={variante} subtitulo={subtitulo} />
          <Logo href={hrefInicio} className="min-w-0 [&_.text-lg]:text-base" />
          <div className="ml-auto flex items-center gap-1">
            <BotonTema />
            <MenuUsuario usuario={usuario} enlaces={enlacesUsuario} compacto />
          </div>
        </header>

        <main id="contenido" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
