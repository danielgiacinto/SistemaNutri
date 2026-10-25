import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Proveedores } from "@/componentes/tema/proveedores";
import { ScriptPaleta } from "@/componentes/tema/script-paleta";
import { DESCRIPCION_PRODUCTO, NOMBRE_PRODUCTO } from "@/configuracion/producto";
import "./globals.css";

const fuenteSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fuenteMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: NOMBRE_PRODUCTO, template: `%s · ${NOMBRE_PRODUCTO}` },
  description: DESCRIPCION_PRODUCTO,
  applicationName: NOMBRE_PRODUCTO,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#14181f" },
  ],
};

export default function LayoutRaiz({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      suppressHydrationWarning
      className={`${fuenteSans.variable} ${fuenteMono.variable} h-full antialiased`}
    >
      <head>
        <ScriptPaleta />
      </head>
      <body className="flex min-h-full flex-col">
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  );
}
