-- =============================================================================
-- Fase 6 — Comunidad: desafíos del consultorio y actividades escritas por el paciente.
--
-- No hay datos clínicos. El texto lo escribe la persona; el nombre visible es solo
-- el nombre de pila de su ficha y lo fija un trigger (la API no puede inventarlo).
-- El superadministrador no tiene políticas sobre estas tablas.
-- =============================================================================

create type public.estado_desafio as enum ('borrador', 'publicado', 'cerrado');

create table public.desafios (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios (id) on delete restrict,
  creado_por uuid references auth.users (id) on delete set null,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 80),
  consigna text not null check (char_length(btrim(consigna)) between 1 and 400),
  inicio date not null,
  fin date not null,
  estado public.estado_desafio not null default 'borrador',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (id, consultorio_id),
  constraint desafios_fin_posterior check (fin >= inicio)
);

comment on table public.desafios is
  'Actividad grupal del consultorio. El borrador no lo ve el paciente. Cerrado se puede leer y no admite textos nuevos.';

create index desafios_consultorio_fecha
  on public.desafios (consultorio_id, inicio desc);

create table public.participaciones_desafio (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null,
  consultorio_id uuid not null,
  paciente_id uuid not null,
  creado_en timestamptz not null default now(),
  unique (desafio_id, paciente_id),
  foreign key (desafio_id, consultorio_id) references public.desafios (id, consultorio_id) on delete cascade,
  foreign key (paciente_id, consultorio_id) references public.pacientes (id, consultorio_id) on delete cascade
);

comment on table public.participaciones_desafio is
  'La persona se suma a un desafío publicado de su consultorio. paciente_id lo fija el trigger.';

create index participaciones_desafio_paciente
  on public.participaciones_desafio (paciente_id);

create table public.actividades_comunidad (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null,
  consultorio_id uuid not null,
  paciente_id uuid not null,
  autor_visible text not null check (char_length(btrim(autor_visible)) between 1 and 80),
  texto text not null check (char_length(btrim(texto)) between 1 and 280),
  creado_en timestamptz not null default now(),
  foreign key (desafio_id, consultorio_id) references public.desafios (id, consultorio_id) on delete cascade,
  foreign key (paciente_id, consultorio_id) references public.pacientes (id, consultorio_id) on delete cascade
);

comment on table public.actividades_comunidad is
  'Texto que escribió el paciente en un desafío. No guarda mediciones, notas ni planes.';

comment on column public.actividades_comunidad.autor_visible is
  'Nombre de pila copiado de la ficha al publicar. No es editable por la API.';

create index actividades_comunidad_desafio
  on public.actividades_comunidad (desafio_id, creado_en desc);

