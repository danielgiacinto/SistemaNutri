-- =============================================================================
-- Fase 1 — Fundamentos: identidad, multi-tenencia por consultorio y auditoría.
--
-- Decisiones (ver docs/arquitectura.md y docs/base-de-datos.md):
--   * El "tenant" es el consultorio. Todo dato clínico futuro llevará consultorio_id.
--   * El rol de una cuenta nunca se toma de datos enviados por el cliente
--     (raw_user_meta_data). Se asigna únicamente mediante funciones del servidor.
--   * El superadministrador se registra en una tabla sin permisos para la API.
--   * Los permisos se otorgan explícitamente por tabla y por columna; RLS
--     restringe además las filas visibles para cada usuario.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Esquema privado: funciones auxiliares que no se exponen por la API REST.
-- -----------------------------------------------------------------------------
create schema if not exists privado;
revoke all on schema privado from public;
-- Las políticas RLS se evalúan con los permisos del usuario autenticado,
-- por eso necesita USAGE sobre el esquema para invocar las funciones auxiliares.
grant usage on schema privado to authenticated;

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
create type public.tipo_cuenta as enum ('profesional', 'paciente');
create type public.rol_consultorio as enum ('titular', 'colaborador');
create type public.estado_consultorio as enum ('activo', 'suspendido', 'baja');
create type public.preferencia_tema as enum ('claro', 'oscuro', 'sistema');

-- -----------------------------------------------------------------------------
-- Funciones auxiliares genéricas
-- -----------------------------------------------------------------------------
create or replace function privado.establecer_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create or replace function privado.es_zona_horaria_valida(p_zona_horaria text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from pg_catalog.pg_timezone_names t where t.name = p_zona_horaria
  );
$$;

