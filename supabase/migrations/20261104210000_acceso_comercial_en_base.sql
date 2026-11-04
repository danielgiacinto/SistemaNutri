-- La membresía administrativa permite facturar aun con prueba o cuenta suspendida.
-- Las políticas y funciones clínicas existentes conservan un único guard central.
create function privado.es_miembro_administrativo(p_consultorio_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros_consultorio m
    where m.consultorio_id = p_consultorio_id and m.usuario_id = auth.uid());
$$;
create function privado.es_titular_administrativo(p_consultorio_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros_consultorio m
    where m.consultorio_id = p_consultorio_id and m.usuario_id = auth.uid() and m.rol = 'titular');
$$;
revoke all on function privado.es_miembro_administrativo(uuid), privado.es_titular_administrativo(uuid) from public, anon;
grant execute on function privado.es_miembro_administrativo(uuid), privado.es_titular_administrativo(uuid) to authenticated;

create or replace function public.estado_acceso_comercial(p_consultorio_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_estado public.estado_consultorio; v_vence timestamptz; v_cobertura timestamptz;
  v_gracia integer; v_rechazo timestamptz; v_base timestamptz;
begin
  if not privado.es_miembro_administrativo(p_consultorio_id) and not privado.es_superadmin() then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  select c.estado into v_estado from public.consultorios c where c.id = p_consultorio_id;
  if v_estado is distinct from 'activo' then return 'suspendido_admin'; end if;
  select p.vence_en into v_vence from public.pruebas_profesionales p where p.consultorio_id = p_consultorio_id;
  select s.cobertura_hasta into v_cobertura from public.suscripciones s where s.consultorio_id = p_consultorio_id;
  select c.dias_gracia into v_gracia from public.configuracion_comercial c where c.id;
  if v_cobertura > now() then return 'activo'; end if;
  if v_vence > now() then return 'prueba'; end if;
  v_base := greatest(v_cobertura, v_vence);
  select max(pg.cobrado_en) into v_rechazo from public.pagos_suscripcion pg
    join public.suscripciones s on s.id = pg.suscripcion_id
    where s.consultorio_id = p_consultorio_id and pg.estado = 'rechazado'
      and pg.cobrado_en >= v_base - interval '1 day';
  if v_rechazo is not null and v_base + make_interval(days => coalesce(v_gracia, 7)) > now() then return 'gracia'; end if;
  return 'vencido';
end;
$$;

create or replace function privado.es_miembro_consultorio(p_consultorio_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.es_miembro_administrativo(p_consultorio_id) then return false; end if;
  return public.estado_acceso_comercial(p_consultorio_id) in ('prueba', 'activo', 'gracia');
end;
$$;
create or replace function privado.es_titular_consultorio(p_consultorio_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select privado.es_titular_administrativo(p_consultorio_id) and privado.es_miembro_consultorio(p_consultorio_id);
$$;

alter policy "consultorios: los miembros ven su consultorio" on public.consultorios
  using (privado.es_miembro_administrativo(id));
alter policy "pruebas: el consultorio ve la suya" on public.pruebas_profesionales
  using (privado.es_miembro_administrativo(consultorio_id) or (select privado.es_superadmin()));
alter policy "suscripciones: el consultorio ve la suya" on public.suscripciones
  using (privado.es_miembro_administrativo(consultorio_id) or (select privado.es_superadmin()));
alter policy "suscripciones: el titular la crea" on public.suscripciones
  with check (privado.es_titular_administrativo(consultorio_id));
alter policy "suscripciones: el titular la actualiza" on public.suscripciones
  using (privado.es_titular_administrativo(consultorio_id) or (select privado.es_superadmin()))
  with check (privado.es_titular_administrativo(consultorio_id) or (select privado.es_superadmin()));
alter policy "pagos: el consultorio ve los suyos" on public.pagos_suscripcion
  using (exists (select 1 from public.suscripciones s where s.id = pagos_suscripcion.suscripcion_id
    and (privado.es_miembro_administrativo(s.consultorio_id) or (select privado.es_superadmin()))));
alter policy "avisos: el consultorio ve los suyos" on public.avisos_comerciales
  using (privado.es_miembro_administrativo(consultorio_id) or (select privado.es_superadmin()));
alter policy "avisos: el consultorio los marca vistos" on public.avisos_comerciales
  using (privado.es_miembro_administrativo(consultorio_id)) with check (privado.es_miembro_administrativo(consultorio_id));

create function public.cambiar_estado_comercial_consultorio(p_consultorio_id uuid, p_suspendido boolean, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not privado.es_superadmin() then raise exception 'sin_permiso' using errcode = '42501'; end if;
  if p_motivo is null or char_length(btrim(p_motivo)) not between 5 and 500 then
    raise exception 'motivo_obligatorio' using errcode = 'P0001';
  end if;
  update public.consultorios set estado = case when p_suspendido then 'suspendido'::public.estado_consultorio else 'activo'::public.estado_consultorio end
    where id = p_consultorio_id and estado <> 'baja';
  if not found then raise exception 'consultorio_no_disponible' using errcode = 'P0001'; end if;
  perform privado.registrar_auditoria(case when p_suspendido then 'consultorio.suspendido' else 'consultorio.reactivado' end,
    'consultorios', p_consultorio_id::text, p_consultorio_id, jsonb_build_object('motivo', btrim(p_motivo)));
end;
$$;
revoke all on function public.cambiar_estado_comercial_consultorio(uuid, boolean, text) from public, anon;
grant execute on function public.cambiar_estado_comercial_consultorio(uuid, boolean, text) to authenticated;

-- Los pacientes conservan lectura de lo ya compartido; una suspensión deja la
-- comunidad en solo lectura. Sus políticas existentes siguen protegiendo cada grupo.
create function privado.validar_escritura_comunidad_habilitada()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_estado text;
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  if tg_op = 'DELETE' then v_id := old.consultorio_id;
  else select d.consultorio_id into v_id from public.desafios d where d.id = new.desafio_id; end if;
  select case when c.estado <> 'activo' then 'bloqueado'
    when greatest(p.vence_en, s.cobertura_hasta) > now() then 'habilitado'
    when greatest(p.vence_en, s.cobertura_hasta) + make_interval(days => coalesce(cfg.dias_gracia, 7)) > now()
      and exists(select 1 from public.pagos_suscripcion pg where pg.suscripcion_id = s.id and pg.estado = 'rechazado'
        and pg.cobrado_en >= greatest(p.vence_en, s.cobertura_hasta) - interval '1 day') then 'habilitado'
    else 'bloqueado' end into v_estado
    from public.consultorios c left join public.pruebas_profesionales p on p.consultorio_id = c.id
    left join public.suscripciones s on s.consultorio_id = c.id cross join public.configuracion_comercial cfg where c.id = v_id;
  if v_estado is distinct from 'habilitado' then raise exception 'acceso_comercial_restringido' using errcode = '42501'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function privado.validar_escritura_comunidad_habilitada() from public, anon, authenticated;
create trigger comunidad_habilitada before insert or update or delete on public.participaciones_desafio
  for each row execute function privado.validar_escritura_comunidad_habilitada();
create trigger comunidad_habilitada before insert or update or delete on public.actividades_comunidad
  for each row execute function privado.validar_escritura_comunidad_habilitada();
