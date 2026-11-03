-- La función compartida no debe leer campos exclusivos de planes desde otros
-- triggers (por ejemplo, turnos). Se anida la lectura bajo el nombre de tabla.
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
      if tg_table_name = 'planes_alimentarios' then
        if new.titulo is distinct from old.titulo
           or new.indicaciones is distinct from old.indicaciones
        then
          new.cambios_sin_publicar := true;
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function privado.establecer_actor() from public;
