-- Fase 12: documentos por bloques, copias reutilizables y entregas inmutables.
alter table public.planes_alimentarios
  add column documento jsonb,
  add column revision integer not null default 0,
  add column plantilla_id uuid,
  add column ultima_solicitud uuid,
  add column ultima_respuesta jsonb;
alter table public.planes_publicaciones add column documento jsonb, add column presentacion jsonb;

create function privado.revision_documento_plan() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.titulo is distinct from old.titulo or new.indicaciones is distinct from old.indicaciones or new.documento is distinct from old.documento then
    new.revision:=old.revision+1;
    new.cambios_sin_publicar:=true;
  end if;
  return new;
end $$;
revoke all on function privado.revision_documento_plan() from public,anon,authenticated;
create trigger planes_revision_documento before update on public.planes_alimentarios for each row execute function privado.revision_documento_plan();

create table public.plantillas_planes (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid references public.consultorios(id) on delete restrict,
  base boolean not null default false,
  clase text not null default 'plan' check(clase in ('plan','grilla')),
  titulo text not null check(char_length(btrim(titulo)) between 1 and 160),
  indicaciones text not null default '' check(char_length(indicaciones)<=8000),
  documento jsonb not null,
  version integer not null default 1 check(version>0),
  licencia text not null default 'Contenido propio del consultorio.',
  actualizado_en timestamptz not null default now(),
  check((base and consultorio_id is null) or (not base and consultorio_id is not null))
);
alter table public.planes_alimentarios add foreign key(plantilla_id) references public.plantillas_planes(id) on delete restrict;
create index plantillas_planes_consultorio on public.plantillas_planes(consultorio_id,actualizado_en desc);
alter table public.plantillas_planes enable row level security;
revoke all on public.plantillas_planes from anon,authenticated;
grant select on public.plantillas_planes to authenticated;
create policy plantillas_lectura on public.plantillas_planes for select to authenticated using (
  privado.es_miembro_consultorio(consultorio_id) or (base and exists(
    select 1 from public.miembros_consultorio m where m.usuario_id=auth.uid() and privado.es_miembro_consultorio(m.consultorio_id)))
);
create policy plantillas_insercion on public.plantillas_planes for insert to authenticated with check(false);
create policy plantillas_actualizacion on public.plantillas_planes for update to authenticated using(false) with check(false);
create policy plantillas_eliminacion on public.plantillas_planes for delete to authenticated using(false);

create function privado.consultorio_planes() returns uuid
language plpgsql stable security definer set search_path='' as $$
declare consultorio uuid;
begin
  select m.consultorio_id into consultorio from public.miembros_consultorio m
  where m.usuario_id=auth.uid() and privado.es_miembro_consultorio(m.consultorio_id) limit 1;
  if consultorio is null then raise exception 'sin_permiso'; end if;
  return consultorio;
end $$;
revoke all on function privado.consultorio_planes() from public,anon,authenticated;

