-- =============================================================================
-- Fase 4 — Planes alimentarios con versiones.
--
-- El borrador vive en planes_alimentarios / planes_comidas.
-- El paciente solo lee planes_publicaciones, una copia que se crea al publicar.
-- Guardar el borrador no modifica esa copia.
-- =============================================================================

create type public.momento_comida as enum (
  'desayuno', 'media_manana', 'almuerzo', 'merienda', 'cena', 'colacion'
);

create or replace function privado.establecer_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if tg_table_name = 'pacientes' then
      new.creado_por := coalesce(new.creado_por, (select auth.uid()));
    elsif tg_table_name in ('turnos', 'evoluciones', 'objetivos', 'mediciones', 'bloqueos_agenda', 'planes_alimentarios') then
      if tg_table_name = 'bloqueos_agenda' then
        new.creado_por := coalesce(new.creado_por, (select auth.uid()));
      else
        new.profesional_id := (select auth.uid());
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if tg_table_name = 'pacientes' then
      new.creado_por := old.creado_por;
      new.consultorio_id := old.consultorio_id;
      if coalesce(current_setting('privado.vincular_paciente', true), '') <> '1' then
        new.usuario_id := old.usuario_id;
      end if;
    else
      new.consultorio_id := old.consultorio_id;
      if tg_table_name in ('turnos', 'evoluciones', 'objetivos', 'mediciones', 'planes_alimentarios') then
        new.profesional_id := old.profesional_id;
      end if;
      if tg_table_name in ('evoluciones', 'planes_alimentarios') then
        new.paciente_id := old.paciente_id;
      end if;
      if tg_table_name = 'planes_alimentarios'
         and (
           new.titulo is distinct from old.titulo
           or new.indicaciones is distinct from old.indicaciones
         ) then
        new.cambios_sin_publicar := true;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create table public.planes_alimentarios (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios (id) on delete restrict,
  paciente_id uuid not null,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 160),
  indicaciones text check (indicaciones is null or char_length(indicaciones) <= 8000),
  profesional_id uuid not null references auth.users (id) on delete restrict,
  cambios_sin_publicar boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (id, consultorio_id),
  foreign key (paciente_id, consultorio_id) references public.pacientes (id, consultorio_id) on delete restrict
);

comment on table public.planes_alimentarios is
  'Borrador del plan alimentario. El paciente no lo lee: ve solo la última publicación.';

create trigger planes_alimentarios_actualizado_en
  before update on public.planes_alimentarios
  for each row execute function privado.establecer_actualizado_en();

create trigger planes_alimentarios_actor
  before insert or update on public.planes_alimentarios
  for each row execute function privado.establecer_actor();

create index planes_alimentarios_paciente
  on public.planes_alimentarios (paciente_id, actualizado_en desc);

create table public.planes_comidas (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  consultorio_id uuid not null,
  orden smallint not null check (orden between 1 and 20),
  momento public.momento_comida not null,
  detalle text not null check (char_length(btrim(detalle)) between 1 and 2000),
  foreign key (plan_id, consultorio_id) references public.planes_alimentarios (id, consultorio_id) on delete cascade,
  unique (plan_id, orden)
);

comment on table public.planes_comidas is
  'Comidas del borrador. Reemplazarlas no cambia la versión publicada.';

create index planes_comidas_plan on public.planes_comidas (plan_id, orden);

create table public.planes_publicaciones (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  consultorio_id uuid not null,
  paciente_id uuid not null,
  numero integer not null check (numero >= 1),
  titulo text not null,
  indicaciones text,
  publicada_en timestamptz not null default now(),
  foreign key (plan_id, consultorio_id) references public.planes_alimentarios (id, consultorio_id) on delete cascade,
  unique (plan_id, numero)
);

comment on table public.planes_publicaciones is
  'Copia inmutable de un plan al publicarlo. Es lo único que ve el paciente.';

create index planes_publicaciones_paciente
  on public.planes_publicaciones (paciente_id, publicada_en desc);

