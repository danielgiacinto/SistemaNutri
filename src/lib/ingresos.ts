import { agregarDias, hoyEnZona, partesEnZona } from '@/lib/fechas';
export type PeriodoIngresos='dia'|'semana'|'mes';
export function agruparIngresos(movimientos:{fecha:string;importe:number}[],ahora:string,zona:string,periodo:PeriodoIngresos) {
  const hoy=hoyEnZona(zona,new Date(ahora));
  const [anio,mes]=hoy.split('-').map(Number);
  const claves=periodo==='dia'?Array.from({length:24},(_,h)=>`${hoy}T${String(h).padStart(2,'0')}`)
    :periodo==='semana'?Array.from({length:7},(_,i)=>agregarDias(hoy,i-6))
    :Array.from({length:12},(_,i)=>new Date(Date.UTC(anio,mes-12+i,1)).toISOString().slice(0,7));
  const centavos=new Map(claves.map(clave=>[clave,0]));
  for(const movimiento of movimientos) {
    const instante=new Date(movimiento.fecha);
    const fecha=hoyEnZona(zona,instante);
    const clave=periodo==='dia'?`${fecha}T${String(partesEnZona(instante,zona).hora).padStart(2,'0')}`:periodo==='semana'?fecha:fecha.slice(0,7);
    if(centavos.has(clave))centavos.set(clave,centavos.get(clave)!+Math.round(movimiento.importe*100));
  }
  return claves.map(clave=>({clave,etiqueta:periodo==='dia'?`${clave.slice(-2)} h`:periodo==='semana'?`${clave.slice(8)}/${clave.slice(5,7)}`:new Intl.DateTimeFormat('es-AR',{month:'short',timeZone:'UTC'}).format(new Date(clave+'-01T12:00:00Z')),importe:centavos.get(clave)!/100}));
}
