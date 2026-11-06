import { Suspense } from "react";
import type { Metadata } from "next";
import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarServicios } from "@/servicios/finanzas";
import { CatalogoServicios } from "@/componentes/configuracion/catalogo-servicios";
import { EncabezadoPagina } from "@/componentes/comunes/encabezado-pagina";
import { Skeleton } from "@/componentes/ui/skeleton";

export const metadata: Metadata = { title: "Servicios y precios" };

export default function PaginaServicios() {
  return <div className="space-y-6">
    <EncabezadoPagina titulo="Servicios y precios" descripcion="Definí las prestaciones que ofrecés en tus turnos, su precio y duración. Podés usar el mismo precio en distintos servicios o dejarlos sin cargo." volverA="/panel/configuracion" etiquetaVolver="Configuración" />
    <Suspense fallback={<Skeleton className="h-64" />}><ContenidoServicios /></Suspense>
  </div>;
}

async function ContenidoServicios() {
  await requerirProfesional();
  const servicios = await listarServicios(await crearClienteServidor());
  return <CatalogoServicios servicios={servicios} />;
}
