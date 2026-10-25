-- =============================================================================
-- Fase 2 — Gestión clínica: pacientes, agenda, evoluciones, objetivos y mediciones.
--
-- Decisiones (ver docs/arquitectura.md y docs/base-de-datos.md):
--   * Toda tabla clínica lleva consultorio_id. Un índice único (id, consultorio_id)
--     permite claves foráneas compuestas y evita vincular un paciente ajeno.
--   * El superadministrador no tiene políticas sobre estas tablas.
--   * Las notas clínicas nacen privadas (visible_para_paciente = false) y en
--     borrador. Compartir exige una acción explícita sobre una nota publicada.
--   * Los turnos no se borran: se cancelan. El solapamiento, los horarios y los
--     bloqueos se validan en un trigger (sin depender de btree_gist).
--   * Si el consultorio no definió horarios, se permite agendar en cualquier
--     momento; en cuanto hay al menos un horario, se exige encajar en uno.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipos enumerados
-- -----------------------------------------------------------------------------
create type public.estado_paciente as enum ('activo', 'inactivo');
create type public.estado_turno as enum ('programado', 'confirmado', 'completado', 'cancelado', 'ausente');
create type public.tipo_consulta as enum ('primera_consulta', 'seguimiento', 'control', 'otro');
create type public.estado_objetivo as enum ('pendiente', 'en_progreso', 'completado', 'cancelado');
create type public.categoria_objetivo as enum ('peso', 'habito', 'analitica', 'bienestar', 'otro');

-- -----------------------------------------------------------------------------
-- Duración predeterminada de los turnos en el consultorio
-- -----------------------------------------------------------------------------
alter table public.consultorios
  add column duracion_turno_minutos integer not null default 45
    check (duracion_turno_minutos between 10 and 240);

grant update (duracion_turno_minutos) on table public.consultorios to authenticated;

-- -----------------------------------------------------------------------------
-- Pacientes
-- -----------------------------------------------------------------------------
create table public.pacientes (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios (id) on delete restrict,
  usuario_id uuid unique references auth.users (id) on delete set null,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  apellido text not null check (char_length(btrim(apellido)) between 1 and 80),
  correo text check (correo is null or char_length(correo) between 3 and 254),
  telefono text check (telefono is null or char_length(telefono) <= 40),
  documento text check (documento is null or char_length(documento) between 5 and 20),
  fecha_nacimiento date check (
    fecha_nacimiento is null or fecha_nacimiento >= date '1900-01-01'
  ),
  notas_administrativas text check (notas_administrativas is null or char_length(notas_administrativas) <= 2000),
  estado public.estado_paciente not null default 'activo',
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (id, consultorio_id)
);

comment on table public.pacientes is
  'Personas atendidas por un consultorio. usuario_id se vincula en la fase 3 al aceptar una invitación; no es editable por la API.';

comment on column public.pacientes.notas_administrativas is
  'Notas operativas (cómo llega, preferencia de horario). No forman parte de la historia clínica.';

create trigger pacientes_actualizado_en
  before update on public.pacientes
  for each row execute function privado.establecer_actualizado_en();

create index pacientes_consultorio_estado_apellido
  on public.pacientes (consultorio_id, estado, lower(apellido), lower(nombre));

create unique index pacientes_documento_unico
  on public.pacientes (consultorio_id, lower(documento))
  where documento is not null;

create index pacientes_correo
  on public.pacientes (consultorio_id, lower(correo))
  where correo is not null;

-- -----------------------------------------------------------------------------
-- Agenda: horarios, bloqueos y turnos
-- -----------------------------------------------------------------------------
create table public.horarios_atencion (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios (id) on delete cascade,
  -- ISO-8601: 1 = lunes … 7 = domingo.
  dia_semana smallint not null check (dia_semana between 1 and 7),
  hora_inicio time not null,
  hora_fin time not null,
  creado_en timestamptz not null default now(),
  check (hora_fin > hora_inicio),
  unique (consultorio_id, dia_semana, hora_inicio)
);

comment on table public.horarios_atencion is
  'Franjas de atención en hora local del consultorio. Si no hay filas, la agenda no restringe el horario.';

create table public.bloqueos_agenda (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios (id) on delete cascade,
  inicio timestamptz not null,
  fin timestamptz not null,
  motivo text check (motivo is null or char_length(motivo) <= 200),
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  check (fin > inicio)
);

