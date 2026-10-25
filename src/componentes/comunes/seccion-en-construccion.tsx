import { Construction } from "lucide-react";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import type { ElementoNavegacion } from "@/configuracion/navegacion";

/** Página informativa para módulos planificados que todavía no están implementados. */
export function SeccionEnConstruccion({ seccion }: { seccion: ElementoNavegacion }) {
  return (
    <div className="space-y-8">
      <EncabezadoPagina titulo={seccion.titulo} descripcion={seccion.descripcion} />
      <EstadoVacio
        icono={Construction}
        titulo="Este módulo todavía no está disponible"
        descripcion={
          <>
            Está planificado para la fase {seccion.fasePendiente} del desarrollo. Mientras tanto no se muestran datos
            de ejemplo para no confundirlos con información real.
          </>
        }
      />
    </div>
  );
}
