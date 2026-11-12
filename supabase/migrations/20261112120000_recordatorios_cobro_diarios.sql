-- La frecuencia automática queda fija. La columna plazos se conserva por
-- compatibilidad con gestionar_finanzas, pero ya no interviene en los envíos.
-- El cron de Vercel mantiene su ejecución diaria y su lote actual.
update public.recordatorios_cobro set estado='cancelado'
where clave like 'automatico-%' and estado in ('pendiente','fallido');

create or replace function public.preparar_recordatorios_cobro() returns void language plpgsql security definer set search_path='' as $$
begin
 -- Un único aviso por consulta y día de Argentina, sin recuperar días omitidos.
 insert into public.recordatorios_cobro(operacion_id,consultorio_id,profesional_id,clave,programado_en)
 select o.id,o.consultorio_id,o.profesional_id,
   'automatico-diario-'||(now() at time zone 'America/Argentina/Buenos_Aires')::date,now()
 from public.operaciones_consultorio o join public.turnos t on t.id=o.turno_id
 join public.configuracion_financiera c on c.profesional_id=o.profesional_id
 join public.consentimientos_cobro a on a.paciente_id=o.paciente_id and a.profesional_id=o.profesional_id
 where c.recordatorios and a.autorizado and t.estado='completado' and t.atendido_en<=now() and t.fin<=now()
 and o.original-o.descuento-o.abonado>0
 and not exists (
   select 1 from public.recordatorios_cobro previo where previo.operacion_id=o.id and previo.clave like 'automatico-%'
   and (previo.estado='enviado' and (previo.enviado_en at time zone 'America/Argentina/Buenos_Aires')::date=(now() at time zone 'America/Argentina/Buenos_Aires')::date
     or previo.estado in ('enviando','incierto') and (previo.reclamado_en at time zone 'America/Argentina/Buenos_Aires')::date=(now() at time zone 'America/Argentina/Buenos_Aires')::date)
 )
 on conflict(operacion_id,clave) do nothing;
 -- Un proceso que murió durante SMTP requiere revisión; no se reenvía a ciegas.
 with abandonados as (update public.recordatorios_cobro set estado='incierto' where estado='enviando' and reclamado_en < now()-interval '15 minutes' returning *)
 insert into public.intentos_recordatorio_cobro(recordatorio_id,consultorio_id,profesional_id,resultado) select id,consultorio_id,profesional_id,'incierto' from abandonados;
 update public.recordatorios_cobro r set estado='cancelado' from public.operaciones_consultorio o,public.turnos t,public.configuracion_financiera c
 where r.operacion_id=o.id and t.id=o.turno_id and c.profesional_id=o.profesional_id and r.estado in ('pendiente','fallido')
 and (o.original-o.descuento-o.abonado<=0 or t.estado<>'completado' or (r.clave like 'automatico-%' and (not c.recordatorios or r.clave <> 'automatico-diario-'||(now() at time zone 'America/Argentina/Buenos_Aires')::date))
 or not exists(select 1 from public.consentimientos_cobro a where a.paciente_id=o.paciente_id and a.profesional_id=o.profesional_id and a.autorizado));
end $$;

revoke all on function public.preparar_recordatorios_cobro() from public,anon,authenticated;
grant execute on function public.preparar_recordatorios_cobro() to service_role;
