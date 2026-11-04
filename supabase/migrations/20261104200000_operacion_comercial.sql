-- Conciliación recuperable y cancelación solicitada por el titular.
alter table public.suscripciones
  add column conciliacion_intento_en timestamptz,
  add column conciliada_en timestamptz,
  add column conciliacion_error text,
  add column conciliacion_cursor integer not null default 0 check (conciliacion_cursor >= 0),
  add column cancelacion_solicitada_en timestamptz,
  add column cancelacion_motivo text;

create index suscripciones_pendientes_conciliacion
  on public.suscripciones (conciliacion_intento_en nulls first, id) where mp_id is not null;

-- Estas columnas no se conceden para escritura al rol authenticated.
create function public.reclamar_conciliaciones(p_limite integer default 5)
returns table(id uuid, mp_id text, conciliacion_cursor integer, conciliacion_intento_en timestamptz)
language sql security definer set search_path = '' as $$
  with elegidas as (
    select s.id from public.suscripciones s
    where s.mp_id is not null and
      (s.conciliacion_intento_en is null or s.conciliacion_intento_en < now() - interval '10 minutes')
    order by s.conciliacion_intento_en nulls first, s.id
    limit least(greatest(p_limite, 1), 20) for update skip locked
  )
  update public.suscripciones s set conciliacion_intento_en = now()
  from elegidas e where s.id = e.id
  returning s.id, s.mp_id, s.conciliacion_cursor, s.conciliacion_intento_en;
$$;
revoke all on function public.reclamar_conciliaciones(integer) from public, anon, authenticated;
grant execute on function public.reclamar_conciliaciones(integer) to service_role;

