"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/componentes/ui/tooltip";
import { Toaster } from "@/componentes/ui/sonner";

/** Proveedores globales de la interfaz: tema claro/oscuro, tooltips y notificaciones. */
export function Proveedores({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="nutri-tema"
    >
      <TooltipProvider delayDuration={300}>
        {children}
        <Toaster position="top-center" closeButton containerAriaLabel="Notificaciones" />
      </TooltipProvider>
    </ThemeProvider>
  );
}
