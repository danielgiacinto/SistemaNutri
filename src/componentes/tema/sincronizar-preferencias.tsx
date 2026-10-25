"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { TEMA_A_NEXT_THEMES, type Paleta, type Tema } from "@/configuracion/apariencia";
import { aplicarPaleta } from "@/lib/apariencia-cliente";

/**
 * Aplica las preferencias guardadas en la cuenta. La base de datos es la
 * fuente de verdad: así el tema y la paleta acompañan al usuario entre dispositivos.
 */
export function SincronizarPreferencias({ tema, paleta }: { tema: Tema; paleta: Paleta }) {
  const { setTheme } = useTheme();
  const temaSincronizado = useRef<Tema | null>(null);

  useEffect(() => {
    // Solo reacciona cuando cambia la preferencia guardada, no ante cambios locales del tema.
    if (temaSincronizado.current === tema) return;
    temaSincronizado.current = tema;
    setTheme(TEMA_A_NEXT_THEMES[tema]);
  }, [tema, setTheme]);

  useEffect(() => {
    if (document.documentElement.dataset.paleta !== paleta) aplicarPaleta(paleta);
  }, [paleta]);

  return null;
}
