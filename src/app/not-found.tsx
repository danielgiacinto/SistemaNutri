import Link from "next/link";
import { SearchX } from "lucide-react";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { Button } from "@/componentes/ui/button";
import { RUTAS } from "@/autorizacion/rutas";

export default function PaginaNoEncontrada() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <EstadoVacio
        icono={SearchX}
        titulo="No encontramos esta página"
        descripcion="Puede que el enlace sea incorrecto o que no tengas acceso a este contenido."
        accion={
          <Button asChild>
            <Link href={RUTAS.destino}>Ir al inicio</Link>
          </Button>
        }
        className="w-full max-w-lg"
      />
    </main>
  );
}
