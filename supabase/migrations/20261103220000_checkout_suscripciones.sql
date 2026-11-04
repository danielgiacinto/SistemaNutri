-- El titular prepara un checkout pendiente. Solo el webhook puede acreditar
-- cobertura o confirmar el estado que informa Mercado Pago.
revoke update (mp_id, estado_mp, cobertura_hasta, ultimo_cobro_en, proximo_cobro_en, mp_actualizado_en, cancelada_en)
  on public.suscripciones from authenticated;
grant update (mp_id, estado_mp, precio, moneda) on public.suscripciones to authenticated;
grant select, insert, update on public.suscripciones to service_role;
grant select, insert, update on public.eventos_proveedor to service_role;

create or replace function privado.validar_checkout_suscripcion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_precio numeric;
begin
  if current_user = 'authenticated' then
    if new.estado_mp <> 'pending' or new.mp_id is null or new.moneda <> 'ARS' then
      raise exception 'checkout_invalido' using errcode = '42501';
    end if;
    select c.precio_mensual into v_precio from public.configuracion_comercial c where c.id;
    if v_precio is null or new.precio is distinct from v_precio then
      raise exception 'precio_desactualizado' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function privado.validar_checkout_suscripcion() from public, anon, authenticated;

create trigger validar_checkout_suscripcion
before insert or update on public.suscripciones
for each row execute function privado.validar_checkout_suscripcion();

-- Una notificación pendiente puede llegar antes que la aprobada del mismo pago.
-- Se actualiza la fila existente y solo se acredita una vez, con la moneda y
-- el importe correctos. El bloqueo también serializa cobros simultáneos.
create or replace function public.registrar_pago_verificado(
  p_mp_suscripcion text,
  p_mp_pago text,
  p_estado text,
  p_monto numeric,
  p_moneda text,
  p_cobrado_en timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_suscripcion public.suscripciones%rowtype;
  v_pago public.pagos_suscripcion%rowtype;
  v_desde timestamptz;
  v_hasta timestamptz;
begin
  if p_estado not in ('aprobado', 'rechazado', 'pendiente', 'devuelto') or p_monto is null or p_monto < 0 then
    raise exception 'pago_invalido' using errcode = 'P0001';
  end if;
  select * into v_suscripcion from public.suscripciones where mp_id = p_mp_suscripcion for update;
  if not found then
    raise exception 'suscripcion_inexistente' using errcode = 'P0001';
  end if;

  insert into public.pagos_suscripcion (suscripcion_id, mp_pago_id, estado, monto, moneda, cobrado_en)
  values (v_suscripcion.id, p_mp_pago, p_estado, p_monto, p_moneda, p_cobrado_en)
  on conflict (mp_pago_id) do nothing;

  select * into v_pago from public.pagos_suscripcion where mp_pago_id = p_mp_pago for update;
  if v_pago.suscripcion_id <> v_suscripcion.id then
    raise exception 'pago_de_otra_suscripcion' using errcode = 'P0001';
  end if;

  -- Un reintento atrasado no degrada un pago ya aprobado o devuelto.
  if v_pago.estado = 'devuelto' or (v_pago.estado = 'aprobado' and p_estado in ('pendiente', 'rechazado')) then
    return;
  end if;
  update public.pagos_suscripcion
  set estado = p_estado, monto = p_monto, moneda = p_moneda, cobrado_en = p_cobrado_en
  where id = v_pago.id;

  if p_estado = 'aprobado' and p_moneda = v_suscripcion.moneda and
     p_monto >= v_suscripcion.precio and p_cobrado_en is not null and v_pago.periodo_hasta is null then
    v_desde := greatest(coalesce(v_suscripcion.cobertura_hasta, p_cobrado_en), p_cobrado_en);
    v_hasta := privado.sumar_periodo(v_desde, 1, 'meses');
    update public.pagos_suscripcion set periodo_desde = v_desde, periodo_hasta = v_hasta where id = v_pago.id;
    update public.suscripciones
    set cobertura_hasta = v_hasta, ultimo_cobro_en = p_cobrado_en,
        proximo_cobro_en = v_hasta, actualizado_en = now()
    where id = v_suscripcion.id;
  end if;
end;
$$;
revoke all on function public.registrar_pago_verificado(text, text, text, numeric, text, timestamptz) from public, anon, authenticated;
grant execute on function public.registrar_pago_verificado(text, text, text, numeric, text, timestamptz) to service_role;
