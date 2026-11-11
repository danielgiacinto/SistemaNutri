-- Aclaraciones y nota de precios privadas hasta habilitar reservas (fase 13).
alter table public.servicios_consultorio add column aclaracion_paciente text not null default '' check (length(aclaracion_paciente) <= 300);
alter table public.configuracion_financiera add column nota_precios text not null default '' check (length(nota_precios) <= 1000);
-- Se conservan las políticas SELECT por dueño y consultorio. Las escrituras siguen
-- reservadas a RPC autorizadas: no se otorgan INSERT, UPDATE ni DELETE a las tablas.
grant select(aclaracion_paciente) on public.servicios_consultorio to authenticated;
grant select(nota_precios) on public.configuracion_financiera to authenticated;
revoke insert(aclaracion_paciente), update(aclaracion_paciente) on public.servicios_consultorio from anon, authenticated;
revoke insert(nota_precios), update(nota_precios) on public.configuracion_financiera from anon, authenticated;

create function public.gestionar_presentacion_catalogo(p_datos jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare usuario uuid := auth.uid(); consultorio uuid; identificador uuid; aclaracion text; nota text;
begin
  select consultorio_id into consultorio from public.miembros_consultorio
    where usuario_id=usuario and privado.es_miembro_consultorio(consultorio_id) limit 1;
  if usuario is null or consultorio is null then raise exception 'sin_permiso'; end if;
  if p_datos->>'tipo' = 'nota' then
    if jsonb_typeof(p_datos->'nota') is distinct from 'string' then raise exception 'texto_invalido'; end if;
    nota := btrim(p_datos->>'nota');
    if length(nota)>1000 then raise exception 'texto_invalido'; end if;
    insert into public.configuracion_financiera(profesional_id,consultorio_id,nota_precios)
      values(usuario,consultorio,nota) on conflict(profesional_id) do update set nota_precios=excluded.nota_precios
      where configuracion_financiera.consultorio_id=consultorio;
    if not found then raise exception 'sin_permiso'; end if;
  elsif p_datos->>'tipo' = 'servicio' then
    if jsonb_typeof(p_datos->'aclaracion') is distinct from 'string' then raise exception 'texto_invalido'; end if;
    aclaracion := btrim(p_datos->>'aclaracion');
    if length(aclaracion)>300 then raise exception 'texto_invalido'; end if;
    identificador := coalesce(nullif(p_datos->>'id','')::uuid,gen_random_uuid());
    -- Reutiliza validación monetaria y autorización; todo se guarda atómicamente.
    perform public.gestionar_finanzas('servicio',jsonb_set(p_datos,'{id}',to_jsonb(identificador)));
    update public.servicios_consultorio set aclaracion_paciente=aclaracion
      where id=identificador and profesional_id=usuario and consultorio_id=consultorio;
    if not found then raise exception 'sin_permiso'; end if;
  else raise exception 'accion_invalida'; end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.gestionar_presentacion_catalogo(jsonb) from public, anon;
grant execute on function public.gestionar_presentacion_catalogo(jsonb) to authenticated;
