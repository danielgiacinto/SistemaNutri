"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { guardarPreferenciasApariencia } from "@/acciones/perfil";
import { Button } from "@/componentes/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/componentes/ui/tooltip";

const suscribirSinCambios = () => () => {};

/** Alterna entre modo claro y oscuro y guarda la preferencia en la cuenta. */
export function BotonTema() {
  const { resolvedTheme, setTheme } = useTheme();
  // El tema real solo se conoce en el navegador; durante el renderizado del servidor se asume claro.
  const montado = useSyncExternalStore(
    suscribirSinCambios,
    () => true,
    () => false,
  );

  const esOscuro = montado && resolvedTheme === "dark";
  const etiqueta = esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  async function alternar() {
    const temaNuevo = esOscuro ? "claro" : "oscuro";
    setTheme(esOscuro ? "light" : "dark");
    const resultado = await guardarPreferenciasApariencia({ tema: temaNuevo });
    if (!resultado.ok) toast.error("No se pudo guardar la preferencia de tema.");
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={alternar} aria-label={etiqueta}>
          {esOscuro ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{etiqueta}</TooltipContent>
    </Tooltip>
  );
}
