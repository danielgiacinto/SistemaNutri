import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { listarServicios } from "@/servicios/finanzas";
import { CatalogoServicios } from "./catalogo-servicios";

export async function CatalogoServiciosConsultorio() {
  await requerirProfesional();
  const servicios = await listarServicios(await crearClienteServidor());
  return <CatalogoServicios servicios={servicios} />;
}
