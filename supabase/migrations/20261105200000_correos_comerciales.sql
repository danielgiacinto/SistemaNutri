-- Cola privada para avisos comerciales. Nunca contiene datos clínicos ni contraseñas.
create table public.correos_comerciales (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios(id) on delete cascade,
  clave_evento text not null check (char_length(clave_evento) between 1 and 160),
  tipo text not null check (tipo in ('prueba_por_vencer', 'prueba_vencida', 'cobro_rechazado', 'cobro_confirmado')),
  destinatario text not null,
  asunto text not null,
  texto text not null,
  intentos integer not null default 0 check (intentos >= 0),
  siguiente_intento_en timestamptz not null default now(),
  reclamado_en timestamptz,
  enviado_en timestamptz,
  mensaje_id text,
  ultimo_error text,
  creado_en timestamptz not null default now(),
  unique (consultorio_id, clave_evento)
);
create index correos_comerciales_pendientes on public.correos_comerciales(siguiente_intento_en)
  where enviado_en is null and intentos < 5;
alter table public.correos_comerciales enable row level security;
revoke all on public.correos_comerciales from public, anon, authenticated;
grant select, insert, update on public.correos_comerciales to service_role;

create function public.reclamar_correos_comerciales(p_limite integer default 10)
returns setof public.correos_comerciales
language plpgsql security definer set search_path = '' as $$
begin
  return query
  update public.correos_comerciales c set reclamado_en = now(), intentos = c.intentos + 1,
    siguiente_intento_en = now() + make_interval(mins => least(1440, 10 * (1 << least(c.intentos, 7))))
  where c.id in (
    select p.id from public.correos_comerciales p
    where p.enviado_en is null and p.intentos < 5 and p.siguiente_intento_en <= now()
    order by p.siguiente_intento_en, p.id limit least(greatest(p_limite, 1), 20)
    for update skip locked
  ) returning c.*;
end;
$$;
revoke all on function public.reclamar_correos_comerciales(integer) from public, anon, authenticated;
grant execute on function public.reclamar_correos_comerciales(integer) to service_role;
