import { Suspense } from 'react';
import { requerirProfesional } from '@/autorizacion/sesion';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { consultarFinanzas, leerNotaPrecios } from '@/servicios/finanzas';
import { PanelFinanzas } from '@/componentes/finanzas/panel-finanzas';
import { EncabezadoPagina } from '@/componentes/comunes/encabezado-pagina';
import { Skeleton } from '@/componentes/ui/skeleton';
export const metadata={title:'Finanzas del consultorio'};
export default function PaginaFinanzas() {return <Suspense fallback={<Skeleton className="h-96"/>}><Contenido/></Suspense>;}
async function Contenido() {
  const contexto=await requerirProfesional();const cliente=await crearClienteServidor();const [datos,notaPrecios]=await Promise.all([consultarFinanzas(cliente),leerNotaPrecios(cliente)]);
  return <div className="space-y-6"><EncabezadoPagina titulo="Finanzas del consultorio" descripcion="Tus cobros y movimientos, en un solo lugar."/><PanelFinanzas datos={datos} zona={contexto.consultorio.zonaHoraria} notaPrecios={notaPrecios}/></div>;
}
