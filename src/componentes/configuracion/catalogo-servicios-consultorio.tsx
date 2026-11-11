import { requerirProfesional } from "@/autorizacion/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { leerNotaPrecios, listarServicios } from "@/servicios/finanzas";
import { CatalogoServicios } from "./catalogo-servicios";

export async function CatalogoServiciosConsultorio() {
  await requerirProfesional();
  const cliente = await crearClienteServidor();
  const [servicios, notaPrecios] = await Promise.all([listarServicios(cliente), leerNotaPrecios(cliente)]);
  return <CatalogoServicios servicios={servicios} notaPrecios={notaPrecios} />;
}