-- Valida también las llamadas directas a la RPC. Las instantáneas se obtienen de
-- versiones persistidas del mismo consultorio, nunca de valores del navegador.
create function privado.normalizar_documento_plan(p_documento jsonb,p_consultorio uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare bloque jsonb; entrada jsonb; referencia jsonb; etiqueta jsonb; instantanea jsonb;
  bloques jsonb:='[]'; entradas jsonb; recursos jsonb; identificador uuid; total integer:=0;
begin
  if p_documento is null or jsonb_typeof(p_documento)<>'object' or octet_length(p_documento::text)>2000000
    or jsonb_typeof(p_documento->'objetivo') is distinct from 'string' or char_length(p_documento->>'objetivo')>1000
    or jsonb_typeof(p_documento->'etiquetas') is distinct from 'array' or jsonb_array_length(p_documento->'etiquetas')>6
    or jsonb_typeof(p_documento->'bloques') is distinct from 'array' or jsonb_array_length(p_documento->'bloques')>20
  then raise exception 'documento_invalido'; end if;
  for etiqueta in select value from jsonb_array_elements(p_documento->'etiquetas') loop
    if etiqueta#>>'{}' not in ('Descenso','Aumento','Mantenimiento','Deportivo','Clínico','Vegetariano') then raise exception 'documento_invalido'; end if;
  end loop;
  for bloque in select value from jsonb_array_elements(p_documento->'bloques') loop
    identificador:=(bloque->>'id')::uuid;
    if identificador is null or exists(select 1 from jsonb_array_elements(bloques) b where b->>'id'=identificador::text)
      or coalesce(bloque->>'tipo','') not in ('semana','opciones','texto')
      or jsonb_typeof(bloque->'titulo') is distinct from 'string' or char_length(btrim(bloque->>'titulo')) not between 1 and 160
      or jsonb_typeof(bloque->'texto') is distinct from 'string' or char_length(bloque->>'texto')>8000
      or jsonb_typeof(bloque->'entradas') is distinct from 'array' or jsonb_array_length(bloque->'entradas')>100
    then raise exception 'documento_invalido'; end if;
    entradas:='[]';
    for entrada in select value from jsonb_array_elements(bloque->'entradas') loop
      total:=total+1;
      identificador:=(entrada->>'id')::uuid;
      if total>200 or identificador is null or exists(select 1 from jsonb_array_elements(entradas) e where e->>'id'=identificador::text)
        or jsonb_typeof(entrada->'dia') is distinct from 'number' or (entrada->>'dia')::numeric not between 0 and 6 or (entrada->>'dia')::numeric<>trunc((entrada->>'dia')::numeric)
        or coalesce(entrada->>'momento','') not in ('desayuno','media_manana','almuerzo','merienda','cena','colacion')
        or jsonb_typeof(entrada->'detalle') is distinct from 'string' or char_length(entrada->>'detalle')>2000
        or jsonb_typeof(entrada->'recursos') is distinct from 'array' or jsonb_array_length(entrada->'recursos')>5
      then raise exception 'documento_invalido'; end if;
      recursos:='[]';
      for referencia in select value from jsonb_array_elements(entrada->'recursos') loop
        if jsonb_typeof(referencia->'cantidad') is distinct from 'number' or (referencia->>'cantidad')::numeric not between .01 and 1000
          or jsonb_typeof(referencia->'version') is distinct from 'number' or (referencia->>'version')::numeric<1
          or (referencia->>'version')::numeric<>trunc((referencia->>'version')::numeric)
        then raise exception 'documento_invalido'; end if;
        select v.instantanea into instantanea from public.biblioteca_versiones v
          join public.biblioteca_recursos r on r.id=v.recurso_id
          where r.id=(referencia->>'id')::uuid and r.consultorio_id=p_consultorio
          and r.tipo in ('plato','plato_grupos','suplemento') and v.version=(referencia->>'version')::integer;
        if instantanea is null then raise exception 'referencia_invalida'; end if;
        if instantanea#>>'{recurso,tipo}'='suplemento' then
          if jsonb_typeof(referencia->'variante') is distinct from 'number' or (referencia->>'variante')::numeric<>trunc((referencia->>'variante')::numeric)
            or (referencia->>'variante')::integer not between 0 and jsonb_array_length(instantanea#>'{recurso,contenido,variantes}')-1
          then raise exception 'referencia_invalida'; end if;
        elsif coalesce(referencia->'variante','null'::jsonb)<>'null'::jsonb then raise exception 'referencia_invalida'; end if;
        recursos:=recursos||jsonb_build_array(jsonb_build_object('id',referencia->>'id','version',(referencia->>'version')::integer,
          'cantidad',(referencia->>'cantidad')::numeric,'variante',referencia->'variante','instantanea',instantanea-'historial'));
      end loop;
      entradas:=entradas||jsonb_build_array(jsonb_build_object('id',identificador,'dia',(entrada->>'dia')::integer,
        'momento',entrada->>'momento','detalle',entrada->>'detalle','recursos',recursos));
    end loop;
    if bloque->>'tipo'='texto' and jsonb_array_length(entradas)>0 then raise exception 'documento_invalido'; end if;
    bloques:=bloques||jsonb_build_array(jsonb_build_object('id',bloque->>'id','tipo',bloque->>'tipo','titulo',btrim(bloque->>'titulo'),'texto',bloque->>'texto','entradas',entradas));
  end loop;
  return jsonb_build_object('objetivo',btrim(p_documento->>'objetivo'),'etiquetas',p_documento->'etiquetas','bloques',bloques);
end $$;
revoke all on function privado.normalizar_documento_plan(jsonb,uuid) from public,anon,authenticated;

create function public.consultar_plantillas_planes() returns jsonb
language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('usos',
    (select count(*) from public.planes_alimentarios a where a.plantilla_id=p.id),'entregas',
    (select count(*) from public.planes_alimentarios a where a.plantilla_id=p.id and exists(select 1 from public.planes_publicaciones pub where pub.plan_id=a.id))) order by p.actualizado_en desc),'[]'::jsonb)
  from public.plantillas_planes p;
$$;

