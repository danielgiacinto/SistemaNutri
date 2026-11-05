import { describe, expect, it } from 'vitest';
import { agruparIngresos } from '@/lib/ingresos';
const zona='America/Argentina/Buenos_Aires';
const ahora='2026-11-05T19:00:00Z';
describe('gráfico de ingresos',()=>{
  it('agrupa el día por hora local y completa las horas sin ingresos',()=>{
    const puntos=agruparIngresos([{fecha:'2026-11-05T02:00:00Z',importe:50},{fecha:'2026-11-05T19:00:00Z',importe:0.1},{fecha:'2026-11-05T19:30:00Z',importe:0.2}],ahora,zona,'dia');
    expect(puntos).toHaveLength(24);expect(puntos[16].importe).toBe(0.3);expect(puntos.reduce((s,p)=>s+p.importe,0)).toBe(0.3);
  });
  it('incluye siete días y excluye movimientos fuera del período',()=>{
    const puntos=agruparIngresos([{fecha:'2026-10-29T12:00:00Z',importe:100},{fecha:'2026-10-30T12:00:00Z',importe:25}],ahora,zona,'semana');
    expect(puntos).toHaveLength(7);expect(puntos[0].clave).toBe('2026-10-30');expect(puntos[0].importe).toBe(25);
  });
  it('ordena doce meses cruzando el año y conserva ingresos de cada mes',()=>{
    const puntos=agruparIngresos([{fecha:'2025-12-15T12:00:00Z',importe:100},{fecha:'2026-11-01T12:00:00Z',importe:200}],ahora,zona,'mes');
    expect(puntos[0].clave).toBe('2025-12');expect(puntos[11].clave).toBe('2026-11');expect(puntos[0].importe).toBe(100);expect(puntos[11].importe).toBe(200);
  });
});
