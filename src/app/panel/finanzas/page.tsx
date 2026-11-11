import { Suspense } from 'react';
import { requerirProfesional } from '@/autorizacion/sesion';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { consultarFinanzas } from '@/servicios/finanzas';
import { PanelFinanzas } from '@/componentes/finanzas/panel-finanzas';
import { EncabezadoPagina } from '@/componentes/comunes/encabezado-pagina';
import { Skeleton } from '@/componentes/ui/skeleton';
export const metadata={title:'Finanzas del consultorio'};
export default function PaginaFinanzas({searchParams}:PageProps<'/panel/finanzas'>) {return <Suspense fallback={<Skeleton className="h-96"/>}><Contenido parametros={searchParams}/></Suspense>;}
async function Contenido({parametros}:{parametros:PageProps<'/panel/finanzas'>['searchParams']}) {
  const contexto=await requerirProfesional();const cliente=await crearClienteServidor();const datos=await consultarFinanzas(cliente);const filtros=await parametros;
  return <div className="space-y-6"><EncabezadoPagina titulo="Finanzas del consultorio" descripcion="Cobros a pacientes y movimientos de caja."/><PanelFinanzas datos={datos} zona={contexto.consultorio.zonaHoraria} vistaInicial={filtros.vista==='movimientos'?'movimientos':'cobros'}/></div>;
}
