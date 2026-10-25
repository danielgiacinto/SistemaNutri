import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarEvolucionesRecientes } from "@/servicios/evoluciones";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { EstadoVacio } from "@/componentes/comunes/estado-vacio";
import { nombreNatural } from "@/lib/antropometria";
import { formatearFechaHora } from "@/lib/fechas";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Historias clínicas" };

export default function PaginaHistorias() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const contexto = await requerirProfesional();
  const cliente = await crearClienteServidor();
  const evoluciones = await listarEvolucionesRecientes(cliente, contexto.consultorio.id, 30);

  return (
    <div className="space-y-8">
      <EncabezadoPagina titulo="Historias clínicas" descripcion="Evoluciones publicadas recientemente en tu consultorio." />
      {evoluciones.length === 0 ? (
        <EstadoVacio
          icono={ClipboardList}
          titulo="Todavía no hay evoluciones publicadas"
          descripcion="Abrí la ficha de un paciente y registrá la primera nota clínica."
        />
      ) : (
        <ul className="divide-y rounded-2xl border">
          {evoluciones.map((evolucion) => (
            <li key={evolucion.id} className="px-4 py-3">
              <Link href={`/panel/pacientes/${evolucion.paciente_id}/historia/${evolucion.id}`} className="block hover:text-primary">
                <p className="font-medium">{evolucion.titulo || "Evolución clínica"}</p>
                <p className="text-sm text-muted-foreground">
                  {evolucion.pacientes ? nombreNatural(evolucion.pacientes) : "Paciente"} ·{" "}
                  {formatearFechaHora(new Date(evolucion.actualizado_en), contexto.consultorio.zonaHoraria)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