create index bloqueos_agenda_consultorio_rango
  on public.bloqueos_agenda (consultorio_id, inicio, fin);

create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios (id) on delete restrict,
  paciente_id uuid not null,
  profesional_id uuid not null references auth.users (id) on delete restrict,
  inicio timestamptz not null,
  fin timestamptz not null,
  tipo public.tipo_consulta not null default 'seguimiento',
  motivo text check (motivo is null or char_length(motivo) <= 200),
  notas_administrativas text check (notas_administrativas is null or char_length(notas_administrativas) <= 2000),
  estado public.estado_turno not null default 'programado',
  cancelado_en timestamptz,
  motivo_cancelacion text check (motivo_cancelacion is null or char_length(motivo_cancelacion) <= 200),
  -- Reservado para recordatorios por correo (fase posterior).
  recordatorio_enviado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (fin > inicio),
  check (fin - inicio >= interval '10 minutes'),
  check (fin - inicio <= interval '8 hours'),
  check (
    (estado = 'cancelado' and cancelado_en is not null)
    or (estado <> 'cancelado' and cancelado_en is null)
  ),
  unique (id, consultorio_id),
  foreign key (paciente_id, consultorio_id)
    references public.pacientes (id, consultorio_id)
    on delete restrict
);

comment on table public.turnos is
  'Reservas de agenda del consultorio. No se eliminan: un turno que no ocurre pasa a cancelado o ausente.';

comment on column public.turnos.recordatorio_enviado_en is
  'Marca de envío de recordatorio. La integración de correo se agregará junto con el proveedor SMTP de producción.';

create trigger turnos_actualizado_en
  before update on public.turnos
  for each row execute function privado.establecer_actualizado_en();

create index turnos_consultorio_inicio
  on public.turnos (consultorio_id, inicio);

create index turnos_paciente_inicio
  on public.turnos (paciente_id, inicio);

create index turnos_consultorio_estado_inicio
  on public.turnos (consultorio_id, estado, inicio);

-- -----------------------------------------------------------------------------
-- Evoluciones clínicas y versiones
-- -----------------------------------------------------------------------------
create table public.evoluciones (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios (id) on delete restrict,
  paciente_id uuid not null,
  turno_id uuid,
  profesional_id uuid not null references auth.users (id) on delete restrict,
  titulo text check (titulo is null or char_length(titulo) <= 160),
  contenido text not null check (char_length(btrim(contenido)) between 1 and 20000),
  observaciones text check (observaciones is null or char_length(observaciones) <= 8000),
  indicaciones text check (indicaciones is null or char_length(indicaciones) <= 8000),
  es_borrador boolean not null default true,
  visible_para_paciente boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (not visible_para_paciente or es_borrador = false),
  unique (id, consultorio_id),
  foreign key (paciente_id, consultorio_id)
    references public.pacientes (id, consultorio_id)
    on delete restrict,
  foreign key (turno_id, consultorio_id)
    references public.turnos (id, consultorio_id)
    on delete set null
);

comment on table public.evoluciones is
  'Notas de consulta. Nacen privadas y en borrador. visible_para_paciente solo puede activarse sobre una nota publicada.';

create trigger evoluciones_actualizado_en
  before update on public.evoluciones
  for each row execute function privado.establecer_actualizado_en();

create index evoluciones_paciente_fecha
  on public.evoluciones (paciente_id, creado_en desc);

create table public.evoluciones_versiones (
  id bigint generated always as identity primary key,
  evolucion_id uuid not null references public.evoluciones (id) on delete cascade,
  consultorio_id uuid not null references public.consultorios (id) on delete restrict,
  profesional_id uuid references auth.users (id) on delete set null,
  titulo text,
  contenido text not null,
  observaciones text,
  indicaciones text,
  es_borrador boolean not null,
  visible_para_paciente boolean not null,
  creado_en timestamptz not null default now()
);

comment on table public.evoluciones_versiones is
  'Instantánea del contenido anterior cada vez que se modifica una evolución. creado_en es el momento del cambio, no el de alta original.';

create index evoluciones_versiones_evolucion_fecha
  on public.evoluciones_versiones (evolucion_id, creado_en desc);

