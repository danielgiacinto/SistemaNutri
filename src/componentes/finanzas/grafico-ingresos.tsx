'use client';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/componentes/ui/card';
import { agruparIngresos, type PeriodoIngresos } from '@/lib/ingresos';
import { dineroFinanzas } from '@/tipos/finanzas';
import { cn } from '@/lib/utilidades';

export function GraficoIngresos({movimientos,ahora,zona}:{movimientos:{fecha:string;importe:number}[];ahora:string;zona:string}) {
  const [periodo,fijarPeriodo]=useState<PeriodoIngresos>('mes');
  const puntos=agruparIngresos(movimientos,ahora,zona,periodo);
  const total=puntos.reduce((s,p)=>s+Math.round(p.importe*100),0)/100;
  return <Card className="min-w-0">
    <CardHeader className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Ingresos del consultorio</CardTitle>
        <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Período de ingresos">
          {([['dia','Día'],['semana','Semana'],['mes','Mes']] as const).map(([valor,etiqueta])=><button key={valor} type="button" aria-pressed={periodo===valor} onClick={()=>fijarPeriodo(valor)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring',periodo===valor?'bg-card text-foreground shadow-sm':'text-muted-foreground hover:text-foreground')}>{etiqueta}</button>)}
        </div>
      </div>
      <div><p className="text-3xl font-semibold tracking-tight tabular-nums">{dineroFinanzas(total,'ARS')}</p><CardDescription>{periodo==='dia'?'Hoy, por hora':periodo==='semana'?'Últimos 7 días':'Últimos 12 meses'} · ingresos recibidos</CardDescription></div>
    </CardHeader>
    <CardContent>
      <div className="h-56 min-w-0" role="img" aria-label={`Ingresos por ${periodo==='dia'?'hora':periodo==='semana'?'día':'mes'}`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}><LineChart data={puntos} margin={{top:12,right:12,left:0,bottom:0}}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3"/>
          <XAxis dataKey="etiqueta" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'var(--muted-foreground)'}} minTickGap={14}/>
          <YAxis width={48} axisLine={false} tickLine={false} tick={{fontSize:10,fill:'var(--muted-foreground)'}} tickFormatter={v=>Number(v)>=1000?`${Number(v)/1000} mil`:String(v)}/>
          <Tooltip formatter={v=>[dineroFinanzas(Number(v),'ARS'),'Ingresos']} labelFormatter={(_,filas)=>filas[0]?.payload?.clave??''} contentStyle={{background:'var(--popover)',borderColor:'var(--border)',borderRadius:12,color:'var(--popover-foreground)'}}/>
          <Line type="monotone" dataKey="importe" name="Ingresos" stroke="var(--primary)" strokeWidth={2.5} dot={false} activeDot={{r:4}} isAnimationActive={false}/>
        </LineChart></ResponsiveContainer>
      </div>
      {total===0&&<p className="mt-2 text-xs text-muted-foreground">Todavía no hay ingresos registrados en este período.</p>}
    </CardContent>
  </Card>;
}
