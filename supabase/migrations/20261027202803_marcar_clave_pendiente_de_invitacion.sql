-- El alta por el correo de invitación deja un hash que la persona no conoce.
-- raw_user_meta_data.debe_elegir_contrasena marca que todavía tiene que elegir la suya.

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
      and coalesce(u.raw_user_meta_data ->> 'debe_elegir_contrasena', '') <> 'true'
      and (
        coalesce(u.encrypted_password, '') <> ''
        or coalesce(u.raw_app_meta_data ->> 'provider', 'email') <> 'email'
      )
  );
$$;
