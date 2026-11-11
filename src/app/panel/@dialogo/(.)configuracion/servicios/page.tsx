import { Suspense } from "react";
import type { Metadata } from "next";
import { Tags } from "lucide-react";
import { DialogoRuta } from "@/componentes/comunes/dialogo-ruta";
import { CatalogoServiciosConsultorio } from "@/componentes/configuracion/catalogo-servicios-consultorio";
import { EsqueletoGestionAgenda } from "@/componentes/agenda/esqueleto-gestion-agenda";

export const metadata: Metadata = { title: "Servicios y precios" };

export default function PaginaServiciosSuperpuesta() {
  return <DialogoRuta titulo="Servicios y precios" descripcion="Tus prestaciones, precios y duración. Los turnos existentes conservan su importe original." compacto icono={<Tags className="size-5" aria-hidden="true" />}>
    <Suspense fallback={<EsqueletoGestionAgenda />}><CatalogoServiciosConsultorio /></Suspense>
  </DialogoRuta>;
}