create table public.planes_publicaciones_comidas (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.planes_publicaciones (id) on delete cascade,
  consultorio_id uuid not null,
  orden smallint not null check (orden between 1 and 20),
  momento public.momento_comida not null,
  detalle text not null
);

create index planes_publicaciones_comidas_publicacion
  on public.planes_publicaciones_comidas (publicacion_id, orden);

create or replace function privado.marcar_plan_sin_publicar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.planes_alimentarios
  set cambios_sin_publicar = true
  where id = coalesce(new.plan_id, old.plan_id);
  return coalesce(new, old);
end;
$$;

revoke all on function privado.marcar_plan_sin_publicar() from public;

create trigger planes_comidas_marcan_borrador
  after insert or update or delete on public.planes_comidas
  for each row execute function privado.marcar_plan_sin_publicar();

-- -----------------------------------------------------------------------------
-- Permisos
-- -----------------------------------------------------------------------------
revoke all on table public.planes_alimentarios from anon, authenticated;
grant select on table public.planes_alimentarios to authenticated;
grant insert (consultorio_id, paciente_id, titulo, indicaciones) on table public.planes_alimentarios to authenticated;
grant update (titulo, indicaciones, cambios_sin_publicar) on table public.planes_alimentarios to authenticated;
grant delete on table public.planes_alimentarios to authenticated;

revoke all on table public.planes_comidas from anon, authenticated;
grant select, delete on table public.planes_comidas to authenticated;
grant insert (plan_id, consultorio_id, orden, momento, detalle) on table public.planes_comidas to authenticated;
grant update (orden, momento, detalle) on table public.planes_comidas to authenticated;

revoke all on table public.planes_publicaciones from anon, authenticated;
grant select on table public.planes_publicaciones to authenticated;

revoke all on table public.planes_publicaciones_comidas from anon, authenticated;
grant select on table public.planes_publicaciones_comidas to authenticated;

alter table public.planes_alimentarios enable row level security;
alter table public.planes_comidas enable row level security;
alter table public.planes_publicaciones enable row level security;
alter table public.planes_publicaciones_comidas enable row level security;

create policy "planes: el consultorio los ve"
  on public.planes_alimentarios for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "planes: el consultorio los crea"
  on public.planes_alimentarios for insert to authenticated
  with check (
    privado.es_miembro_consultorio(consultorio_id)
    and exists (
      select 1 from public.pacientes p
      where p.id = paciente_id
        and p.consultorio_id = planes_alimentarios.consultorio_id
        and p.estado = 'activo'
    )
  );

create policy "planes: el consultorio los edita"
  on public.planes_alimentarios for update to authenticated
  using (privado.es_miembro_consultorio(consultorio_id))
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "planes: se borra solo si nunca se publicó"
  on public.planes_alimentarios for delete to authenticated
  using (
    privado.es_miembro_consultorio(consultorio_id)
    and not exists (
      select 1
      from public.planes_publicaciones pub
      where pub.plan_id = planes_alimentarios.id
    )
  );

create policy "comidas: el consultorio las ve"
  on public.planes_comidas for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "comidas: el consultorio las crea"
  on public.planes_comidas for insert to authenticated
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "comidas: el consultorio las edita"
  on public.planes_comidas for update to authenticated
  using (privado.es_miembro_consultorio(consultorio_id))
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "comidas: el consultorio las borra"
  on public.planes_comidas for delete to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "publicaciones: el consultorio las ve"
  on public.planes_publicaciones for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "publicaciones: el paciente ve las suyas"
  on public.planes_publicaciones for select to authenticated
  using (
    exists (
      select 1 from public.pacientes p
      where p.id = paciente_id
        and p.usuario_id = (select auth.uid())
        and p.estado = 'activo'
    )
  );

create policy "publicaciones comidas: el consultorio las ve"
  on public.planes_publicaciones_comidas for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "publicaciones comidas: el paciente ve las suyas"
  on public.planes_publicaciones_comidas for select to authenticated
  using (
    exists (
      select 1
      from public.planes_publicaciones pub
      join public.pacientes p on p.id = pub.paciente_id
      where pub.id = publicacion_id
        and p.usuario_id = (select auth.uid())
        and p.estado = 'activo'
    )
  );