create function public.solicitar_cancelacion_suscripcion(p_motivo text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_suscripcion public.suscripciones%rowtype;
begin
  if p_motivo is null or char_length(btrim(p_motivo)) not between 5 and 500 then
    raise exception 'motivo_obligatorio' using errcode = 'P0001';
  end if;
  select s.* into v_suscripcion from public.suscripciones s
  join public.miembros_consultorio m on m.consultorio_id = s.consultorio_id
  where m.usuario_id = auth.uid() and m.rol = 'titular' for update of s;
  if not found or v_suscripcion.mp_id is null then
    raise exception 'suscripcion_inexistente' using errcode = 'P0001';
  end if;
  if v_suscripcion.estado_mp <> 'cancelled' and v_suscripcion.cancelacion_solicitada_en is null then
    update public.suscripciones set cancelacion_solicitada_en = now(), cancelacion_motivo = btrim(p_motivo)
    where id = v_suscripcion.id;
    perform privado.registrar_auditoria('suscripcion.cancelacion_solicitada', 'suscripciones',
      v_suscripcion.id::text, v_suscripcion.consultorio_id, jsonb_build_object('motivo', btrim(p_motivo)));
  end if;
  return v_suscripcion.mp_id;
end;
$$;
revoke all on function public.solicitar_cancelacion_suscripcion(text) from public, anon;
grant execute on function public.solicitar_cancelacion_suscripcion(text) to authenticated;

-- El vencimiento de un mes calendario no depende de TimeZone ni del DST de la sesión.
create or replace function privado.sumar_periodo(p_inicio timestamptz, p_cantidad integer, p_unidad text)
returns timestamptz language sql immutable set search_path = '' as $$
  select ((p_inicio at time zone 'UTC') + case p_unidad when 'dias' then make_interval(days => p_cantidad)
    else make_interval(months => p_cantidad) end) at time zone 'UTC';
$$;

-- La fecha del ciclo viene de la factura consultada por el servidor. Un evento
-- atrasado no puede sumar un mes al final de una cobertura ya más reciente.
drop function public.registrar_pago_verificado(text, text, text, numeric, text, timestamptz);
create function public.registrar_pago_verificado(
  p_mp_suscripcion text, p_mp_pago text, p_estado text, p_monto numeric,
  p_moneda text, p_cobrado_en timestamptz, p_inicio_periodo timestamptz default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_suscripcion public.suscripciones%rowtype; v_pago public.pagos_suscripcion%rowtype;
begin
  if p_estado not in ('aprobado', 'rechazado', 'pendiente', 'devuelto') or p_monto is null or p_monto < 0 then
    raise exception 'pago_invalido' using errcode = 'P0001';
  end if;
  select * into v_suscripcion from public.suscripciones where mp_id = p_mp_suscripcion for update;
  if not found then raise exception 'suscripcion_inexistente' using errcode = 'P0001'; end if;
  insert into public.pagos_suscripcion (suscripcion_id, mp_pago_id, estado, monto, moneda, cobrado_en)
    values (v_suscripcion.id, p_mp_pago, p_estado, p_monto, p_moneda, p_cobrado_en)
    on conflict (mp_pago_id) do nothing;
  select * into v_pago from public.pagos_suscripcion where mp_pago_id = p_mp_pago for update;
  if v_pago.suscripcion_id <> v_suscripcion.id then
    raise exception 'pago_de_otra_suscripcion' using errcode = 'P0001';
  end if;
  if v_pago.estado = 'devuelto' or (v_pago.estado = 'aprobado' and p_estado in ('pendiente', 'rechazado')) then return; end if;
  update public.pagos_suscripcion set estado = p_estado, monto = p_monto, moneda = p_moneda, cobrado_en = p_cobrado_en
    where id = v_pago.id;
  if p_estado = 'aprobado' and p_moneda = v_suscripcion.moneda and p_monto >= v_suscripcion.precio
    and p_cobrado_en is not null and v_pago.periodo_hasta is null then
    update public.pagos_suscripcion
      set periodo_desde = coalesce(p_inicio_periodo, p_cobrado_en),
          periodo_hasta = privado.sumar_periodo(coalesce(p_inicio_periodo, p_cobrado_en), 1, 'meses')
      where id = v_pago.id;
  end if;
  update public.suscripciones s set
    cobertura_hasta = (select max(p.periodo_hasta) from public.pagos_suscripcion p
      where p.suscripcion_id = s.id and p.estado = 'aprobado' and p.periodo_hasta is not null),
    ultimo_cobro_en = (select max(p.cobrado_en) from public.pagos_suscripcion p
      where p.suscripcion_id = s.id and p.estado = 'aprobado' and p.periodo_hasta is not null),
    actualizado_en = now()
    where s.id = v_suscripcion.id;
end;
$$;
revoke all on function public.registrar_pago_verificado(text, text, text, numeric, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.registrar_pago_verificado(text, text, text, numeric, text, timestamptz, timestamptz) to service_role;

-- Solicitar una cancelación no inventa un estado del proveedor. El cambio de
-- checkout solo se permite después de una cancelación confirmada (o un pendiente sin cobertura).
create or replace function privado.validar_checkout_suscripcion()
returns trigger language plpgsql set search_path = '' as $$
declare v_precio numeric;
begin
  if current_user = 'authenticated' then
    if new.estado_mp <> 'pending' or new.mp_id is null or new.moneda <> 'ARS' then
      raise exception 'checkout_invalido' using errcode = '42501';
    end if;
    select c.precio_mensual into v_precio from public.configuracion_comercial c where c.id;
    if v_precio is null or new.precio is distinct from v_precio then
      raise exception 'precio_desactualizado' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and old.estado_mp in ('authorized', 'paused') then
      raise exception 'cancelacion_pendiente' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and old.mp_id is distinct from new.mp_id then
      if old.mp_id is not null and ((old.cancelacion_solicitada_en is not null and old.estado_mp <> 'cancelled') or old.estado_mp in ('authorized', 'paused') or
        (old.estado_mp = 'pending' and old.cobertura_hasta is not null)) then
        raise exception 'cancelacion_pendiente' using errcode = '42501';
      end if;
      new.cancelacion_solicitada_en := null; new.cancelacion_motivo := null;
      new.cancelada_en := null; new.mp_actualizado_en := null; new.proximo_cobro_en := null;
      new.conciliacion_cursor := 0; new.conciliada_en := null; new.conciliacion_error := null;
      new.conciliacion_intento_en := null;
    end if;
  end if;
  return new;
end;
$$;

create function public.resumen_comercial()
returns table(profesionales bigint, en_prueba bigint, cobertura_paga bigint, por_vencer bigint,
  pruebas_vencidas bigint, canceladas bigint, cobros_por_resolver bigint, ingreso_mes numeric)
language plpgsql stable security definer set search_path = '' as $$
declare v_inicio timestamptz;
begin
  if not privado.es_superadmin() then raise exception 'sin_permiso' using errcode = '42501'; end if;
  v_inicio := date_trunc('month', now() at time zone 'America/Argentina/Cordoba') at time zone 'America/Argentina/Cordoba';
  return query select
    (select count(*) from public.perfiles p where p.tipo_cuenta = 'profesional'),
    (select count(*) from public.pruebas_profesionales p join public.consultorios c on c.id = p.consultorio_id where p.vence_en > now() and c.estado = 'activo'),
    (select count(*) from public.suscripciones s join public.consultorios c on c.id = s.consultorio_id where s.cobertura_hasta > now() and c.estado = 'activo'),
    (select count(*) from public.pruebas_profesionales p where p.vence_en > now() and p.vence_en <= now() + interval '7 days'),
    (select count(*) from public.pruebas_profesionales p left join public.suscripciones s on s.consultorio_id = p.consultorio_id where p.vence_en <= now() and (s.cobertura_hasta is null or s.cobertura_hasta <= now())),
    (select count(*) from public.suscripciones s where s.estado_mp = 'cancelled'),
    (select count(*) from public.suscripciones s where (select p.estado from public.pagos_suscripcion p where p.suscripcion_id = s.id order by coalesce(p.cobrado_en, p.creado_en) desc, p.id desc limit 1) in ('rechazado', 'pendiente')),
    (select coalesce(sum(p.monto), 0) from public.pagos_suscripcion p where p.estado = 'aprobado' and p.periodo_hasta is not null and p.cobrado_en >= v_inicio and p.cobrado_en < privado.sumar_periodo(v_inicio, 1, 'meses'));
end;
$$;
revoke all on function public.resumen_comercial() from public, anon;
grant execute on function public.resumen_comercial() to authenticated;
