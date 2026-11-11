import { Suspense } from "react";
import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { DialogoRuta } from "@/componentes/comunes/dialogo-ruta";
import { DisponibilidadConsultorio } from "@/componentes/agenda/disponibilidad-consultorio";
import { EsqueletoGestionAgenda } from "@/componentes/agenda/esqueleto-gestion-agenda";

export const metadata: Metadata = { title: "Horarios y bloqueos" };

export default function PaginaDisponibilidadSuperpuesta() {
  return <DialogoRuta titulo="Horarios y bloqueos" descripcion="Organizá tus días de atención y los momentos en los que no estás disponible." icono={<Clock className="size-5" aria-hidden="true" />}>
    <Suspense fallback={<EsqueletoGestionAgenda />}><DisponibilidadConsultorio enDialogo /></Suspense>
  </DialogoRuta>;
}