-- -----------------------------------------------------------------------------
-- Objetivos
-- -----------------------------------------------------------------------------
create table public.objetivos (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios (id) on delete restrict,
  paciente_id uuid not null,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 160),
  descripcion text check (descripcion is null or char_length(descripcion) <= 4000),
  categoria public.categoria_objetivo not null default 'otro',
  fecha_objetivo date,
  estado public.estado_objetivo not null default 'pendiente',
  progreso numeric(5, 2) check (progreso is null or (progreso >= 0 and progreso <= 100)),
  valor_inicial numeric(8, 2),
  valor_objetivo numeric(8, 2),
  unidad text check (unidad is null or char_length(unidad) <= 20),
  observaciones text check (observaciones is null or char_length(observaciones) <= 4000),
  visible_para_paciente boolean not null default false,
  profesional_id uuid not null references auth.users (id) on delete restrict,
  completado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (
    (estado = 'completado' and completado_en is not null)
    or (estado <> 'completado' and completado_en is null)
  ),
  unique (id, consultorio_id),
  foreign key (paciente_id, consultorio_id)
    references public.pacientes (id, consultorio_id)
    on delete restrict
);

create trigger objetivos_actualizado_en
  before update on public.objetivos
  for each row execute function privado.establecer_actualizado_en();

create index objetivos_paciente_estado
  on public.objetivos (paciente_id, estado, creado_en desc);

-- -----------------------------------------------------------------------------
-- Mediciones antropométricas
-- -----------------------------------------------------------------------------
create table public.mediciones (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios (id) on delete restrict,
  paciente_id uuid not null,
  registrado_en timestamptz not null,
  peso_kg numeric(5, 2) check (peso_kg is null or (peso_kg >= 1 and peso_kg <= 400)),
  talla_cm numeric(5, 1) check (talla_cm is null or (talla_cm >= 40 and talla_cm <= 250)),
  circunferencia_cintura_cm numeric(5, 1) check (
    circunferencia_cintura_cm is null or (circunferencia_cintura_cm >= 20 and circunferencia_cintura_cm <= 300)
  ),
  circunferencia_cadera_cm numeric(5, 1) check (
    circunferencia_cadera_cm is null or (circunferencia_cadera_cm >= 20 and circunferencia_cadera_cm <= 300)
  ),
  porcentaje_grasa numeric(5, 2) check (porcentaje_grasa is null or (porcentaje_grasa >= 1 and porcentaje_grasa <= 80)),
  masa_muscular_kg numeric(5, 2) check (masa_muscular_kg is null or (masa_muscular_kg >= 1 and masa_muscular_kg <= 200)),
  observaciones text check (observaciones is null or char_length(observaciones) <= 2000),
  visible_para_paciente boolean not null default false,
  profesional_id uuid not null references auth.users (id) on delete restrict,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (
    peso_kg is not null
    or talla_cm is not null
    or circunferencia_cintura_cm is not null
    or circunferencia_cadera_cm is not null
    or porcentaje_grasa is not null
    or masa_muscular_kg is not null
  ),
  unique (id, consultorio_id),
  foreign key (paciente_id, consultorio_id)
    references public.pacientes (id, consultorio_id)
    on delete restrict
);

comment on table public.mediciones is
  'Registros antropométricos puntuales. El IMC se calcula en la aplicación cuando hay peso y talla; no se guarda ni se interpreta clínicamente.';

create trigger mediciones_actualizado_en
  before update on public.mediciones
  for each row execute function privado.establecer_actualizado_en();

create index mediciones_paciente_fecha
  on public.mediciones (paciente_id, registrado_en desc);

-- -----------------------------------------------------------------------------
-- Triggers de integridad
-- -----------------------------------------------------------------------------
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
    elsif tg_table_name in ('turnos', 'evoluciones', 'objetivos', 'mediciones', 'bloqueos_agenda') then
      if tg_table_name = 'bloqueos_agenda' then
        new.creado_por := coalesce(new.creado_por, (select auth.uid()));
      else
        new.profesional_id := (select auth.uid());
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if tg_table_name = 'pacientes' then
      new.creado_por := old.creado_por;
      new.usuario_id := old.usuario_id;
      new.consultorio_id := old.consultorio_id;
    else
      new.consultorio_id := old.consultorio_id;
      if tg_table_name in ('turnos', 'evoluciones', 'objetivos', 'mediciones') then
        new.profesional_id := old.profesional_id;
      end if;
      if tg_table_name = 'evoluciones' then
        new.paciente_id := old.paciente_id;
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function privado.establecer_actor() from public;

