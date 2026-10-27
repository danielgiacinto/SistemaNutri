-- El correo de confirmación necesita el nombre del consultorio para hablarle
-- al paciente. Solo devuelve ese nombre, y solo si hay una invitación vigente.

create or replace function public.nombre_consultorio_invitacion(
  p_correo text default null,
  p_huella text default null
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select i.consultorio_nombre
  from public.invitaciones_paciente i
  where i.aceptada_en is null
    and i.revocada_en is null
    and i.expira_en > now()
    and (
      (p_huella is not null and i.token_hash = p_huella)
      or (
        p_huella is null
        and p_correo is not null
        and lower(i.correo) = lower(btrim(p_correo))
      )
    )
  order by i.creado_en desc
  limit 1;
$$;

revoke all on function public.nombre_consultorio_invitacion(text, text) from public;
grant execute on function public.nombre_consultorio_invitacion(text, text) to anon, authenticated;

comment on function public.nombre_consultorio_invitacion(text, text) is
  'Nombre del consultorio de una invitación pendiente. No devuelve datos clínicos.';
