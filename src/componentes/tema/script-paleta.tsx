import { SCRIPT_PALETA_INICIAL } from "@/lib/apariencia-cliente";

/** Aplica la paleta guardada en el navegador antes de que React hidrate la página. */
export function ScriptPaleta() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: SCRIPT_PALETA_INICIAL }}
    />
  );
}
