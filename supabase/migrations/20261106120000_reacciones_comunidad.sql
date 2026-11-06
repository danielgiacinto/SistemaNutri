create table public.reacciones_comunidad (
  actividad_id uuid not null references public.actividades_comunidad(id) on delete cascade,
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '🎉', '💪')),
  primary key (actividad_id, usuario_id, emoji)
);
alter table public.reacciones_comunidad enable row level security;
revoke all on public.reacciones_comunidad from anon, authenticated;
grant select, delete on public.reacciones_comunidad to authenticated;
grant insert (actividad_id, emoji) on public.reacciones_comunidad to authenticated;

create policy "reacciones: leer comentarios visibles"
on public.reacciones_comunidad for select to authenticated
using (exists (select 1 from public.actividades_comunidad a where a.id = actividad_id));

create policy "reacciones: paciente agrega las propias"
on public.reacciones_comunidad for insert to authenticated
with check (usuario_id = auth.uid() and exists (
  select 1 from public.actividades_comunidad a join public.desafios d on d.id = a.desafio_id
  where a.id = actividad_id and d.estado = 'publicado'
    and privado.paciente_activo_de_sesion(d.consultorio_id) is not null
));

create policy "reacciones: paciente quita las propias"
on public.reacciones_comunidad for delete to authenticated
using (usuario_id = auth.uid() and exists (
  select 1 from public.actividades_comunidad a join public.desafios d on d.id = a.desafio_id
  where a.id = actividad_id and d.estado = 'publicado'
    and privado.paciente_activo_de_sesion(d.consultorio_id) is not null
));
