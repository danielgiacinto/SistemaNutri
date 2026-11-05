import { Suspense } from 'react';
import { requerirPacienteDelConsultorio } from '@/autorizacion/clinica';
import { consultarFinanzas } from '@/servicios/finanzas';
import { PanelFinanzas } from '@/componentes/finanzas/panel-finanzas';
import { Skeleton } from '@/componentes/ui/skeleton';
export const metadata={title:'Pagos y deudas'};
export default function PaginaPagosPaciente({params}:PageProps<'/panel/pacientes/[pacienteId]/pagos'>) {return <Suspense fallback={<Skeleton className="h-96"/>}><Contenido parametros={params}/></Suspense>;}
async function Contenido({parametros}:{parametros:PageProps<'/panel/pacientes/[pacienteId]/pagos'>['params']}) {
  const {pacienteId}=await parametros;const {contexto,cliente}=await requerirPacienteDelConsultorio(pacienteId);const datos=await consultarFinanzas(cliente,{p_paciente:pacienteId});
  return <PanelFinanzas datos={datos} pacienteId={pacienteId} zona={contexto.consultorio.zonaHoraria}/>;
}