revoke all on function privado.establecer_actualizado_en() from public;
revoke all on function privado.es_zona_horaria_valida(text) from public;
grant execute on function privado.es_zona_horaria_valida(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Perfiles: un registro por usuario de Supabase Auth.
-- -----------------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '' check (char_length(nombre) <= 80),
  apellido text not null default '' check (char_length(apellido) <= 80),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  -- Nulo hasta completar el alta (crear consultorio o aceptar una invitación).
  tipo_cuenta public.tipo_cuenta,
  tema public.preferencia_tema not null default 'sistema',
  paleta text not null default 'salvia'
    check (paleta in ('salvia', 'oceano', 'lavanda', 'terracota')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.perfiles is
  'Datos básicos y preferencias de cada usuario. El tipo de cuenta solo lo asignan funciones del servidor.';

create trigger perfiles_actualizado_en
  before update on public.perfiles
  for each row execute function privado.establecer_actualizado_en();

-- -----------------------------------------------------------------------------
-- Consultorios (tenant) y membresías
-- -----------------------------------------------------------------------------
create table public.consultorios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 120),
  zona_horaria text not null default 'America/Argentina/Cordoba'
    check (privado.es_zona_horaria_valida(zona_horaria)),
  telefono text check (telefono is null or char_length(telefono) <= 40),
  direccion text check (direccion is null or char_length(direccion) <= 200),
  -- Gestionado exclusivamente por la administración de la plataforma.
  estado public.estado_consultorio not null default 'activo',
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.consultorios is
  'Espacio de trabajo aislado de cada profesional. Nunca se elimina físicamente desde la aplicación: los datos clínicos asociados deben conservarse.';

create trigger consultorios_actualizado_en
  before update on public.consultorios
  for each row execute function privado.establecer_actualizado_en();

create table public.miembros_consultorio (
  consultorio_id uuid not null references public.consultorios (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  rol public.rol_consultorio not null default 'titular',
  creado_en timestamptz not null default now(),
  primary key (consultorio_id, usuario_id)
);

-- Por ahora cada profesional pertenece a un único consultorio. Para habilitar
-- varios consultorios por usuario alcanza con eliminar este índice y agregar
-- un selector de consultorio activo (ver docs/arquitectura.md).
create unique index miembros_consultorio_usuario_unico
  on public.miembros_consultorio (usuario_id);

create unique index miembros_consultorio_un_titular
  on public.miembros_consultorio (consultorio_id)
  where rol = 'titular';

-- -----------------------------------------------------------------------------
-- Administración de la plataforma (superadministradores)
-- Sin permisos para anon/authenticated: solo se modifica con la clave de
-- servicio o desde el editor SQL (ver docs/superadministrador.md).
-- -----------------------------------------------------------------------------
create table public.administradores_plataforma (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  nota text check (nota is null or char_length(nota) <= 200),
  creado_en timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Auditoría. Registra quién hizo qué y sobre qué entidad, nunca contenido clínico.
-- -----------------------------------------------------------------------------
create table public.registros_auditoria (
  id bigint generated always as identity primary key,
  consultorio_id uuid references public.consultorios (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  accion text not null check (char_length(accion) between 1 and 80),
  entidad text not null check (char_length(entidad) between 1 and 80),
  entidad_id text check (entidad_id is null or char_length(entidad_id) <= 80),
  detalles jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index registros_auditoria_consultorio_fecha
  on public.registros_auditoria (consultorio_id, creado_en desc);
create index registros_auditoria_actor_fecha
  on public.registros_auditoria (actor_id, creado_en desc);

-- -----------------------------------------------------------------------------
-- Funciones de autorización (SECURITY DEFINER para evitar recursión de RLS)
-- -----------------------------------------------------------------------------
create or replace function privado.es_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.administradores_plataforma a
    where a.usuario_id = (select auth.uid())
  );
$$;

create or replace function privado.es_miembro_consultorio(p_consultorio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.miembros_consultorio m
    where m.consultorio_id = p_consultorio_id
      and m.usuario_id = (select auth.uid())
  );
$$;

create or replace function privado.es_titular_consultorio(p_consultorio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.miembros_consultorio m
    where m.consultorio_id = p_consultorio_id
      and m.usuario_id = (select auth.uid())
      and m.rol = 'titular'
  );
$$;

revoke all on function privado.es_superadmin() from public;
revoke all on function privado.es_miembro_consultorio(uuid) from public;
revoke all on function privado.es_titular_consultorio(uuid) from public;
grant execute on function privado.es_superadmin() to authenticated;
grant execute on function privado.es_miembro_consultorio(uuid) to authenticated;
grant execute on function privado.es_titular_consultorio(uuid) to authenticated;

-- Solo la invocan otras funciones SECURITY DEFINER; nunca el cliente.
create or replace function privado.registrar_auditoria(
  p_accion text,
  p_entidad text,
  p_entidad_id text default null,
  p_consultorio_id uuid default null,
  p_detalles jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.registros_auditoria (consultorio_id, actor_id, accion, entidad, entidad_id, detalles)
  values (p_consultorio_id, auth.uid(), p_accion, p_entidad, p_entidad_id, coalesce(p_detalles, '{}'::jsonb));
end;
$$;

revoke all on function privado.registrar_auditoria(text, text, text, uuid, jsonb) from public;

-- -----------------------------------------------------------------------------
-- Alta automática del perfil al crear un usuario en Supabase Auth.
-- Solo copia nombre/apellido/avatar; nunca el tipo de cuenta.
-- -----------------------------------------------------------------------------
create or replace function privado.crear_perfil_para_usuario_nuevo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_datos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_nombre_completo text := btrim(coalesce(v_datos ->> 'full_name', v_datos ->> 'name', ''));
  v_nombre text;
  v_apellido text;
  v_avatar text;
begin
  v_nombre := coalesce(
    nullif(btrim(v_datos ->> 'nombre'), ''),
    nullif(btrim(v_datos ->> 'given_name'), ''),
    nullif(split_part(v_nombre_completo, ' ', 1), ''),
    ''
  );
  v_apellido := coalesce(
    nullif(btrim(v_datos ->> 'apellido'), ''),
    nullif(btrim(v_datos ->> 'family_name'), ''),
    nullif(btrim(substr(v_nombre_completo, char_length(split_part(v_nombre_completo, ' ', 1)) + 1)), ''),
    ''
  );
  v_avatar := nullif(coalesce(v_datos ->> 'avatar_url', v_datos ->> 'picture'), '');
  if v_avatar is not null and v_avatar !~ '^https://' then
    v_avatar := null;
  end if;

  insert into public.perfiles (id, nombre, apellido, avatar_url)
  values (new.id, left(v_nombre, 80), left(v_apellido, 80), left(v_avatar, 2048))
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function privado.crear_perfil_para_usuario_nuevo() from public;

create trigger al_crear_usuario_crear_perfil
  after insert on auth.users
  for each row execute function privado.crear_perfil_para_usuario_nuevo();

-- -----------------------------------------------------------------------------
-- Auditoría de cambios en consultorios: registra qué campos cambiaron, no sus valores.
-- -----------------------------------------------------------------------------
create or replace function privado.auditar_cambio_consultorio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campos jsonb;
begin
  select coalesce(jsonb_agg(n.key order by n.key), '[]'::jsonb)
    into v_campos
  from jsonb_each(to_jsonb(new)) n
  where n.key <> 'actualizado_en'
    and n.value is distinct from (to_jsonb(old) -> n.key);

  if jsonb_array_length(v_campos) > 0 then
    perform privado.registrar_auditoria(
      'consultorio.actualizado', 'consultorios', new.id::text, new.id,
      jsonb_build_object('campos', v_campos)
    );
  end if;
  return new;
end;
$$;

revoke all on function privado.auditar_cambio_consultorio() from public;

create trigger consultorios_auditar_cambios
  after update on public.consultorios
  for each row execute function privado.auditar_cambio_consultorio();

-- -----------------------------------------------------------------------------
-- RPC: alta del consultorio del profesional (onboarding).
-- -----------------------------------------------------------------------------
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

  perform privado.registrar_auditoria('consultorio.creado', 'consultorios', v_consultorio_id::text, v_consultorio_id);

  return v_consultorio_id;
end;
$$;

revoke all on function public.crear_consultorio_inicial(text, text) from public, anon;
grant execute on function public.crear_consultorio_inicial(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- RPC: contexto del usuario actual (perfil, consultorio y rol de plataforma).
-- SECURITY INVOKER: solo devuelve filas que RLS ya permite ver al usuario.
-- -----------------------------------------------------------------------------
create or replace function public.obtener_mi_contexto()
returns table (
  usuario_id uuid,
  nombre text,
  apellido text,
  avatar_url text,
  tipo_cuenta public.tipo_cuenta,
  tema public.preferencia_tema,
  paleta text,
  es_superadmin boolean,
  consultorio_id uuid,
  consultorio_nombre text,
  consultorio_zona_horaria text,
  consultorio_estado public.estado_consultorio,
  rol_consultorio public.rol_consultorio
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.nombre,
    p.apellido,
    p.avatar_url,
    p.tipo_cuenta,
    p.tema,
    p.paleta,
    privado.es_superadmin(),
    c.id,
    c.nombre,
    c.zona_horaria,
    c.estado,
    m.rol
  from public.perfiles p
  left join public.miembros_consultorio m on m.usuario_id = p.id
  left join public.consultorios c on c.id = m.consultorio_id
  where p.id = (select auth.uid());
$$;

revoke all on function public.obtener_mi_contexto() from public, anon;
grant execute on function public.obtener_mi_contexto() to authenticated;

-- -----------------------------------------------------------------------------
-- Permisos explícitos por tabla y columna
-- -----------------------------------------------------------------------------
revoke all on table public.perfiles from anon, authenticated;
grant select on table public.perfiles to authenticated;
grant update (nombre, apellido, tema, paleta) on table public.perfiles to authenticated;

revoke all on table public.consultorios from anon, authenticated;
grant select on table public.consultorios to authenticated;
grant update (nombre, zona_horaria, telefono, direccion) on table public.consultorios to authenticated;

revoke all on table public.miembros_consultorio from anon, authenticated;
grant select on table public.miembros_consultorio to authenticated;

revoke all on table public.administradores_plataforma from anon, authenticated;

revoke all on table public.registros_auditoria from anon, authenticated;
grant select on table public.registros_auditoria to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.perfiles enable row level security;
alter table public.consultorios enable row level security;
alter table public.miembros_consultorio enable row level security;
alter table public.administradores_plataforma enable row level security;
alter table public.registros_auditoria enable row level security;

-- Perfiles
create policy "perfiles: el usuario ve su propio perfil"
  on public.perfiles for select to authenticated
  using (id = (select auth.uid()));

create policy "perfiles: la plataforma ve datos básicos de cuentas"
  on public.perfiles for select to authenticated
  using ((select privado.es_superadmin()));

create policy "perfiles: el usuario edita su propio perfil"
  on public.perfiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Consultorios
create policy "consultorios: los miembros ven su consultorio"
  on public.consultorios for select to authenticated
  using (privado.es_miembro_consultorio(id));

create policy "consultorios: la plataforma ve todos los consultorios"
  on public.consultorios for select to authenticated
  using ((select privado.es_superadmin()));

create policy "consultorios: el titular edita su consultorio"
  on public.consultorios for update to authenticated
  using (privado.es_titular_consultorio(id))
  with check (privado.es_titular_consultorio(id));

-- Miembros
create policy "miembros: se ven las membresías del propio consultorio"
  on public.miembros_consultorio for select to authenticated
  using (
    usuario_id = (select auth.uid())
    or privado.es_miembro_consultorio(consultorio_id)
    or (select privado.es_superadmin())
  );

-- Administradores de la plataforma: sin políticas => inaccesible para la API.

-- Auditoría
create policy "auditoria: el titular ve la actividad de su consultorio"
  on public.registros_auditoria for select to authenticated
  using (consultorio_id is not null and privado.es_titular_consultorio(consultorio_id));

create policy "auditoria: la plataforma ve todos los registros"
  on public.registros_auditoria for select to authenticated
  using ((select privado.es_superadmin()));