-- -----------------------------------------------------------------------------
-- Integridad
-- -----------------------------------------------------------------------------
create or replace function privado.paciente_activo_de_sesion(p_consultorio_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.pacientes p
  where p.consultorio_id = p_consultorio_id
    and p.usuario_id = (select auth.uid())
    and p.estado = 'activo'
  limit 1;
$$;

revoke all on function privado.paciente_activo_de_sesion(uuid) from public;
grant execute on function privado.paciente_activo_de_sesion(uuid) to authenticated;

create or replace function privado.preparar_desafio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.titulo := btrim(new.titulo);
  new.consigna := btrim(new.consigna);
  if new.fin < new.inicio then
    raise exception 'desafio_fechas';
  end if;

  if tg_op = 'INSERT' then
    new.creado_por := (select auth.uid());
    new.estado := 'borrador';
    return new;
  end if;

  new.consultorio_id := old.consultorio_id;
  new.creado_por := old.creado_por;

  if old.estado = 'cerrado' then
    raise exception 'desafio_cerrado';
  end if;
  if old.estado = 'borrador' and new.estado = 'cerrado' then
    raise exception 'desafio_sin_publicar';
  end if;
  if old.estado = 'publicado' and new.estado = 'borrador' then
    raise exception 'desafio_ya_publicado';
  end if;
  return new;
end;
$$;

revoke all on function privado.preparar_desafio() from public;

create trigger desafios_preparar
  before insert or update on public.desafios
  for each row execute function privado.preparar_desafio();

create trigger desafios_actualizado_en
  before update on public.desafios
  for each row execute function privado.establecer_actualizado_en();

create or replace function privado.preparar_participacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_consultorio uuid;
  v_estado public.estado_desafio;
  v_paciente uuid;
begin
  select d.consultorio_id, d.estado
  into v_consultorio, v_estado
  from public.desafios d
  where d.id = new.desafio_id;

  if v_consultorio is null then
    raise exception 'desafio_inexistente';
  end if;
  if v_estado is distinct from 'publicado' then
    raise exception 'desafio_no_publicado';
  end if;

  v_paciente := privado.paciente_activo_de_sesion(v_consultorio);
  if v_paciente is null then
    raise exception 'sin_ficha';
  end if;

  new.consultorio_id := v_consultorio;
  new.paciente_id := v_paciente;
  return new;
end;
$$;

revoke all on function privado.preparar_participacion() from public;

create trigger participaciones_preparar
  before insert on public.participaciones_desafio
  for each row execute function privado.preparar_participacion();

create or replace function privado.preparar_actividad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_consultorio uuid;
  v_estado public.estado_desafio;
  v_paciente uuid;
  v_nombre text;
begin
  new.texto := btrim(new.texto);

  select d.consultorio_id, d.estado
  into v_consultorio, v_estado
  from public.desafios d
  where d.id = new.desafio_id;

  if v_consultorio is null then
    raise exception 'desafio_inexistente';
  end if;
  if v_estado is distinct from 'publicado' then
    raise exception 'desafio_no_publicado';
  end if;

  select p.id, btrim(p.nombre)
  into v_paciente, v_nombre
  from public.pacientes p
  where p.consultorio_id = v_consultorio
    and p.usuario_id = (select auth.uid())
    and p.estado = 'activo';

  if v_paciente is null then
    raise exception 'sin_ficha';
  end if;
  if not exists (
    select 1
    from public.participaciones_desafio part
    where part.desafio_id = new.desafio_id
      and part.paciente_id = v_paciente
  ) then
    raise exception 'participacion_requerida';
  end if;

  new.consultorio_id := v_consultorio;
  new.paciente_id := v_paciente;
  new.autor_visible := v_nombre;
  return new;
end;
$$;

revoke all on function privado.preparar_actividad() from public;

create trigger actividades_preparar
  before insert on public.actividades_comunidad
  for each row execute function privado.preparar_actividad();

-- -----------------------------------------------------------------------------
-- Permisos y RLS
-- -----------------------------------------------------------------------------
revoke all on table public.desafios from anon, authenticated;
grant select on table public.desafios to authenticated;
grant insert (consultorio_id, titulo, consigna, inicio, fin) on table public.desafios to authenticated;
grant update (titulo, consigna, inicio, fin, estado) on table public.desafios to authenticated;
grant delete on table public.desafios to authenticated;

revoke all on table public.participaciones_desafio from anon, authenticated;
grant select on table public.participaciones_desafio to authenticated;
grant insert (desafio_id) on table public.participaciones_desafio to authenticated;

revoke all on table public.actividades_comunidad from anon, authenticated;
grant select on table public.actividades_comunidad to authenticated;
grant insert (desafio_id, texto) on table public.actividades_comunidad to authenticated;
grant delete on table public.actividades_comunidad to authenticated;

alter table public.desafios enable row level security;
alter table public.participaciones_desafio enable row level security;
alter table public.actividades_comunidad enable row level security;

create policy "desafios: el consultorio los ve"
  on public.desafios for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "desafios: el paciente ve los publicados"
  on public.desafios for select to authenticated
  using (
    estado in ('publicado', 'cerrado')
    and privado.paciente_activo_de_sesion(consultorio_id) is not null
  );

create policy "desafios: el consultorio los crea"
  on public.desafios for insert to authenticated
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "desafios: el consultorio los edita"
  on public.desafios for update to authenticated
  using (privado.es_miembro_consultorio(consultorio_id))
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "desafios: se borra solo el borrador"
  on public.desafios for delete to authenticated
  using (estado = 'borrador' and privado.es_miembro_consultorio(consultorio_id));

create policy "participaciones: el consultorio las ve"
  on public.participaciones_desafio for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "participaciones: la persona ve la suya"
  on public.participaciones_desafio for select to authenticated
  using (paciente_id = privado.paciente_activo_de_sesion(consultorio_id));

create policy "participaciones: la persona se suma"
  on public.participaciones_desafio for insert to authenticated
  with check (
    paciente_id = privado.paciente_activo_de_sesion(consultorio_id)
    and exists (
      select 1
      from public.desafios d
      where d.id = desafio_id
        and d.consultorio_id = participaciones_desafio.consultorio_id
        and d.estado = 'publicado'
    )
  );

create policy "actividades: el consultorio las ve"
  on public.actividades_comunidad for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "actividades: el paciente ve las del desafío visible"
  on public.actividades_comunidad for select to authenticated
  using (
    privado.paciente_activo_de_sesion(consultorio_id) is not null
    and exists (
      select 1
      from public.desafios d
      where d.id = desafio_id
        and d.estado in ('publicado', 'cerrado')
    )
  );

create policy "actividades: la persona escribe la suya"
  on public.actividades_comunidad for insert to authenticated
  with check (
    paciente_id = privado.paciente_activo_de_sesion(consultorio_id)
    and exists (
      select 1
      from public.participaciones_desafio p
      where p.desafio_id = actividades_comunidad.desafio_id
        and p.paciente_id = actividades_comunidad.paciente_id
    )
    and exists (
      select 1
      from public.desafios d
      where d.id = actividades_comunidad.desafio_id
        and d.estado = 'publicado'
    )
  );

create policy "actividades: el consultorio modera"
  on public.actividades_comunidad for delete to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "actividades: la persona borra la suya"
  on public.actividades_comunidad for delete to authenticated
  using (
    paciente_id = privado.paciente_activo_de_sesion(consultorio_id)
    and exists (
      select 1
      from public.desafios d
      where d.id = desafio_id
        and d.estado = 'publicado'
    )
  );
