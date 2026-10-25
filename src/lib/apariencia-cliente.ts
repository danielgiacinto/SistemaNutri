import { CLAVE_ALMACEN_PALETA, IDS_PALETAS, type Paleta } from "@/configuracion/apariencia";

/** Aplica la paleta en <html> y la recuerda para el próximo ingreso desde este navegador. */
export function aplicarPaleta(paleta: Paleta): void {
  document.documentElement.dataset.paleta = paleta;
  try {
    localStorage.setItem(CLAVE_ALMACEN_PALETA, paleta);
  } catch {
    // Almacenamiento no disponible (modo privado): la paleta igual queda aplicada.
  }
}

/**
 * Script que se ejecuta antes del primer pintado para evitar un parpadeo de
 * colores. Solo acepta identificadores de paleta conocidos.
 */
export const SCRIPT_PALETA_INICIAL = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  CLAVE_ALMACEN_PALETA,
)});if(${JSON.stringify(IDS_PALETAS)}.indexOf(p)>-1){document.documentElement.dataset.paleta=p}}catch(e){}})();`;
