-- La página pública puede mostrar el precio y la prueba sin iniciar sesión.
-- No expone la tabla completa: solo los datos comerciales que se publican.

create or replace function public.oferta_publica()
returns table (
  precio_mensual numeric,
  moneda text,
  prueba_cantidad integer,
  prueba_unidad text,
  pruebas_habilitadas boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.precio_mensual, c.moneda, c.prueba_cantidad, c.prueba_unidad, c.pruebas_habilitadas
  from public.configuracion_comercial c
  where c.id;
$$;

revoke all on function public.oferta_publica() from public;
grant execute on function public.oferta_publica() to anon, authenticated;

create or replace function privado.marcar_configuracion_comercial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

revoke all on function privado.marcar_configuracion_comercial() from public;

drop trigger if exists configuracion_comercial_actualizada on public.configuracion_comercial;
create trigger configuracion_comercial_actualizada
  before update on public.configuracion_comercial
  for each row execute function privado.marcar_configuracion_comercial();
