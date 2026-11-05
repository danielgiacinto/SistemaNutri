import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/finanzas/recordatorios/route';
import { crearClienteServicio } from '@/lib/supabase/servicio';
import { despacharRecordatoriosCobro } from '@/servicios/recordatorios-cobro';
vi.mock('@/lib/supabase/servicio',()=>({crearClienteServicio:vi.fn()}));
vi.mock('@/servicios/recordatorios-cobro',()=>({despacharRecordatoriosCobro:vi.fn()}));
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('CRON_SECRET','secreto');vi.mocked(crearClienteServicio).mockReturnValue({} as never);vi.mocked(despacharRecordatoriosCobro).mockResolvedValue({configurado:true,enviados:1,fallidos:0});});
afterEach(()=>vi.unstubAllEnvs());
const peticion=(secreto='')=>new NextRequest('https://ejemplo.test/api/finanzas/recordatorios',{headers:{authorization:secreto}});
describe('cron de cobros',()=>{
 it('rechaza accesos sin secreto antes de acceder a datos',async()=>{expect((await GET(peticion())).status).toBe(401);expect((await GET(peticion('Bearer otro'))).status).toBe(401);expect(crearClienteServicio).not.toHaveBeenCalled();});
 it('ejecuta sin depender de Mercado Pago y comunica fallas',async()=>{expect((await GET(peticion('Bearer secreto'))).status).toBe(200);vi.mocked(despacharRecordatoriosCobro).mockResolvedValue({configurado:true,enviados:0,fallidos:1});expect((await GET(peticion('Bearer secreto'))).status).toBe(503);});
});
