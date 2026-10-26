-- =============================================================================
-- Fase 3 — Portal del paciente e invitaciones.
--
-- El tipo de cuenta "paciente" solo lo asigna aceptar_invitacion(), nunca la API.
-- El portal lee turnos del paciente vinculado y, de la clínica, solo filas
-- marcadas como visibles. Las notas en borrador siguen sin compartirse.
-- =============================================================================

-- El trigger de pacientes congela usuario_id. La aceptación lo habilita
-- solo dentro de la transacción de aceptar_invitacion().
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
      new.consultorio_id := old.consultorio_id;
      if coalesce(current_setting('privado.vincular_paciente', true), '') <> '1' then
        new.usuario_id := old.usuario_id;
      end if;
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

create or replace function privado.correo_sesion()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  where u.id = (select auth.uid());
$$;

revoke all on function privado.correo_sesion() from public;
grant execute on function privado.correo_sesion() to authenticated;

-- -----------------------------------------------------------------------------
-- Invitaciones
-- -----------------------------------------------------------------------------
create table public.invitaciones_paciente (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios (id) on delete restrict,
  paciente_id uuid not null,
  consultorio_nombre text not null check (char_length(btrim(consultorio_nombre)) between 2 and 120),
  correo text not null check (char_length(correo) between 3 and 254),
  token_hash text not null check (token_hash ~ '^[0-9a-f]{64}$'),
  expira_en timestamptz not null,
  creada_por uuid references auth.users (id) on delete set null,
  aceptada_en timestamptz,
  revocada_en timestamptz,
  creado_en timestamptz not null default now(),
  foreign key (paciente_id, consultorio_id) references public.pacientes (id, consultorio_id) on delete cascade,
  check (aceptada_en is null or revocada_en is null)
);

comment on table public.invitaciones_paciente is
  'Invitación de un profesional para que una persona entre al portal. El token en claro no se guarda: solo su huella SHA-256.';

create unique index invitaciones_paciente_pendiente
  on public.invitaciones_paciente (paciente_id)
  where aceptada_en is null and revocada_en is null;

create index invitaciones_paciente_correo_pendiente
  on public.invitaciones_paciente (correo)
  where aceptada_en is null and revocada_en is null;

revoke all on table public.invitaciones_paciente from anon, authenticated;
grant select (
  id, consultorio_id, paciente_id, consultorio_nombre, correo, expira_en,
  creada_por, aceptada_en, revocada_en, creado_en
) on table public.invitaciones_paciente to authenticated;
grant insert (
  consultorio_id, paciente_id, consultorio_nombre, correo, token_hash, expira_en, creada_por
) on table public.invitaciones_paciente to authenticated;
grant update (revocada_en) on table public.invitaciones_paciente to authenticated;

alter table public.invitaciones_paciente enable row level security;

create policy "invitaciones: el consultorio las ve"
  on public.invitaciones_paciente for select to authenticated
  using (privado.es_miembro_consultorio(consultorio_id));

create policy "invitaciones: la persona invitada ve las suyas pendientes"
  on public.invitaciones_paciente for select to authenticated
  using (
    aceptada_en is null
    and revocada_en is null
    and expira_en > now()
    and correo = (select privado.correo_sesion())
  );

create policy "invitaciones: el consultorio las crea"
  on public.invitaciones_paciente for insert to authenticated
  with check (
    privado.es_miembro_consultorio(consultorio_id)
    and exists (
      select 1
      from public.pacientes p
      where p.id = paciente_id
        and p.consultorio_id = invitaciones_paciente.consultorio_id
        and p.estado = 'activo'
        and p.usuario_id is null
    )
  );

create policy "invitaciones: el consultorio las revoca"
  on public.invitaciones_paciente for update to authenticated
  using (privado.es_miembro_consultorio(consultorio_id) and aceptada_en is null)
  with check (privado.es_miembro_consultorio(consultorio_id));

-- -----------------------------------------------------------------------------
-- Lectura del portal. Las políticas de miembros siguen vigentes (se combinan con OR).
-- -----------------------------------------------------------------------------
create policy "consultorios: la persona ve el de su ficha"
  on public.consultorios for select to authenticated
  using (
    exists (
      select 1
      from public.pacientes p
      where p.consultorio_id = id
        and p.usuario_id = (select auth.uid())
        and p.estado = 'activo'
    )
  );

create policy "pacientes: la persona ve su ficha"
  on public.pacientes for select to authenticated
  using (usuario_id = (select auth.uid()) and estado = 'activo');

