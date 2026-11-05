import { consultarFinanzas } from '@/servicios/finanzas';
import type { ClienteSupabase } from '@/lib/supabase/servidor';
import { movimientosEfectivos } from '@/tipos/finanzas';
import { GraficoIngresos } from './grafico-ingresos';
export async function ResumenFinanciero({cliente,zona}:{cliente:ClienteSupabase;zona:string}) {
  const datos=await consultarFinanzas(cliente);
  const ingresos=movimientosEfectivos(datos).filter(m=>m.tipo==='ingreso'&&m.moneda==='ARS').map(m=>({fecha:m.fecha,importe:m.importe}));
  return <GraficoIngresos movimientos={ingresos} ahora={datos.ahora} zona={zona}/>;
}
