-- =============================================================================
-- Fase 5 — Prueba gratuita y suscripción.
--
-- Un mes se suma en UTC con la aritmética de calendario de PostgreSQL:
-- el 31 de enero más un mes cae en el último día de febrero, no a los 30 días.
-- La prueba vive solo en esta base. Mercado Pago no tiene una prueba aparte:
-- el primer cobro se pide para la fecha en que vence la nuestra.
-- Cambiar la configuración global no toca las pruebas ya concedidas.
-- =============================================================================

create table public.configuracion_comercial (
  id boolean primary key default true check (id),
  prueba_cantidad integer not null default 1 check (prueba_cantidad between 1 and 36),
  prueba_unidad text not null default 'meses' check (prueba_unidad in ('dias', 'meses')),
  precio_mensual numeric(12, 2) check (precio_mensual is null or precio_mensual > 0),
  moneda text not null default 'ARS' check (moneda = 'ARS'),
  dias_gracia integer not null default 7 check (dias_gracia between 0 and 30),
  pruebas_habilitadas boolean not null default true,
  actualizado_en timestamptz not null default now()
);

insert into public.configuracion_comercial (id) values (true);

comment on table public.configuracion_comercial is
  'Una sola fila. El precio nulo significa que todavía no se puede cobrar.';

create table public.pruebas_profesionales (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid unique references auth.users (id) on delete set null,
  consultorio_id uuid unique references public.consultorios (id) on delete cascade,
  correo text not null,
  inicio timestamptz not null,
  vence_en timestamptz not null,
  cantidad integer not null,
  unidad text not null check (unidad in ('dias', 'meses')),
  creado_en timestamptz not null default now(),
  unique (correo)
);

comment on table public.pruebas_profesionales is
  'Una prueba por correo. Si la cuenta se borra, el correo queda para no repetir la prueba.';

create table public.suscripciones (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null unique references public.consultorios (id) on delete cascade,
  mp_id text unique,
  estado_mp text not null default 'sin_autorizar'
    check (estado_mp in ('sin_autorizar', 'pending', 'authorized', 'paused', 'cancelled')),
  precio numeric(12, 2) not null check (precio > 0),
  moneda text not null default 'ARS',
  cobertura_hasta timestamptz,
  ultimo_cobro_en timestamptz,
  proximo_cobro_en timestamptz,
  mp_actualizado_en timestamptz,
  cancelada_en timestamptz,
  actualizado_en timestamptz not null default now()
);

comment on column public.suscripciones.estado_mp is
  'Autorización recurrente en Mercado Pago. No indica que un cobro esté pagado.';
comment on column public.suscripciones.cobertura_hasta is
  'Hasta cuándo un cobro aprobado habilita el acceso. No se extiende por un intento de cobro.';

create table public.pagos_suscripcion (
  id uuid primary key default gen_random_uuid(),
  suscripcion_id uuid not null references public.suscripciones (id) on delete cascade,
  mp_pago_id text not null unique,
  estado text not null check (estado in ('aprobado', 'rechazado', 'pendiente', 'devuelto')),
  monto numeric(12, 2) not null check (monto >= 0),
  moneda text not null,
  cobrado_en timestamptz,
  periodo_desde timestamptz,
  periodo_hasta timestamptz,
  creado_en timestamptz not null default now()
);

create table public.eventos_proveedor (
  id uuid primary key default gen_random_uuid(),
  proveedor text not null default 'mercadopago',
  id_evento text not null,
  tipo text not null,
  recurso_id text,
  procesado_en timestamptz,
  error text,
  creado_en timestamptz not null default now(),
  unique (proveedor, id_evento)
);

create table public.avisos_comerciales (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios (id) on delete cascade,
  codigo text not null check (char_length(codigo) between 1 and 80),
  creado_en timestamptz not null default now(),
  visto_en timestamptz
);

create index avisos_comerciales_consultorio
  on public.avisos_comerciales (consultorio_id, creado_en desc);

create or replace function privado.sumar_periodo(
  p_inicio timestamptz,
  p_cantidad integer,
  p_unidad text
)
returns timestamptz
language sql
immutable
as $$
  select case p_unidad
    when 'dias' then p_inicio + make_interval(days => p_cantidad)
    when 'meses' then p_inicio + make_interval(months => p_cantidad)
    else null
  end;
