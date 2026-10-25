"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { cerrarSesion } from "@/acciones/autenticacion";
import { Avatar, AvatarFallback, AvatarImage } from "@/componentes/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/componentes/ui/dropdown-menu";
import { cn } from "@/lib/utilidades";

export type DatosUsuarioMenu = {
  nombre: string;
  correo: string | null;
  iniciales: string;
  avatarUrl: string | null;
  rotulo: string;
};

export type EnlaceMenuUsuario = { href: string; etiqueta: string };

type PropiedadesMenu = {
  usuario: DatosUsuarioMenu;
  enlaces: EnlaceMenuUsuario[];
  /** Solo muestra el avatar (cabecera móvil). */
  compacto?: boolean;
};

export function MenuUsuario({ usuario, enlaces, compacto = false }: PropiedadesMenu) {
  const avatar = (
    <Avatar className="size-9 rounded-xl">
      {usuario.avatarUrl && <AvatarImage src={usuario.avatarUrl} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback className="rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
        {usuario.iniciales}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          compacto ? "p-0.5" : "min-w-0 flex-1 p-2 hover:bg-sidebar-accent",
        )}
        aria-label={`Menú de la cuenta de ${usuario.nombre}`}
      >
        {avatar}
        {!compacto && (
          <>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-semibold">{usuario.nombre}</span>
              <span className="truncate text-xs text-muted-foreground">{usuario.rotulo}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={compacto ? "bottom" : "top"} className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-semibold text-foreground">{usuario.nombre}</span>
          {usuario.correo && <span className="truncate text-xs font-normal">{usuario.correo}</span>}
        </DropdownMenuLabel>
        {enlaces.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {enlaces.map((enlace) => (
                <DropdownMenuItem key={enlace.href} asChild>
                  <Link href={enlace.href}>{enlace.etiqueta}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <form action={cerrarSesion}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut aria-hidden="true" />
              Cerrar sesión
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