create function public.gestionar_plantilla_plan(p_accion text,p_datos jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare consultorio uuid:=privado.consultorio_planes(); original public.plantillas_planes; resultado public.plantillas_planes; normalizado jsonb;
begin
  if p_accion in ('guardar','duplicar') then
    select * into original from public.plantillas_planes where id=(p_datos->>'id')::uuid and (consultorio_id=consultorio or base) for update;
    if not found or (p_accion='guardar' and original.base) then raise exception 'sin_permiso'; end if;
    if original.version is distinct from (p_datos->>'version')::integer then raise exception 'version_desactualizada'; end if;
  end if;
  if p_accion='duplicar' then
    insert into public.plantillas_planes(consultorio_id,clase,titulo,indicaciones,documento)
    values(consultorio,original.clase,left(original.titulo,150)||' (copia)',original.indicaciones,original.documento) returning * into resultado;
  elsif p_accion in ('crear','guardar') then
    if p_datos->>'titulo' is null or char_length(btrim(p_datos->>'titulo')) not between 1 and 160 or char_length(coalesce(p_datos->>'indicaciones',''))>8000 then raise exception 'documento_invalido'; end if;
    normalizado:=privado.normalizar_documento_plan(p_datos->'documento',consultorio);
    if p_accion='crear' then
      insert into public.plantillas_planes(consultorio_id,clase,titulo,indicaciones,documento)
      values(consultorio,coalesce(p_datos->>'clase','plan'),btrim(p_datos->>'titulo'),coalesce(p_datos->>'indicaciones',''),normalizado) returning * into resultado;
    else
      update public.plantillas_planes set titulo=btrim(p_datos->>'titulo'),indicaciones=coalesce(p_datos->>'indicaciones',''),documento=normalizado,
        version=version+1,actualizado_en=clock_timestamp() where id=original.id returning * into resultado;
    end if;
  else raise exception 'documento_invalido'; end if;
  return to_jsonb(resultado)||jsonb_build_object('entregas',0);
end $$;

create function public.crear_plan_desde_plantilla(p_plantilla_id uuid,p_paciente_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare consultorio uuid:=privado.consultorio_planes(); plantilla public.plantillas_planes; identificador uuid;
begin
  select * into plantilla from public.plantillas_planes where id=p_plantilla_id and clase='plan' and (consultorio_id=consultorio or base) for share;
  if not found then raise exception 'sin_permiso'; end if;
  if not exists(select 1 from public.pacientes where id=p_paciente_id and consultorio_id=consultorio and estado='activo') then raise exception 'sin_permiso'; end if;
  insert into public.planes_alimentarios(consultorio_id,paciente_id,titulo,indicaciones,documento,plantilla_id)
  values(consultorio,p_paciente_id,plantilla.titulo,plantilla.indicaciones,plantilla.documento,plantilla.id) returning id into identificador;
  return identificador;
end $$;

-- Un guardado y su publicación forman una única transacción. La revisión evita
-- sobreescrituras y la solicitud permite reintentar una respuesta perdida.
create function public.guardar_plan_visual(p_datos jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare consultorio uuid:=privado.consultorio_planes(); plan public.planes_alimentarios; normalizado jsonb;
  numero integer; respuesta jsonb; publicacion uuid; solicitud uuid:=(p_datos->>'solicitud')::uuid;
begin
  select * into plan from public.planes_alimentarios where id=(p_datos->>'id')::uuid and consultorio_id=consultorio for update;
  if not found then raise exception 'sin_permiso'; end if;
  if solicitud is null then raise exception 'documento_invalido'; end if;
  if plan.ultima_solicitud=solicitud then return plan.ultima_respuesta; end if;
  if plan.revision is distinct from (p_datos->>'revision')::integer then raise exception 'version_desactualizada'; end if;
  if p_datos->>'titulo' is null or char_length(btrim(p_datos->>'titulo')) not between 1 and 160 or char_length(coalesce(p_datos->>'indicaciones',''))>8000
    or jsonb_typeof(p_datos->'publicar') is distinct from 'boolean' then raise exception 'documento_invalido'; end if;
  normalizado:=privado.normalizar_documento_plan(p_datos->'documento',consultorio);
  if (p_datos->>'publicar')::boolean then
    if plan.paciente_id is distinct from (p_datos->>'pacienteId')::uuid then raise exception 'destinatario_invalido'; end if;
    if not exists(select 1 from public.pacientes where id=plan.paciente_id and consultorio_id=consultorio and estado='activo') then raise exception 'destinatario_invalido'; end if;
    if not exists(select 1 from jsonb_array_elements(normalizado->'bloques') b where b->>'tipo'='texto' and btrim(b->>'texto')<>''
      or exists(select 1 from jsonb_array_elements(b->'entradas') e where btrim(e->>'detalle')<>'' or jsonb_array_length(e->'recursos')>0)) then raise exception 'plan_vacio'; end if;
    select coalesce(max(p.numero),0)+1 into numero from public.planes_publicaciones p where p.plan_id=plan.id;
    insert into public.planes_publicaciones(plan_id,consultorio_id,paciente_id,numero,titulo,indicaciones,documento,presentacion)
      select plan.id,consultorio,plan.paciente_id,numero,btrim(p_datos->>'titulo'),p_datos->>'indicaciones',normalizado,
        jsonb_build_object('paciente',btrim(p.nombre||' '||p.apellido),'profesional',btrim(per.nombre||' '||per.apellido),'consultorio',c.nombre)
      from public.pacientes p join public.consultorios c on c.id=p.consultorio_id join public.perfiles per on per.id=auth.uid()
      where p.id=plan.paciente_id returning id into publicacion;
  end if;
  respuesta:=jsonb_build_object('revision',plan.revision+1,'numero',numero,'documento',normalizado);
  update public.planes_alimentarios set titulo=btrim(p_datos->>'titulo'),indicaciones=p_datos->>'indicaciones',documento=normalizado,
    revision=plan.revision+1,ultima_solicitud=solicitud,ultima_respuesta=respuesta,cambios_sin_publicar=true where id=plan.id;
  -- El trigger compartido marca cambios al actualizar título/indicaciones.
  if numero is not null then update public.planes_alimentarios set cambios_sin_publicar=false where id=plan.id; end if;
  return respuesta;
end $$;

-- El editor anterior conserva su API, pero no puede publicar o sobrescribir un
-- documento visual con una lista de comidas que ya dejó de ser su fuente.
alter function public.guardar_plan(uuid,text,text,jsonb) rename to guardar_plan_anterior;
alter function public.publicar_plan(uuid) rename to publicar_plan_anterior;
revoke all on function public.guardar_plan_anterior(uuid,text,text,jsonb),public.publicar_plan_anterior(uuid) from public,anon,authenticated;
create function public.guardar_plan(p_plan_id uuid,p_titulo text,p_indicaciones text,p_comidas jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.planes_alimentarios where id=p_plan_id for update;
  if exists(select 1 from public.planes_alimentarios where id=p_plan_id and documento is not null) then raise exception 'editor_visual_requerido'; end if;
  perform public.guardar_plan_anterior(p_plan_id,p_titulo,p_indicaciones,p_comidas);
  -- La revisión también cambia si solo se modifica la lista anterior de comidas.
  update public.planes_alimentarios set revision=revision+1 where id=p_plan_id;
end $$;
create function public.publicar_plan(p_plan_id uuid) returns integer
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.planes_alimentarios where id=p_plan_id for update;
  if exists(select 1 from public.planes_alimentarios where id=p_plan_id and documento is not null) then raise exception 'editor_visual_requerido'; end if;
  return public.publicar_plan_anterior(p_plan_id);
end $$;

revoke all on function public.consultar_plantillas_planes(),public.gestionar_plantilla_plan(text,jsonb),public.crear_plan_desde_plantilla(uuid,uuid),public.guardar_plan_visual(jsonb),public.guardar_plan(uuid,text,text,jsonb),public.publicar_plan(uuid) from public,anon;
grant execute on function public.consultar_plantillas_planes(),public.gestionar_plantilla_plan(text,jsonb),public.crear_plan_desde_plantilla(uuid,uuid),public.guardar_plan_visual(jsonb),public.guardar_plan(uuid,text,text,jsonb),public.publicar_plan(uuid) to authenticated;

insert into public.plantillas_planes(base,titulo,licencia,documento) values(true,'Una semana a tu medida',
  'Plantilla original de Nutrisfera. Se permite copiar y adaptar dentro de la aplicación.',
  '{"objetivo":"Personalizá este esquema según la evaluación de tu paciente.","etiquetas":[],"bloques":[{"id":"00000000-0012-4000-8000-000000000001","tipo":"semana","titulo":"Mi semana","texto":"","entradas":[]},{"id":"00000000-0012-4000-8000-000000000002","tipo":"texto","titulo":"Cómo usar este plan","texto":"Esta guía se adapta a tus horarios y preferencias. Si tenés dudas o necesitás un cambio, conversalo con tu profesional.","entradas":[]}]}');