create policy "turnos: la persona ve los suyos"
  on public.turnos for select to authenticated
  using (
    exists (
      select 1
      from public.pacientes p
      where p.id = paciente_id
        and p.usuario_id = (select auth.uid())
        and p.estado = 'activo'
    )
  );

create policy "evoluciones: la persona ve las publicadas"
  on public.evoluciones for select to authenticated
  using (
    visible_para_paciente
    and es_borrador = false
    and exists (
      select 1
      from public.pacientes p
      where p.id = paciente_id
        and p.usuario_id = (select auth.uid())
        and p.estado = 'activo'
    )
  );

create policy "objetivos: la persona ve los compartidos"
  on public.objetivos for select to authenticated
  using (
    visible_para_paciente
    and exists (
      select 1
      from public.pacientes p
      where p.id = paciente_id
        and p.usuario_id = (select auth.uid())
        and p.estado = 'activo'
    )
  );

create policy "mediciones: la persona ve las compartidas"
  on public.mediciones for select to authenticated
  using (
    visible_para_paciente
    and exists (
      select 1
      from public.pacientes p
      where p.id = paciente_id
        and p.usuario_id = (select auth.uid())
        and p.estado = 'activo'
    )
  );

-- -----------------------------------------------------------------------------
-- Aceptar invitación: vincula usuario_id y asigna el tipo de cuenta.
-- p_huella vacío acepta la única invitación pendiente del correo de la sesión.
-- -----------------------------------------------------------------------------
create or replace function public.aceptar_invitacion(p_huella text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_correo text;
  v_invitacion public.invitaciones_paciente%rowtype;
  v_cantidad integer;
  v_tipo public.tipo_cuenta;
  v_estado public.estado_paciente;
  v_vinculo uuid;
begin
  if v_usuario_id is null then
    raise exception 'no_autenticado' using errcode = '42501';
  end if;

  v_correo := privado.correo_sesion();
  if v_correo is null then
    raise exception 'invitacion_invalida' using errcode = 'P0001';
  end if;

  if p_huella is not null and p_huella !~ '^[0-9a-f]{64}$' then
    raise exception 'invitacion_invalida' using errcode = 'P0001';
  end if;

  if p_huella is null then
    select count(*)::integer into v_cantidad
    from public.invitaciones_paciente i
    where i.correo = v_correo
      and i.aceptada_en is null
      and i.revocada_en is null
      and i.expira_en > now();

    if v_cantidad = 0 then
      raise exception 'invitacion_invalida' using errcode = 'P0001';
    end if;
    if v_cantidad > 1 then
      raise exception 'invitacion_ambigua' using errcode = 'P0001';
    end if;
  end if;

  select i.* into v_invitacion
  from public.invitaciones_paciente i
  where i.correo = v_correo
    and i.aceptada_en is null
    and i.revocada_en is null
    and i.expira_en > now()
    and (p_huella is null or i.token_hash = p_huella)
  for update;

  if not found then
    raise exception 'invitacion_invalida' using errcode = 'P0001';
  end if;

  select p.tipo_cuenta into v_tipo
  from public.perfiles p
  where p.id = v_usuario_id
  for update;

  if not found then
    raise exception 'perfil_inexistente' using errcode = 'P0001';
  end if;

  if v_tipo = 'profesional'
     or exists (select 1 from public.miembros_consultorio m where m.usuario_id = v_usuario_id) then
    raise exception 'cuenta_profesional' using errcode = 'P0001';
  end if;

  select pa.estado, pa.usuario_id into v_estado, v_vinculo
  from public.pacientes pa
  where pa.id = v_invitacion.paciente_id
  for update;

  if v_estado is distinct from 'activo' then
    raise exception 'paciente_inactivo' using errcode = 'P0001';
  end if;

  if v_vinculo is not null and v_vinculo is distinct from v_usuario_id then
    raise exception 'paciente_ya_vinculado' using errcode = 'P0001';
  end if;

  perform set_config('privado.vincular_paciente', '1', true);

  update public.pacientes
  set usuario_id = v_usuario_id
  where id = v_invitacion.paciente_id;

  update public.perfiles
  set tipo_cuenta = 'paciente'
  where id = v_usuario_id;

  update public.invitaciones_paciente
  set aceptada_en = now()
  where id = v_invitacion.id;

  perform privado.registrar_auditoria(
    'invitacion.aceptada',
    'pacientes',
    v_invitacion.paciente_id::text,
    v_invitacion.consultorio_id
  );
end;
$$;

revoke all on function public.aceptar_invitacion(text) from public, anon;
grant execute on function public.aceptar_invitacion(text) to authenticated;