-- -----------------------------------------------------------------------------
-- Guardar el borrador y publicar una copia.
-- -----------------------------------------------------------------------------
create or replace function public.guardar_plan(
  p_plan_id uuid,
  p_titulo text,
  p_indicaciones text,
  p_comidas jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.planes_alimentarios%rowtype;
  v_item record;
  v_detalle text;
  v_orden integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'no_autenticado';
  end if;

  select * into v_plan from public.planes_alimentarios where id = p_plan_id;
  if not found then
    raise exception 'plan_inexistente';
  end if;
  if not privado.es_miembro_consultorio(v_plan.consultorio_id) then
    raise exception 'sin_permiso';
  end if;
  if p_titulo is null or char_length(btrim(p_titulo)) not between 1 and 160 then
    raise exception 'titulo_invalido';
  end if;
  if p_indicaciones is not null and char_length(p_indicaciones) > 8000 then
    raise exception 'indicaciones_invalidas';
  end if;
  if p_comidas is null or jsonb_typeof(p_comidas) <> 'array' or jsonb_array_length(p_comidas) > 20 then
    raise exception 'comidas_invalidas';
  end if;

  update public.planes_alimentarios
  set titulo = btrim(p_titulo),
      indicaciones = nullif(btrim(coalesce(p_indicaciones, '')), '')
  where id = v_plan.id;

  delete from public.planes_comidas where plan_id = v_plan.id;

  for v_item in
    select value from jsonb_array_elements(p_comidas)
  loop
    v_orden := v_orden + 1;
    v_detalle := btrim(coalesce(v_item.value ->> 'detalle', ''));
    if char_length(v_detalle) not between 1 and 2000 then
      raise exception 'comidas_invalidas';
    end if;
    insert into public.planes_comidas (plan_id, consultorio_id, orden, momento, detalle)
    values (
      v_plan.id,
      v_plan.consultorio_id,
      v_orden,
      (v_item.value ->> 'momento')::public.momento_comida,
      v_detalle
    );
  end loop;
exception
  when invalid_text_representation then
    raise exception 'comidas_invalidas';
end;
$$;

create or replace function public.publicar_plan(p_plan_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.planes_alimentarios%rowtype;
  v_numero integer;
  v_publicacion uuid;
  v_comidas integer;
begin
  if (select auth.uid()) is null then
    raise exception 'no_autenticado';
  end if;

  select * into v_plan from public.planes_alimentarios where id = p_plan_id for update;
  if not found then
    raise exception 'plan_inexistente';
  end if;
  if not privado.es_miembro_consultorio(v_plan.consultorio_id) then
    raise exception 'sin_permiso';
  end if;

  select count(*) into v_comidas from public.planes_comidas where plan_id = v_plan.id;
  if v_comidas < 1 then
    raise exception 'plan_sin_comidas';
  end if;

  select coalesce(max(numero), 0) + 1 into v_numero
  from public.planes_publicaciones
  where plan_id = v_plan.id;

  insert into public.planes_publicaciones (
    plan_id, consultorio_id, paciente_id, numero, titulo, indicaciones
  )
  values (
    v_plan.id, v_plan.consultorio_id, v_plan.paciente_id, v_numero, v_plan.titulo, v_plan.indicaciones
  )
  returning id into v_publicacion;

  insert into public.planes_publicaciones_comidas (publicacion_id, consultorio_id, orden, momento, detalle)
  select v_publicacion, consultorio_id, orden, momento, detalle
  from public.planes_comidas
  where plan_id = v_plan.id;

  update public.planes_alimentarios
  set cambios_sin_publicar = false
  where id = v_plan.id;

  return v_numero;
end;
$$;

revoke all on function public.guardar_plan(uuid, text, text, jsonb) from public, anon;
revoke all on function public.publicar_plan(uuid) from public, anon;
grant execute on function public.guardar_plan(uuid, text, text, jsonb) to authenticated;
grant execute on function public.publicar_plan(uuid) to authenticated;