create trigger pacientes_establecer_actor
  before insert or update on public.pacientes
  for each row execute function privado.establecer_actor();

create trigger turnos_establecer_actor
  before insert or update on public.turnos
  for each row execute function privado.establecer_actor();

create trigger evoluciones_establecer_actor
  before insert or update on public.evoluciones
  for each row execute function privado.establecer_actor();

create trigger objetivos_establecer_actor
  before insert or update on public.objetivos
  for each row execute function privado.establecer_actor();

create trigger mediciones_establecer_actor
  before insert or update on public.mediciones
  for each row execute function privado.establecer_actor();

create trigger bloqueos_establecer_actor
  before insert or update on public.bloqueos_agenda
  for each row execute function privado.establecer_actor();

create or replace function privado.validar_turno()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_zona text;
  v_estado_paciente public.estado_paciente;
  v_inicio_local timestamp;
  v_fin_local timestamp;
  v_dow smallint;
  v_hora_inicio time;
  v_hora_fin time;
  v_hay_horarios boolean;
begin
  if new.estado = 'cancelado' then
    if new.cancelado_en is null then
      new.cancelado_en := now();
    end if;
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.consultorio_id::text)::bigint);

  select p.estado into v_estado_paciente
  from public.pacientes p
  where p.id = new.paciente_id and p.consultorio_id = new.consultorio_id;

  if v_estado_paciente is null then
    raise exception 'paciente_ajeno' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' and v_estado_paciente = 'inactivo' then
    raise exception 'paciente_inactivo' using errcode = 'P0001';
  end if;

  select c.zona_horaria into v_zona
  from public.consultorios c
  where c.id = new.consultorio_id;

  v_inicio_local := new.inicio at time zone v_zona;
  v_fin_local := new.fin at time zone v_zona;

  if v_inicio_local::date is distinct from v_fin_local::date then
    raise exception 'turno_cruza_dia' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.turnos t
    where t.consultorio_id = new.consultorio_id
      and t.id is distinct from new.id
      and t.estado <> 'cancelado'
      and t.inicio < new.fin
      and t.fin > new.inicio
  ) then
    raise exception 'turno_solapado' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.bloqueos_agenda b
    where b.consultorio_id = new.consultorio_id
      and b.inicio < new.fin
      and b.fin > new.inicio
  ) then
    raise exception 'turno_en_bloqueo' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.horarios_atencion h where h.consultorio_id = new.consultorio_id
  ) into v_hay_horarios;

  if v_hay_horarios then
    v_dow := extract(isodow from v_inicio_local);
    v_hora_inicio := v_inicio_local::time;
    v_hora_fin := v_fin_local::time;

    if not exists (
      select 1
      from public.horarios_atencion h
      where h.consultorio_id = new.consultorio_id
        and h.dia_semana = v_dow
        and h.hora_inicio <= v_hora_inicio
        and h.hora_fin >= v_hora_fin
    ) then
      raise exception 'turno_fuera_de_horario' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function privado.validar_turno() from public;

create trigger turnos_validar
  before insert or update on public.turnos
  for each row execute function privado.validar_turno();

create or replace function privado.validar_evolucion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.turno_id is not null then
    if not exists (
      select 1
      from public.turnos t
      where t.id = new.turno_id
        and t.paciente_id = new.paciente_id
        and t.consultorio_id = new.consultorio_id
    ) then
      raise exception 'turno_ajeno' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function privado.validar_evolucion() from public;

create trigger evoluciones_validar
  before insert or update on public.evoluciones
  for each row execute function privado.validar_evolucion();

create or replace function privado.versionar_evolucion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.titulo is not distinct from new.titulo
     and old.contenido is not distinct from new.contenido
     and old.observaciones is not distinct from new.observaciones
     and old.indicaciones is not distinct from new.indicaciones
     and old.es_borrador is not distinct from new.es_borrador
     and old.visible_para_paciente is not distinct from new.visible_para_paciente
  then
    return new;
  end if;

  insert into public.evoluciones_versiones (
    evolucion_id, consultorio_id, profesional_id,
    titulo, contenido, observaciones, indicaciones,
    es_borrador, visible_para_paciente
  ) values (
    old.id, old.consultorio_id, (select auth.uid()),
    old.titulo, old.contenido, old.observaciones, old.indicaciones,
    old.es_borrador, old.visible_para_paciente
  );

  if new.visible_para_paciente and not old.visible_para_paciente then
    perform privado.registrar_auditoria(
      'evolucion.compartida', 'evoluciones', new.id::text, new.consultorio_id,
      jsonb_build_object('paciente_id', new.paciente_id)
    );
  end if;

  return new;
