-- El correo de invitación abre una sesión de un solo uso. Esta función dice si
-- la persona ya puede volver a entrar sola: tiene contraseña o ingresó con
-- otro proveedor (por ejemplo Google).

create or replace function public.tiene_ingreso_propio()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and (
        coalesce(u.encrypted_password, '') <> ''
        or coalesce(u.raw_app_meta_data ->> 'provider', 'email') <> 'email'
      )
  );
$$;

revoke all on function public.tiene_ingreso_propio() from public, anon;
grant execute on function public.tiene_ingreso_propio() to authenticated;

comment on function public.tiene_ingreso_propio() is
  'True si la sesión puede volver a entrar con contraseña o con un proveedor distinto del correo.';