$$;

revoke all on function privado.sumar_periodo(timestamptz, integer, text) from public;

create or replace function privado.conceder_prueba(p_usuario_id uuid, p_consultorio_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_correo text;
  v_cantidad integer;
  v_unidad text;
  v_habilitadas boolean;
  v_inicio timestamptz := now();
  v_vence timestamptz;
begin
  select lower(u.email) into v_correo from auth.users u where u.id = p_usuario_id;
  v_correo := coalesce(nullif(v_correo, ''), p_usuario_id::text);

  select c.prueba_cantidad, c.prueba_unidad, c.pruebas_habilitadas
  into v_cantidad, v_unidad, v_habilitadas
  from public.configuracion_comercial c
  where c.id;

  v_cantidad := coalesce(v_cantidad, 1);
  v_unidad := coalesce(v_unidad, 'meses');

  if not coalesce(v_habilitadas, true) or exists (
    select 1 from public.pruebas_profesionales p where p.correo = v_correo
  ) then
    v_vence := v_inicio;
  else
    v_vence := privado.sumar_periodo(v_inicio, v_cantidad, v_unidad);
  end if;

  insert into public.pruebas_profesionales (
    usuario_id, consultorio_id, correo, inicio, vence_en, cantidad, unidad
  )
  values (p_usuario_id, p_consultorio_id, v_correo, v_inicio, v_vence, v_cantidad, v_unidad)
  on conflict (correo) do nothing;
end;
$$;

revoke all on function privado.conceder_prueba(uuid, uuid) from public;

create or replace function public.crear_consultorio_inicial(
  p_nombre text,
  p_zona_horaria text default 'America/Argentina/Cordoba'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_tipo_cuenta public.tipo_cuenta;
  v_consultorio_id uuid;
begin
  if v_usuario_id is null then
    raise exception 'no_autenticado' using errcode = '42501';
  end if;

  select p.tipo_cuenta into v_tipo_cuenta
  from public.perfiles p
  where p.id = v_usuario_id
  for update;

  if not found then
    raise exception 'perfil_inexistente' using errcode = 'P0001';
  end if;
  if v_tipo_cuenta = 'paciente' then
    raise exception 'cuenta_de_paciente' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.miembros_consultorio m where m.usuario_id = v_usuario_id) then
    raise exception 'consultorio_existente' using errcode = 'P0001';
  end if;

  insert into public.consultorios (nombre, zona_horaria, creado_por)
  values (btrim(p_nombre), coalesce(nullif(btrim(p_zona_horaria), ''), 'America/Argentina/Cordoba'), v_usuario_id)
  returning id into v_consultorio_id;

  insert into public.miembros_consultorio (consultorio_id, usuario_id, rol)
  values (v_consultorio_id, v_usuario_id, 'titular');

  update public.perfiles set tipo_cuenta = 'profesional' where id = v_usuario_id;
  perform privado.conceder_prueba(v_usuario_id, v_consultorio_id);
  perform privado.registrar_auditoria('consultorio.creado', 'consultorios', v_consultorio_id::text, v_consultorio_id);
  return v_consultorio_id;
end;
$$;

-- Consultorios que ya existían reciben la prueba vigente desde su alta.
insert into public.pruebas_profesionales (
  usuario_id, consultorio_id, correo, inicio, vence_en, cantidad, unidad
)
select m.usuario_id,
       c.id,
       coalesce(nullif(lower(u.email), ''), m.usuario_id::text),
       c.creado_en,
       privado.sumar_periodo(c.creado_en, 1, 'meses'),
       1,
       'meses'
from public.consultorios c
join public.miembros_consultorio m on m.consultorio_id = c.id and m.rol = 'titular'
left join auth.users u on u.id = m.usuario_id
on conflict (correo) do nothing;

create or replace function public.estado_acceso_comercial(p_consultorio_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_estado public.estado_consultorio;
  v_vence timestamptz;
  v_cobertura timestamptz;
  v_gracia integer;
  v_rechazo timestamptz;
  v_base timestamptz;
begin
  if not privado.es_miembro_consultorio(p_consultorio_id) and not privado.es_superadmin() then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;

  select c.estado into v_estado from public.consultorios c where c.id = p_consultorio_id;
  if v_estado is distinct from 'activo' then
    return 'suspendido_admin';
  end if;

  select p.vence_en into v_vence from public.pruebas_profesionales p where p.consultorio_id = p_consultorio_id;
  select s.cobertura_hasta into v_cobertura from public.suscripciones s where s.consultorio_id = p_consultorio_id;
  select c.dias_gracia into v_gracia from public.configuracion_comercial c where c.id;
  v_gracia := coalesce(v_gracia, 7);

  if v_cobertura is not null and v_cobertura > now() then
    return 'activo';
  end if;
  if v_vence is not null and v_vence > now() then
    return 'prueba';
  end if;

  select max(pg.creado_en) into v_rechazo
  from public.pagos_suscripcion pg
  join public.suscripciones s on s.id = pg.suscripcion_id
  where s.consultorio_id = p_consultorio_id
    and pg.estado = 'rechazado';

  v_base := coalesce(v_cobertura, v_vence);
  if v_rechazo is not null and v_base is not null and v_base + make_interval(days => v_gracia) > now() then
    return 'gracia';
  end if;
  return 'vencido';
end;
$$;

create or replace function public.ajustar_prueba(
  p_consultorio_id uuid,
  p_vence_en timestamptz,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.es_superadmin() then
    raise exception 'sin_permiso' using errcode = '42501';
  end if;
  if p_motivo is null or char_length(btrim(p_motivo)) < 5 then
    raise exception 'motivo_obligatorio' using errcode = 'P0001';
  end if;
  if p_vence_en is null then
    raise exception 'fecha_invalida' using errcode = 'P0001';
  end if;

  update public.pruebas_profesionales
  set vence_en = p_vence_en
  where consultorio_id = p_consultorio_id;
  if not found then
    raise exception 'prueba_inexistente' using errcode = 'P0001';
  end if;

  perform privado.registrar_auditoria(
    'prueba.ajustada',
    'pruebas_profesionales',
    p_consultorio_id::text,
    p_consultorio_id,
    jsonb_build_object('vence_en', p_vence_en, 'motivo', btrim(p_motivo))
  );
end;
$$;

create or replace function public.registrar_pago_verificado(
  p_mp_suscripcion text,
  p_mp_pago text,
  p_estado text,
  p_monto numeric,
  p_moneda text,
  p_cobrado_en timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_suscripcion public.suscripciones%rowtype;
  v_hasta timestamptz;
begin
  if p_estado not in ('aprobado', 'rechazado', 'pendiente', 'devuelto') then
    raise exception 'estado_invalido' using errcode = 'P0001';
  end if;

  select * into v_suscripcion from public.suscripciones where mp_id = p_mp_suscripcion;
  if not found then
    raise exception 'suscripcion_inexistente' using errcode = 'P0001';
  end if;

  insert into public.pagos_suscripcion (
    suscripcion_id, mp_pago_id, estado, monto, moneda, cobrado_en, periodo_desde, periodo_hasta
  )
  values (
    v_suscripcion.id,
    p_mp_pago,
    p_estado,
    p_monto,
    coalesce(p_moneda, 'ARS'),
    p_cobrado_en,
    p_cobrado_en,
    case when p_estado = 'aprobado' then privado.sumar_periodo(coalesce(p_cobrado_en, now()), 1, 'meses') else null end
  )
  on conflict (mp_pago_id) do nothing;

  if not found then
    return;
  end if;

  if p_estado = 'aprobado' and p_monto >= v_suscripcion.precio then
    v_hasta := privado.sumar_periodo(greatest(coalesce(v_suscripcion.cobertura_hasta, p_cobrado_en), coalesce(p_cobrado_en, now())), 1, 'meses');
    update public.suscripciones
    set cobertura_hasta = v_hasta,
        ultimo_cobro_en = p_cobrado_en,
        proximo_cobro_en = v_hasta,
        actualizado_en = now()
    where id = v_suscripcion.id;
  end if;
end;
$$;

revoke all on function public.estado_acceso_comercial(uuid) from public, anon;
revoke all on function public.ajustar_prueba(uuid, timestamptz, text) from public, anon;
revoke all on function public.registrar_pago_verificado(text, text, text, numeric, text, timestamptz) from public, anon;
grant execute on function public.estado_acceso_comercial(uuid) to authenticated;
grant execute on function public.ajustar_prueba(uuid, timestamptz, text) to authenticated;
grant execute on function public.registrar_pago_verificado(text, text, text, numeric, text, timestamptz) to service_role;

revoke all on table public.configuracion_comercial from anon, authenticated;
grant select on table public.configuracion_comercial to authenticated;
grant update (
  prueba_cantidad, prueba_unidad, precio_mensual, dias_gracia, pruebas_habilitadas
) on table public.configuracion_comercial to authenticated;

revoke all on table public.pruebas_profesionales from anon, authenticated;
grant select on table public.pruebas_profesionales to authenticated;

revoke all on table public.suscripciones from anon, authenticated;
grant select on table public.suscripciones to authenticated;
grant insert (consultorio_id, mp_id, estado_mp, precio, moneda) on table public.suscripciones to authenticated;
grant update (mp_id, estado_mp, cobertura_hasta, ultimo_cobro_en, proximo_cobro_en, mp_actualizado_en, cancelada_en) on table public.suscripciones to authenticated;

revoke all on table public.pagos_suscripcion from anon, authenticated;
grant select on table public.pagos_suscripcion to authenticated;

revoke all on table public.eventos_proveedor from anon, authenticated;
grant select on table public.eventos_proveedor to authenticated;

revoke all on table public.avisos_comerciales from anon, authenticated;
grant select on table public.avisos_comerciales to authenticated;
grant update (visto_en) on table public.avisos_comerciales to authenticated;

alter table public.configuracion_comercial enable row level security;
alter table public.pruebas_profesionales enable row level security;
alter table public.suscripciones enable row level security;
alter table public.pagos_suscripcion enable row level security;
alter table public.eventos_proveedor enable row level security;
alter table public.avisos_comerciales enable row level security;

create policy "comercial: todos leen la configuracion"
  on public.configuracion_comercial for select to authenticated
  using (true);

create policy "comercial: el superadministrador la edita"
  on public.configuracion_comercial for update to authenticated
  using ((select privado.es_superadmin()))
  with check ((select privado.es_superadmin()));

create policy "pruebas: el consultorio ve la suya"
  on public.pruebas_profesionales for select to authenticated
  using (
    privado.es_miembro_consultorio(consultorio_id)
    or (select privado.es_superadmin())
  );

create policy "suscripciones: el consultorio ve la suya"
  on public.suscripciones for select to authenticated
  using (
    privado.es_miembro_consultorio(consultorio_id)
    or (select privado.es_superadmin())
  );

create policy "suscripciones: el titular la crea"
  on public.suscripciones for insert to authenticated
  with check (privado.es_titular_consultorio(consultorio_id));

create policy "suscripciones: el titular la actualiza"
  on public.suscripciones for update to authenticated
  using (privado.es_titular_consultorio(consultorio_id) or (select privado.es_superadmin()))
  with check (privado.es_titular_consultorio(consultorio_id) or (select privado.es_superadmin()));

create policy "pagos: el consultorio ve los suyos"
  on public.pagos_suscripcion for select to authenticated
  using (
    exists (
      select 1 from public.suscripciones s
      where s.id = suscripcion_id
        and (privado.es_miembro_consultorio(s.consultorio_id) or (select privado.es_superadmin()))
    )
  );

create policy "eventos: solo el superadministrador"
  on public.eventos_proveedor for select to authenticated
  using ((select privado.es_superadmin()));

create policy "avisos: el consultorio ve los suyos"
  on public.avisos_comerciales for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id) or (select privado.es_superadmin()));

create policy "avisos: el consultorio los marca vistos"
  on public.avisos_comerciales for update to authenticated
  using (privado.es_miembro_consultorio(consultorio_id))
  with check (privado.es_miembro_consultorio(consultorio_id));