end;
$$;

revoke all on function privado.versionar_evolucion() from public;

create trigger evoluciones_versionar
  after update on public.evoluciones
  for each row execute function privado.versionar_evolucion();

create or replace function privado.auditar_paciente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform privado.registrar_auditoria('paciente.creado', 'pacientes', new.id::text, new.consultorio_id);
    return new;
  end if;

  if old.estado = 'activo' and new.estado = 'inactivo' then
    perform privado.registrar_auditoria('paciente.desactivado', 'pacientes', new.id::text, new.consultorio_id);
  elsif old.estado = 'inactivo' and new.estado = 'activo' then
    perform privado.registrar_auditoria('paciente.reactivado', 'pacientes', new.id::text, new.consultorio_id);
  end if;
  return new;
end;
$$;

revoke all on function privado.auditar_paciente() from public;

create trigger pacientes_auditar_alta
  after insert on public.pacientes
  for each row execute function privado.auditar_paciente();

create trigger pacientes_auditar_estado
  after update of estado on public.pacientes
  for each row execute function privado.auditar_paciente();

create or replace function privado.completar_objetivo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'completado' and new.completado_en is null then
    new.completado_en := now();
  end if;
  if new.estado <> 'completado' then
    new.completado_en := null;
  end if;
  return new;
end;
$$;

revoke all on function privado.completar_objetivo() from public;

create trigger objetivos_completar
  before insert or update on public.objetivos
  for each row execute function privado.completar_objetivo();

-- -----------------------------------------------------------------------------
-- Permisos explícitos
-- -----------------------------------------------------------------------------
revoke all on table public.pacientes from anon, authenticated;
grant select on table public.pacientes to authenticated;
grant insert (
  consultorio_id, nombre, apellido, correo, telefono, documento,
  fecha_nacimiento, notas_administrativas, estado
) on table public.pacientes to authenticated;
grant update (
  nombre, apellido, correo, telefono, documento, fecha_nacimiento,
  notas_administrativas, estado
) on table public.pacientes to authenticated;

revoke all on table public.horarios_atencion from anon, authenticated;
grant select, delete on table public.horarios_atencion to authenticated;
grant insert (consultorio_id, dia_semana, hora_inicio, hora_fin) on table public.horarios_atencion to authenticated;
grant update (dia_semana, hora_inicio, hora_fin) on table public.horarios_atencion to authenticated;

revoke all on table public.bloqueos_agenda from anon, authenticated;
grant select, delete on table public.bloqueos_agenda to authenticated;
grant insert (consultorio_id, inicio, fin, motivo) on table public.bloqueos_agenda to authenticated;
grant update (inicio, fin, motivo) on table public.bloqueos_agenda to authenticated;

revoke all on table public.turnos from anon, authenticated;
grant select on table public.turnos to authenticated;
grant insert (
  consultorio_id, paciente_id, inicio, fin, tipo, motivo, notas_administrativas, estado
) on table public.turnos to authenticated;
grant update (
  paciente_id, inicio, fin, tipo, motivo, notas_administrativas, estado,
  cancelado_en, motivo_cancelacion
) on table public.turnos to authenticated;

revoke all on table public.evoluciones from anon, authenticated;
grant select on table public.evoluciones to authenticated;
grant insert (
  consultorio_id, paciente_id, turno_id, titulo, contenido, observaciones,
  indicaciones, es_borrador, visible_para_paciente
) on table public.evoluciones to authenticated;
grant update (
  turno_id, titulo, contenido, observaciones, indicaciones, es_borrador, visible_para_paciente
) on table public.evoluciones to authenticated;
grant delete on table public.evoluciones to authenticated;

revoke all on table public.evoluciones_versiones from anon, authenticated;
grant select on table public.evoluciones_versiones to authenticated;

