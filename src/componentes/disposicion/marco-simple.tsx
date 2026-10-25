import { LogOut } from "lucide-react";
import { cerrarSesion } from "@/acciones/autenticacion";
import { Logo } from "@/componentes/marca/logo";
import { Button } from "@/componentes/ui/button";

/** Estructura mínima para pantallas de una sola tarea (alta, avisos de cuenta). */
export function MarcoSimple({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between border-b px-5 sm:px-8">
        <Logo />
        <form action={cerrarSesion}>
          <Button type="submit" variant="ghost" size="sm">
            <LogOut aria-hidden="true" />
            Cerrar sesión
          </Button>
        </form>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 py-10 sm:items-center sm:px-8">{children}</main>
    </div>
  );
}
