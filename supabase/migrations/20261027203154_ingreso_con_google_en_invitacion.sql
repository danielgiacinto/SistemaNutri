-- Google también alcanza para volver a entrar, aunque el correo de la invitación
-- haya dejado la marca de "elegí una contraseña".

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
        coalesce(u.raw_app_meta_data ->> 'provider', 'email') <> 'email'
        or exists (
          select 1
          from jsonb_array_elements_text(coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb)) as proveedor(valor)
          where proveedor.valor <> 'email'
        )
        or (
          coalesce(u.raw_user_meta_data ->> 'debe_elegir_contrasena', '') <> 'true'
          and coalesce(u.encrypted_password, '') <> ''
        )
      )
  );
$$;