revoke all on table public.objetivos from anon, authenticated;
grant select on table public.objetivos to authenticated;
grant insert (
  consultorio_id, paciente_id, titulo, descripcion, categoria, fecha_objetivo,
  estado, progreso, valor_inicial, valor_objetivo, unidad, observaciones, visible_para_paciente
) on table public.objetivos to authenticated;
grant update (
  titulo, descripcion, categoria, fecha_objetivo, estado, progreso,
  valor_inicial, valor_objetivo, unidad, observaciones, visible_para_paciente, completado_en
) on table public.objetivos to authenticated;

revoke all on table public.mediciones from anon, authenticated;
grant select on table public.mediciones to authenticated;
grant insert (
  consultorio_id, paciente_id, registrado_en, peso_kg, talla_cm,
  circunferencia_cintura_cm, circunferencia_cadera_cm, porcentaje_grasa,
  masa_muscular_kg, observaciones, visible_para_paciente
) on table public.mediciones to authenticated;
grant update (
  registrado_en, peso_kg, talla_cm, circunferencia_cintura_cm, circunferencia_cadera_cm,
  porcentaje_grasa, masa_muscular_kg, observaciones, visible_para_paciente
) on table public.mediciones to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- El superadministrador no tiene políticas: no accede al contenido clínico.
-- El portal del paciente se habilitará en la fase 3 con políticas específicas
-- sobre filas con visible_para_paciente y usuario_id vinculado.
-- -----------------------------------------------------------------------------
alter table public.pacientes enable row level security;
alter table public.horarios_atencion enable row level security;
alter table public.bloqueos_agenda enable row level security;
alter table public.turnos enable row level security;
alter table public.evoluciones enable row level security;
alter table public.evoluciones_versiones enable row level security;
alter table public.objetivos enable row level security;
alter table public.mediciones enable row level security;

create policy "pacientes: miembros seleccionan"
  on public.pacientes for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "pacientes: miembros insertan"
  on public.pacientes for insert to authenticated
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "pacientes: miembros actualizan"
  on public.pacientes for update to authenticated
  using (privado.es_miembro_consultorio(consultorio_id))
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "horarios: miembros seleccionan"
  on public.horarios_atencion for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "horarios: miembros insertan"
  on public.horarios_atencion for insert to authenticated
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "horarios: miembros actualizan"
  on public.horarios_atencion for update to authenticated
  using (privado.es_miembro_consultorio(consultorio_id))
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "horarios: miembros eliminan"
  on public.horarios_atencion for delete to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "bloqueos: miembros seleccionan"
  on public.bloqueos_agenda for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "bloqueos: miembros insertan"
  on public.bloqueos_agenda for insert to authenticated
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "bloqueos: miembros actualizan"
  on public.bloqueos_agenda for update to authenticated
  using (privado.es_miembro_consultorio(consultorio_id))
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "bloqueos: miembros eliminan"
  on public.bloqueos_agenda for delete to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "turnos: miembros seleccionan"
  on public.turnos for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "turnos: miembros insertan"
  on public.turnos for insert to authenticated
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "turnos: miembros actualizan"
  on public.turnos for update to authenticated
  using (privado.es_miembro_consultorio(consultorio_id))
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "evoluciones: miembros seleccionan"
  on public.evoluciones for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "evoluciones: miembros insertan"
  on public.evoluciones for insert to authenticated
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "evoluciones: miembros actualizan"
  on public.evoluciones for update to authenticated
  using (privado.es_miembro_consultorio(consultorio_id))
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "evoluciones: el autor borra borradores"
  on public.evoluciones for delete to authenticated
  using (
    es_borrador
    and profesional_id = (select auth.uid())
    and privado.es_miembro_consultorio(consultorio_id)
  );

create policy "versiones: miembros seleccionan"
  on public.evoluciones_versiones for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "objetivos: miembros seleccionan"
  on public.objetivos for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "objetivos: miembros insertan"
  on public.objetivos for insert to authenticated
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "objetivos: miembros actualizan"
  on public.objetivos for update to authenticated
  using (privado.es_miembro_consultorio(consultorio_id))
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "mediciones: miembros seleccionan"
  on public.mediciones for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "mediciones: miembros insertan"
  on public.mediciones for insert to authenticated
  with check (privado.es_miembro_consultorio(consultorio_id));

create policy "mediciones: miembros actualizan"
  on public.mediciones for update to authenticated
  using (privado.es_miembro_consultorio(consultorio_id))
  with check (privado.es_miembro_consultorio(consultorio_id));
