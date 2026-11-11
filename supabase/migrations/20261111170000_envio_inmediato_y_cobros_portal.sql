-- Envío inmediato: solo reclama un aviso del profesional autenticado.
create function public.reclamar_recordatorio_manual(p_turno uuid,p_clave uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.operaciones_consultorio; r public.recordatorios_cobro;
begin
 -- Mismo orden de bloqueo que los pagos: primero turno, después operación.
 perform 1 from public.turnos where id=p_turno and profesional_id=auth.uid() and privado.es_miembro_consultorio(consultorio_id) for update;
 if not found then raise exception 'sin_permiso'; end if;
 select op.* into o from public.operaciones_consultorio op join public.turnos t on t.id=op.turno_id
 where op.turno_id=p_turno and op.profesional_id=auth.uid() and privado.es_miembro_consultorio(op.consultorio_id) for update of op;
 if not found then raise exception 'sin_permiso'; end if;
 if not exists(select 1 from public.turnos where id=p_turno and estado='completado' and fin<=now()) then raise exception 'consulta_no_atendida'; end if;
 select * into r from public.recordatorios_cobro where operacion_id=o.id and clave='manual-'||p_clave::text for update;
 if found then return jsonb_build_object('id',r.id,'reclamado_en',r.reclamado_en,'estado',r.estado); end if;
 if exists(select 1 from public.recordatorios_cobro where operacion_id=o.id and clave like 'manual-%' and programado_en>now()-interval '1 minute') then raise exception 'esperar_recordatorio'; end if;
 perform public.gestionar_finanzas('recordatorio',jsonb_build_object('turno',p_turno,'clave',p_clave));
 update public.recordatorios_cobro set estado='enviando',reclamado_en=now(),intentos=1
 where operacion_id=o.id and clave='manual-'||p_clave::text returning * into r;
 return jsonb_build_object('id',r.id,'reclamado_en',r.reclamado_en,'estado','reclamado');
end $$;
revoke all on function public.reclamar_recordatorio_manual(uuid,uuid) from public,anon;
grant execute on function public.reclamar_recordatorio_manual(uuid,uuid) to authenticated;

-- Solo expone el resumen económico de consultas propias ya atendidas.
create function public.consultar_mis_cobros() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('turno_id',t.id,'original',o.original,'descuento',o.descuento,'abonado',o.abonado,'moneda',o.moneda,'bonificado',o.bonificado)),'[]'::jsonb)
 from public.operaciones_consultorio o join public.turnos t on t.id=o.turno_id and t.consultorio_id=o.consultorio_id
 join public.pacientes p on p.id=o.paciente_id and p.consultorio_id=o.consultorio_id
 where p.usuario_id=auth.uid() and p.estado='activo' and t.estado='completado' and t.fin<=now();
$$;
revoke all on function public.consultar_mis_cobros() from public,anon;
grant execute on function public.consultar_mis_cobros() to authenticated;

create or replace function public.validar_recordatorio_cobro(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('turno_id',t.id,'correo',p.correo,'paciente',p.nombre,'consulta',t.inicio,'original',o.original,'abonado',o.abonado,'saldo',o.original-o.descuento-o.abonado,'moneda',o.moneda,'nombre_remitente',c.nombre_remitente,'instrucciones',c.instrucciones,'texto',c.texto_recordatorio,'zona',co.zona_horaria)
 from public.recordatorios_cobro r join public.operaciones_consultorio o on o.id=r.operacion_id join public.turnos t on t.id=o.turno_id join public.pacientes p on p.id=o.paciente_id
 join public.configuracion_financiera c on c.profesional_id=o.profesional_id join public.consultorios co on co.id=o.consultorio_id
 where r.id=p_id and r.estado='enviando' and t.estado='completado' and t.fin<=now() and o.original-o.descuento-o.abonado>0 and p.correo is not null
 and (r.clave like 'manual-%' or c.recordatorios) and exists(select 1 from public.consentimientos_cobro a where a.paciente_id=o.paciente_id and a.profesional_id=o.profesional_id and a.autorizado);
$$;
