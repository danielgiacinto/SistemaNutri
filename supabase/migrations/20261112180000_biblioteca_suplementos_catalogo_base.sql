-- Fase 11C: suplementos y catálogo base versionado, protegido y duplicable.
alter table public.biblioteca_recursos drop constraint biblioteca_recursos_tipo_check;
alter table public.biblioteca_recursos add constraint biblioteca_recursos_tipo_check
  check(tipo in ('fuente','alimento','grupo','plato','plato_grupos','preparacion','suplemento'));
alter table public.biblioteca_recursos drop constraint biblioteca_recursos_check1;
alter table public.biblioteca_recursos add constraint biblioteca_recursos_check1
  check((tipo in ('alimento','suplemento'))=(fuente_id is not null));

create or replace function privado.validar_contenido_biblioteca(p_tipo text, p_contenido jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare clave text; permitidas text[]; variante jsonb; nombres text[]:=array[]::text[];
begin
  if jsonb_typeof(p_contenido) is distinct from 'object' then return false; end if;
  permitidas := case p_tipo
    when 'fuente' then array['referencia','version','licencia','fecha','base','notas']
    when 'suplemento' then array['marca','medida_cantidad','medida_unidad','energia','proteinas','carbohidratos','grasas','variantes','notas']
    when 'alimento' then array['energia','proteinas','carbohidratos','grasas','notas']
    when 'grupo' then array['ejemplos','coccion','notas']
    when 'preparacion' then array['porciones','peso_final','preparacion','alternativas','notas']
    when 'plato' then array['porciones','peso_final','preparacion','alternativas','notas']
    when 'plato_grupos' then array['preparacion','alternativas','notas'] else null end;
  if permitidas is null then return false; end if;
  for clave in select jsonb_object_keys(p_contenido) loop
    if not clave=any(permitidas) then return false; end if;
    if clave not in ('energia','proteinas','carbohidratos','grasas','porciones','peso_final','medida_cantidad','variantes') and
      (jsonb_typeof(p_contenido->clave)<>'string' or length(p_contenido->>clave)>6000) then return false; end if;
  end loop;
  if p_tipo='fuente' then
    foreach clave in array array['referencia','version','licencia','base'] loop
      if coalesce(length(btrim(p_contenido->>clave)),0) not between 1 and 1000 then return false; end if;
    end loop;
    if coalesce(p_contenido->>'fecha','')<>'' then
      if (p_contenido->>'fecha') !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
      perform (p_contenido->>'fecha')::date;
    end if;
  elsif p_tipo='suplemento' then
    if jsonb_typeof(p_contenido->'marca') is distinct from 'string' or length(p_contenido->>'marca')>100 or
      not privado.numero_biblioteca(p_contenido->'medida_cantidad',0.001,1000000) or
      coalesce(p_contenido->>'medida_unidad','') not in ('g','ml','scoop','capsula','comprimido','unidad') then return false; end if;
    foreach clave in array array['energia','proteinas','carbohidratos','grasas'] loop
      if not privado.numero_biblioteca(p_contenido->clave,0,1000000,true) then return false; end if;
    end loop;
    if p_contenido->>'medida_unidad'='g' and coalesce((p_contenido->>'proteinas')::numeric,0)+coalesce((p_contenido->>'carbohidratos')::numeric,0)+coalesce((p_contenido->>'grasas')::numeric,0)>(p_contenido->>'medida_cantidad')::numeric then return false; end if;
    if jsonb_typeof(p_contenido->'variantes') is distinct from 'array' then return false; end if;
    if jsonb_array_length(p_contenido->'variantes') not between 1 and 10 then return false; end if;
    for variante in select value from jsonb_array_elements(p_contenido->'variantes') loop
      if jsonb_typeof(variante) is distinct from 'object' then return false; end if;
      if jsonb_typeof(variante->'nombre') is distinct from 'string' or length(btrim(variante->>'nombre')) not between 1 and 100 or
        not privado.numero_biblioteca(variante->'medidas',0.001,1000) or jsonb_typeof(variante->'preparacion') is distinct from 'string' or length(variante->>'preparacion')>2000 then return false; end if;
      if lower(btrim(variante->>'nombre'))=any(nombres) then return false; end if;
      nombres:=array_append(nombres,lower(btrim(variante->>'nombre')));
      for clave in select jsonb_object_keys(variante) loop
        if clave not in ('nombre','medidas','preparacion') then return false; end if;
      end loop;
    end loop;
  elsif p_tipo='alimento' then
    if not privado.numero_biblioteca(p_contenido->'energia',0,10000,true) then return false; end if;
    foreach clave in array array['proteinas','carbohidratos','grasas'] loop
      if not privado.numero_biblioteca(p_contenido->clave,0,100,true) then return false; end if;
    end loop;
    if coalesce((p_contenido->>'proteinas')::numeric,0)+coalesce((p_contenido->>'carbohidratos')::numeric,0)+coalesce((p_contenido->>'grasas')::numeric,0)>100 then return false; end if;
  elsif p_tipo in ('plato','preparacion') then
    if not privado.numero_biblioteca(p_contenido->'porciones',0.001,10000) or not privado.numero_biblioteca(p_contenido->'peso_final',0.001,1000000,true) then return false; end if;
  end if;
  return true;
exception when others then return false;
end $$;

-- Las versiones de plataforma son independientes de los recursos del consultorio.
create table public.biblioteca_base_versiones (
  id uuid not null,
  version integer not null check(version>0),
  instantanea jsonb not null check(jsonb_typeof(instantanea)='object'),
  referencia text not null check(length(btrim(referencia)) between 1 and 2000),
  licencia text not null check(length(btrim(licencia)) between 1 and 2000),
  publicado_en timestamptz not null default now(),
  retirado_en timestamptz,
  tipo text generated always as (instantanea#>>'{recurso,tipo}') stored not null,
  nombre text generated always as (instantanea#>>'{recurso,nombre}') stored not null,
  categoria text generated always as (instantanea#>>'{recurso,categoria}') stored not null,
  primary key(id,version),
  check((instantanea#>>'{recurso,id}')::uuid=id and (instantanea#>>'{recurso,version}')::integer=version),
  check(privado.validar_contenido_biblioteca(tipo,instantanea#>'{recurso,contenido}')),
  check(jsonb_typeof(instantanea->'relaciones')='array')
);
create index biblioteca_base_estantes on public.biblioteca_base_versiones(tipo,categoria,id,version desc);

create table public.biblioteca_procedencias_base (
  recurso_id uuid primary key,
  consultorio_id uuid not null,
  base_id uuid not null,
  base_version integer not null,
  copiado_en timestamptz not null default now(),
  foreign key(recurso_id,consultorio_id) references public.biblioteca_recursos(id,consultorio_id),
  foreign key(base_id,base_version) references public.biblioteca_base_versiones(id,version)
);

revoke all on public.biblioteca_base_versiones,public.biblioteca_procedencias_base from public,anon,authenticated;
grant select on public.biblioteca_base_versiones,public.biblioteca_procedencias_base to authenticated;
alter table public.biblioteca_base_versiones enable row level security;
alter table public.biblioteca_procedencias_base enable row level security;
create policy biblioteca_base_lectura on public.biblioteca_base_versiones for select to authenticated
  using(exists(select 1 from public.miembros_consultorio m where m.usuario_id=auth.uid() and privado.es_miembro_consultorio(m.consultorio_id)));
create policy biblioteca_base_alta on public.biblioteca_base_versiones for insert to authenticated with check(false);
create policy biblioteca_base_edicion on public.biblioteca_base_versiones for update to authenticated using(false) with check(false);
create policy biblioteca_base_borrado on public.biblioteca_base_versiones for delete to authenticated using(false);
create policy biblioteca_procedencias_lectura on public.biblioteca_procedencias_base for select to authenticated using(privado.es_miembro_consultorio(consultorio_id));
create policy biblioteca_procedencias_alta on public.biblioteca_procedencias_base for insert to authenticated with check(false);
create policy biblioteca_procedencias_edicion on public.biblioteca_procedencias_base for update to authenticated using(false) with check(false);
create policy biblioteca_procedencias_borrado on public.biblioteca_procedencias_base for delete to authenticated using(false);

create function public.consultar_catalogo_base(p_filtros jsonb default '{}') returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_tipo text:=coalesce(p_filtros->>'tipo','plato'); pagina integer:=coalesce((p_filtros->>'pagina')::integer,1);
  busqueda text:=coalesce(p_filtros->>'q',''); v_categoria text:=coalesce(p_filtros->>'categoria','');
begin
  if v_tipo not in ('fuente','alimento','grupo','plato','plato_grupos','preparacion','suplemento') or pagina not between 1 and 100000 or length(busqueda)>100 or length(v_categoria)>80 then raise exception 'filtro_invalido'; end if;
  return (with vigentes as (
    -- Retirar la última versión retira el recurso: no vuelve a publicar la anterior.
    select * from (select distinct on (id) * from public.biblioteca_base_versiones order by id,version desc) ultimas where retirado_en is null
  ), filtrados as (
    select * from vigentes where tipo=v_tipo and (v_categoria='' or categoria=v_categoria)
      and (busqueda='' or nombre ilike '%'||busqueda||'%' or (instantanea#>>'{recurso,etiquetas}') ilike '%'||busqueda||'%')
      and not coalesce((p_filtros->>'archivados')::boolean,false)
  ), pagina_actual as (
    select (instantanea->'recurso')||jsonb_build_object('origen','base','relaciones',case when tipo in ('plato','preparacion','suplemento') then instantanea->'relaciones' else '[]'::jsonb end) as recurso
      from filtrados order by nombre,id limit 25 offset ((pagina-1)*25)
  ) select jsonb_build_object('recursos',coalesce((select jsonb_agg(recurso) from pagina_actual),'[]'::jsonb),'total',(select count(*) from filtrados),
    'contadores',(select coalesce(jsonb_object_agg(c.tipo,c.cantidad),'{}'::jsonb) from (select tipo,count(*) cantidad from vigentes group by tipo) c),
    'categorias',(select coalesce(jsonb_agg(distinct categoria order by categoria),'[]'::jsonb) from vigentes where tipo=v_tipo and categoria<>'')));
end $$;

create function public.obtener_recurso_base(p_id uuid,p_version integer default null) returns jsonb
language sql stable security invoker set search_path='' as $$
  select v.instantanea||jsonb_build_object('recurso',(v.instantanea->'recurso')||jsonb_build_object('origen','base','archivado_en',v.retirado_en,
    'procedencia_base',jsonb_build_object('id',v.id,'version',v.version,'referencia',v.referencia,'licencia',v.licencia)),
    'historial',(select jsonb_agg(jsonb_build_object('version',h.version,'guardada_en',h.publicado_en) order by h.version desc) from public.biblioteca_base_versiones h where h.id=v.id))
  from public.biblioteca_base_versiones v where v.id=p_id and v.version=coalesce(p_version,(select max(u.version) from public.biblioteca_base_versiones u where u.id=p_id));
$$;

create or replace function public.obtener_recurso_biblioteca(p_id uuid,p_version integer default null) returns jsonb
language sql stable security invoker set search_path='' as $$
  select v.instantanea||jsonb_build_object('recurso',(v.instantanea->'recurso')||jsonb_build_object('origen','propio','procedencia_base',
    (select jsonb_build_object('id',b.id,'version',b.version,'referencia',b.referencia,'licencia',b.licencia) from public.biblioteca_procedencias_base p
      join public.biblioteca_base_versiones b on b.id=p.base_id and b.version=p.base_version where p.recurso_id=r.id)),
    'historial',(select jsonb_agg(jsonb_build_object('version',h.version,'guardada_en',h.guardada_en) order by h.version desc) from public.biblioteca_versiones h where h.recurso_id=r.id))
  from public.biblioteca_recursos r join public.biblioteca_versiones v on v.recurso_id=r.id and v.version=coalesce(p_version,r.version) where r.id=p_id;
$$;

-- Solo se copia contenido de plataforma persistido; nunca JSON aportado por el cliente.
create function privado.copiar_base_biblioteca(p_id uuid,p_version integer,p_nivel integer default 0) returns uuid
language plpgsql security definer set search_path='' as $$
declare original public.biblioteca_base_versiones; recurso jsonb; datos jsonb; fila jsonb; filas jsonb:='[]';
  nueva_fuente uuid; nueva_referencia uuid; identificador uuid; consultorio uuid;
begin
  if p_nivel>3 then raise exception 'referencia_invalida'; end if;
  if not exists(select 1 from (select retirado_en from public.biblioteca_base_versiones where id=p_id order by version desc limit 1) ultima where ultima.retirado_en is null) then raise exception 'base_no_disponible'; end if;
  select * into original from public.biblioteca_base_versiones where id=p_id and version=p_version and retirado_en is null;
  if not found then raise exception 'base_no_disponible'; end if;
  recurso:=original.instantanea->'recurso';
  if nullif(recurso->>'fuente_id','') is not null then
    nueva_fuente:=privado.copiar_base_biblioteca((recurso->>'fuente_id')::uuid,(recurso#>>'{fuente_instantanea,version}')::integer,p_nivel+1);
  end if;
  for fila in select value from jsonb_array_elements(original.instantanea->'relaciones') loop
    nueva_referencia:=privado.copiar_base_biblioteca((fila->>'referencia_id')::uuid,(fila#>>'{instantanea,version}')::integer,p_nivel+1);
    filas:=filas||jsonb_build_array(jsonb_build_object('referencia_id',nueva_referencia,'referencia_version',1,'detalle',fila->'detalle'));
  end loop;
  datos:=jsonb_build_object('tipo',recurso->>'tipo','nombre',left(recurso->>'nombre',140)||' (copia)','categoria',recurso->>'categoria',
    'etiquetas',recurso->'etiquetas','contenido',recurso->'contenido','relaciones',filas);
  if nueva_fuente is not null then datos:=datos||jsonb_build_object('fuente_id',nueva_fuente,'fuente_version',1); end if;
  identificador:=public.gestionar_biblioteca('guardar',datos);
  select r.consultorio_id into consultorio from public.biblioteca_recursos r where r.id=identificador;
  insert into public.biblioteca_procedencias_base(recurso_id,consultorio_id,base_id,base_version) values(identificador,consultorio,p_id,p_version);
  return identificador;
end $$;

create function public.copiar_recurso_base(p_id uuid,p_version integer) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.miembros_consultorio m where m.usuario_id=auth.uid() and privado.es_miembro_consultorio(m.consultorio_id)) then raise exception 'sin_permiso'; end if;
  return privado.copiar_base_biblioteca(p_id,p_version);
end $$;

revoke all on function privado.validar_contenido_biblioteca(text,jsonb),privado.copiar_base_biblioteca(uuid,integer,integer) from public,anon,authenticated;
revoke all on function public.gestionar_biblioteca(text,jsonb),public.consultar_biblioteca(jsonb),public.obtener_recurso_biblioteca(uuid,integer),public.consultar_catalogo_base(jsonb),public.obtener_recurso_base(uuid,integer),public.copiar_recurso_base(uuid,integer) from public,anon;
grant execute on function public.gestionar_biblioteca(text,jsonb),public.consultar_biblioteca(jsonb),public.obtener_recurso_biblioteca(uuid,integer),public.consultar_catalogo_base(jsonb),public.obtener_recurso_base(uuid,integer),public.copiar_recurso_base(uuid,integer) to authenticated;

create or replace function public.gestionar_biblioteca(p_accion text,p_datos jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare usuario uuid:=auth.uid(); consultorio uuid; identificador uuid; original public.biblioteca_recursos;
  recurso public.biblioteca_recursos; referencia public.biblioteca_recursos; fuente public.biblioteca_recursos;
  fila jsonb; detalle jsonb; filas jsonb; numero integer:=0; suma numeric:=0; clave text; fuente_copia jsonb; referencia_copia jsonb;
begin
  select m.consultorio_id into consultorio from public.miembros_consultorio m
    where m.usuario_id=usuario and privado.es_miembro_consultorio(m.consultorio_id) limit 1;
  if usuario is null or consultorio is null then raise exception 'sin_permiso'; end if;
  if jsonb_typeof(p_datos) is distinct from 'object' or length(p_datos::text)>150000 then raise exception 'datos_invalidos'; end if;
  identificador:=nullif(p_datos->>'id','')::uuid;
  if identificador is not null then
    select * into original from public.biblioteca_recursos where id=identificador and consultorio_id=consultorio for update;
    if not found then raise exception 'sin_permiso'; end if;
    if (p_datos->>'version')::integer is distinct from original.version then raise exception 'version_desactualizada'; end if;
  elsif p_accion<>'guardar' then raise exception 'datos_invalidos'; end if;

  if p_accion='duplicar' then
    insert into public.biblioteca_recursos(consultorio_id,creado_por,tipo,nombre,categoria,etiquetas,contenido,fuente_id,fuente_instantanea,duplicado_de)
      values(consultorio,usuario,original.tipo,left(original.nombre,140)||' (copia)',original.categoria,original.etiquetas,original.contenido,original.fuente_id,original.fuente_instantanea,original.id) returning * into recurso;
    insert into public.biblioteca_relaciones(recurso_id,consultorio_id,orden,referencia_id,detalle,instantanea)
      select recurso.id,consultorio,r.orden,r.referencia_id,r.detalle,r.instantanea from public.biblioteca_relaciones r where r.recurso_id=original.id;
    insert into public.biblioteca_procedencias_base(recurso_id,consultorio_id,base_id,base_version)
      select recurso.id,consultorio,p.base_id,p.base_version from public.biblioteca_procedencias_base p where p.recurso_id=original.id;
  elsif p_accion in ('archivar','restaurar') then
    update public.biblioteca_recursos set archivado_en=case when p_accion='archivar' then now() else null end,version=version+1,actualizado_en=now()
      where id=original.id and consultorio_id=consultorio returning * into recurso;
  elsif p_accion='guardar' then
    if original.archivado_en is not null then raise exception 'recurso_archivado'; end if;
    if original.id is not null and original.tipo is distinct from p_datos->>'tipo' then raise exception 'tipo_invalido'; end if;
    if not privado.validar_contenido_biblioteca(p_datos->>'tipo',p_datos->'contenido') then raise exception 'datos_invalidos'; end if;
    if jsonb_typeof(p_datos->'nombre') is distinct from 'string' or length(btrim(p_datos->>'nombre')) not between 1 and 150 or
      jsonb_typeof(p_datos->'categoria') is distinct from 'string' or length(p_datos->>'categoria')>80 or
      jsonb_typeof(p_datos->'etiquetas') is distinct from 'array' then raise exception 'datos_invalidos'; end if;
    if jsonb_array_length(p_datos->'etiquetas')>12 then raise exception 'datos_invalidos'; end if;
    for fila in select value from jsonb_array_elements(p_datos->'etiquetas') loop
      if jsonb_typeof(fila)<>'string' or length(fila#>>'{}') not between 1 and 30 then raise exception 'datos_invalidos'; end if;
    end loop;
    if p_datos->>'tipo'='suplemento' and coalesce(p_datos->>'categoria','') not in ('Proteína','Creatina','Aminoácidos','Ganador','Vitaminas','Colágeno','Otro') then raise exception 'datos_invalidos'; end if;
    if p_datos->>'tipo' in ('alimento','suplemento') then
      select * into fuente from public.biblioteca_recursos where id=(p_datos->>'fuente_id')::uuid and consultorio_id=consultorio and tipo='fuente' and archivado_en is null for share;
      if not found then raise exception 'fuente_invalida'; end if;
      select v.instantanea->'recurso' into fuente_copia from public.biblioteca_versiones v
        where v.recurso_id=fuente.id and v.consultorio_id=consultorio and v.version=coalesce((p_datos->>'fuente_version')::integer,fuente.version);
      if not found then raise exception 'fuente_invalida'; end if;
    elsif nullif(p_datos->>'fuente_id','') is not null then raise exception 'fuente_invalida'; end if;
    identificador:=coalesce(identificador,gen_random_uuid());
    insert into public.biblioteca_recursos(id,consultorio_id,creado_por,tipo,nombre,categoria,etiquetas,contenido,fuente_id,fuente_instantanea)
      values(identificador,consultorio,usuario,p_datos->>'tipo',btrim(p_datos->>'nombre'),p_datos->>'categoria',array(select jsonb_array_elements_text(p_datos->'etiquetas')),p_datos->'contenido',fuente.id,fuente_copia)
      on conflict(id) do update set nombre=excluded.nombre,categoria=excluded.categoria,etiquetas=excluded.etiquetas,contenido=excluded.contenido,fuente_id=excluded.fuente_id,fuente_instantanea=excluded.fuente_instantanea,version=biblioteca_recursos.version+1,actualizado_en=now()
      where biblioteca_recursos.consultorio_id=consultorio returning * into recurso;
    if not found then raise exception 'sin_permiso'; end if;
    filas:=coalesce(p_datos->'relaciones','[]'::jsonb);
    if jsonb_typeof(filas)<>'array' or jsonb_array_length(filas)>100 then raise exception 'datos_invalidos'; end if;
    if recurso.tipo not in ('plato','preparacion','plato_grupos','suplemento') and jsonb_array_length(filas)<>0 then raise exception 'datos_invalidos'; end if;
    if recurso.tipo in ('plato','preparacion','plato_grupos') and jsonb_array_length(filas)=0 then raise exception 'composicion_vacia'; end if;
    delete from public.biblioteca_relaciones where recurso_id=recurso.id and consultorio_id=consultorio;
    for fila in select value from jsonb_array_elements(filas) loop
      numero:=numero+1; detalle:=fila->'detalle';
      select * into referencia from public.biblioteca_recursos where id=(fila->>'referencia_id')::uuid and consultorio_id=consultorio and archivado_en is null and ((recurso.tipo in ('plato','suplemento') and tipo in ('alimento','preparacion')) or (recurso.tipo='preparacion' and tipo='alimento') or (recurso.tipo='plato_grupos' and tipo='grupo')) for share;
      if not found then raise exception 'referencia_invalida'; end if;
      -- Una preparación conserva también los ingredientes de la versión seleccionada.
      select case when referencia.tipo='preparacion' then (v.instantanea->'recurso')||jsonb_build_object('relaciones',v.instantanea->'relaciones') else v.instantanea->'recurso' end into referencia_copia from public.biblioteca_versiones v
        where v.recurso_id=referencia.id and v.consultorio_id=consultorio and v.version=coalesce((fila->>'referencia_version')::integer,referencia.version);
      if not found then raise exception 'referencia_invalida'; end if;
      if jsonb_typeof(detalle) is distinct from 'object' then raise exception 'datos_invalidos'; end if;
      if recurso.tipo in ('plato','preparacion','suplemento') then
        if not privado.numero_biblioteca(detalle->'cantidad',0.001,1000000) or coalesce(detalle->>'unidad','') not in ('g','ml','unidad','porcion') or
          not privado.numero_biblioteca(detalle->'gramos_por_unidad',0.001,1000000,true) or not privado.numero_biblioteca(detalle->'rendimiento',0.001,1000) then raise exception 'datos_invalidos'; end if;
        if detalle->>'unidad'='g' and (detalle->>'gramos_por_unidad')::numeric is distinct from 1 then raise exception 'datos_invalidos'; end if;
        if recurso.tipo='suplemento' then
          if not privado.numero_biblioteca(detalle->'variante',0,jsonb_array_length(recurso.contenido->'variantes')-1) or
            (detalle->>'variante')::numeric<>trunc((detalle->>'variante')::numeric) or (detalle->>'rendimiento')::numeric<>1 then raise exception 'datos_invalidos'; end if;
        elsif detalle ? 'variante' then raise exception 'datos_invalidos'; end if;
        for clave in select jsonb_object_keys(detalle) loop
          if clave not in ('cantidad','unidad','gramos_por_unidad','rendimiento','variante') then raise exception 'datos_invalidos'; end if;
        end loop;
      else
        if not privado.numero_biblioteca(detalle->'fraccion',0.0001,1) then raise exception 'fraccion_invalida'; end if;
        suma:=suma+(detalle->>'fraccion')::numeric;
        foreach clave in array array['ejemplos','coccion'] loop
          if jsonb_typeof(detalle->clave) is distinct from 'string' or length(detalle->>clave)>1000 then raise exception 'datos_invalidos'; end if;
        end loop;
        for clave in select jsonb_object_keys(detalle) loop
          if clave not in ('fraccion','ejemplos','coccion') then raise exception 'datos_invalidos'; end if;
        end loop;
      end if;
      insert into public.biblioteca_relaciones values(recurso.id,consultorio,numero,referencia.id,detalle,referencia_copia);
    end loop;
    if recurso.tipo='plato_grupos' and abs(suma-1)>0.000001 then raise exception 'fraccion_invalida'; end if;
  else raise exception 'accion_invalida'; end if;
  insert into public.biblioteca_versiones(recurso_id,consultorio_id,version,guardada_por,instantanea)
    values(recurso.id,consultorio,recurso.version,usuario,jsonb_build_object('recurso',to_jsonb(recurso),'relaciones',coalesce((select jsonb_agg(to_jsonb(r) order by orden) from public.biblioteca_relaciones r where r.recurso_id=recurso.id),'[]'::jsonb)));
  return recurso.id;
end $$;

create or replace function public.consultar_biblioteca(p_filtros jsonb default '{}') returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_tipo text:=coalesce(p_filtros->>'tipo','plato'); pagina integer:=coalesce((p_filtros->>'pagina')::integer,1);
  busqueda text:=coalesce(p_filtros->>'q',''); v_categoria text:=coalesce(p_filtros->>'categoria',''); archivados boolean:=coalesce((p_filtros->>'archivados')::boolean,false);
begin
  if v_tipo not in ('fuente','alimento','grupo','plato','plato_grupos','preparacion','suplemento') or pagina not between 1 and 100000 or length(busqueda)>100 or length(v_categoria)>80 then raise exception 'filtro_invalido'; end if;
  return (with filtrados as (
    select r.* from public.biblioteca_recursos r where r.tipo=v_tipo and (r.archivado_en is not null)=archivados
      and (v_categoria='' or r.categoria=v_categoria) and (busqueda='' or r.nombre ilike '%'||busqueda||'%' or array_to_string(r.etiquetas,' ') ilike '%'||busqueda||'%')
  ), pagina_actual as (select id,tipo,nombre,categoria,etiquetas,version,archivado_en,actualizado_en,
      case when tipo in ('alimento','suplemento') then contenido else contenido-'preparacion'-'alternativas'-'notas'-'ejemplos'-'coccion' end as contenido,
      -- Solo los insumos de los 25 recursos paginados, protegidos por la RLS existente.
      case when tipo in ('plato','preparacion','suplemento') then coalesce((select jsonb_agg(jsonb_build_object('referencia_id',br.referencia_id,'detalle',br.detalle,'instantanea',br.instantanea) order by br.orden) from public.biblioteca_relaciones br where br.recurso_id=filtrados.id),'[]'::jsonb) else '[]'::jsonb end as relaciones
    from filtrados order by actualizado_en desc,id limit 25 offset ((pagina-1)*25))
  select jsonb_build_object('recursos',coalesce((select jsonb_agg(to_jsonb(p)) from pagina_actual p),'[]'::jsonb),'total',(select count(*) from filtrados),
    'contadores',(select coalesce(jsonb_object_agg(c.tipo,c.cantidad),'{}'::jsonb) from (select r.tipo,count(*) cantidad from public.biblioteca_recursos r where (r.archivado_en is not null)=archivados group by r.tipo) c),
    'categorias',(select coalesce(jsonb_agg(distinct r.categoria order by r.categoria),'[]'::jsonb) from public.biblioteca_recursos r where r.tipo=v_tipo and r.categoria<>'' and (r.archivado_en is not null)=archivados)));
end $$;


-- Colección inicial: datos USDA CC0 verificados y redacción propia. Sin marcas ni dosis.
insert into public.biblioteca_base_versiones(id,version,instantanea,referencia,licencia,publicado_en) values('00000000-0011-4000-8000-000000000001',1,'{"recurso":{"id":"00000000-0011-4000-8000-000000000001","version":1,"tipo":"fuente","nombre":"USDA FoodData Central · SR Legacy","categoria":"Referencias","etiquetas":["Colección inicial"],"contenido":{"referencia":"USDA Agricultural Research Service. FoodData Central. Registros SR Legacy FDC 173944 y 172217; https://fdc.nal.usda.gov/fdc-app.html","version":"SR Legacy · registros 173944 y 172217 · consulta 12/11/2026","licencia":"CC0 1.0 Universal. USDA FoodData Central: https://fdc.nal.usda.gov/api-guide/ (verificado el 12/11/2026).","fecha":"2026-11-12","base":"Por 100 g de parte comestible. Carbohidratos por diferencia; no se presentan como carbohidratos disponibles. No representa productos locales específicos.","notas":"Valores genéricos de referencia. Confirmar alimento, estado y pertinencia antes de utilizarlos."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"},"relaciones":[]}'::jsonb,'https://fdc.nal.usda.gov/api-guide/','CC0 1.0 Universal. USDA FoodData Central: https://fdc.nal.usda.gov/api-guide/ (verificado el 12/11/2026).','2026-11-12T18:00:00Z');
insert into public.biblioteca_base_versiones(id,version,instantanea,referencia,licencia,publicado_en) values('00000000-0011-4000-8000-000000000002',1,'{"recurso":{"id":"00000000-0011-4000-8000-000000000002","version":1,"tipo":"alimento","nombre":"Banana cruda · parte comestible","categoria":"Frutas","etiquetas":["Colección inicial"],"contenido":{"energia":89,"proteinas":1.09,"carbohidratos":22.84,"grasas":0.33,"notas":"USDA SR Legacy: Bananas, raw. FDC 173944. Por 100 g sin cáscara; carbohidratos por diferencia. https://fdc.nal.usda.gov/fdc-app.html#/food-details/173944/nutrients"},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z","fuente_id":"00000000-0011-4000-8000-000000000001","fuente_instantanea":{"id":"00000000-0011-4000-8000-000000000001","version":1,"tipo":"fuente","nombre":"USDA FoodData Central · SR Legacy","categoria":"Referencias","etiquetas":["Colección inicial"],"contenido":{"referencia":"USDA Agricultural Research Service. FoodData Central. Registros SR Legacy FDC 173944 y 172217; https://fdc.nal.usda.gov/fdc-app.html","version":"SR Legacy · registros 173944 y 172217 · consulta 12/11/2026","licencia":"CC0 1.0 Universal. USDA FoodData Central: https://fdc.nal.usda.gov/api-guide/ (verificado el 12/11/2026).","fecha":"2026-11-12","base":"Por 100 g de parte comestible. Carbohidratos por diferencia; no se presentan como carbohidratos disponibles. No representa productos locales específicos.","notas":"Valores genéricos de referencia. Confirmar alimento, estado y pertinencia antes de utilizarlos."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"}},"relaciones":[]}'::jsonb,'https://fdc.nal.usda.gov/fdc-app.html#/food-details/173944/nutrients','CC0 1.0 Universal. USDA FoodData Central: https://fdc.nal.usda.gov/api-guide/ (verificado el 12/11/2026).','2026-11-12T18:00:00Z');
insert into public.biblioteca_base_versiones(id,version,instantanea,referencia,licencia,publicado_en) values('00000000-0011-4000-8000-000000000003',1,'{"recurso":{"id":"00000000-0011-4000-8000-000000000003","version":1,"tipo":"alimento","nombre":"Leche entera sin vitaminas agregadas · referencia USDA","categoria":"Lácteos","etiquetas":["Colección inicial"],"contenido":{"energia":61,"proteinas":3.15,"carbohidratos":4.78,"grasas":3.27,"notas":"USDA SR Legacy: Milk, whole, 3.25% milkfat, without added vitamin A and vitamin D. FDC 172217. Por 100 g, no por 100 ml. Referencia genérica, no equiparar automáticamente a una marca local. https://fdc.nal.usda.gov/fdc-app.html#/food-details/172217/nutrients"},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z","fuente_id":"00000000-0011-4000-8000-000000000001","fuente_instantanea":{"id":"00000000-0011-4000-8000-000000000001","version":1,"tipo":"fuente","nombre":"USDA FoodData Central · SR Legacy","categoria":"Referencias","etiquetas":["Colección inicial"],"contenido":{"referencia":"USDA Agricultural Research Service. FoodData Central. Registros SR Legacy FDC 173944 y 172217; https://fdc.nal.usda.gov/fdc-app.html","version":"SR Legacy · registros 173944 y 172217 · consulta 12/11/2026","licencia":"CC0 1.0 Universal. USDA FoodData Central: https://fdc.nal.usda.gov/api-guide/ (verificado el 12/11/2026).","fecha":"2026-11-12","base":"Por 100 g de parte comestible. Carbohidratos por diferencia; no se presentan como carbohidratos disponibles. No representa productos locales específicos.","notas":"Valores genéricos de referencia. Confirmar alimento, estado y pertinencia antes de utilizarlos."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"}},"relaciones":[]}'::jsonb,'https://fdc.nal.usda.gov/fdc-app.html#/food-details/172217/nutrients','CC0 1.0 Universal. USDA FoodData Central: https://fdc.nal.usda.gov/api-guide/ (verificado el 12/11/2026).','2026-11-12T18:00:00Z');
insert into public.biblioteca_base_versiones(id,version,instantanea,referencia,licencia,publicado_en) values('00000000-0011-4000-8000-000000000004',1,'{"recurso":{"id":"00000000-0011-4000-8000-000000000004","version":1,"tipo":"grupo","nombre":"Frutas · opciones para personalizar","categoria":"Frutas","etiquetas":["Colección inicial"],"contenido":{"ejemplos":"Banana, manzana, pera, cítricos. Elegir variedades y cantidades de forma profesional.","coccion":"Frescas, en compota o al horno, según el alimento y la preparación.","notas":"Agrupación descriptiva. Los ejemplos no implican equivalencia nutricional ni reemplazo automático."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"},"relaciones":[]}'::jsonb,'Colección inicial Nutrisfera, edición 1 del 12/11/2026. No es una indicación clínica individual.','Contenido original redactado para Nutrisfera. Reutilización y edición permitidas dentro de la aplicación; requiere revisión profesional.','2026-11-12T18:00:00Z');
insert into public.biblioteca_base_versiones(id,version,instantanea,referencia,licencia,publicado_en) values('00000000-0011-4000-8000-000000000005',1,'{"recurso":{"id":"00000000-0011-4000-8000-000000000005","version":1,"tipo":"grupo","nombre":"Lácteos · opciones para personalizar","categoria":"Lácteos","etiquetas":["Colección inicial"],"contenido":{"ejemplos":"Leche, yogur natural y quesos. Revisar cada producto y su composición.","coccion":"Según el producto y la receta.","notas":"No equiparar porciones ni asumir tolerancia o indicaciones a partir del grupo."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"},"relaciones":[]}'::jsonb,'Colección inicial Nutrisfera, edición 1 del 12/11/2026. No es una indicación clínica individual.','Contenido original redactado para Nutrisfera. Reutilización y edición permitidas dentro de la aplicación; requiere revisión profesional.','2026-11-12T18:00:00Z');
insert into public.biblioteca_base_versiones(id,version,instantanea,referencia,licencia,publicado_en) values('00000000-0011-4000-8000-000000000006',1,'{"recurso":{"id":"00000000-0011-4000-8000-000000000006","version":1,"tipo":"grupo","nombre":"Vegetales · opciones para personalizar","categoria":"Vegetales","etiquetas":["Colección inicial"],"contenido":{"ejemplos":"Zanahoria, zapallito, brócoli, tomate y hojas verdes. Definir selección y cantidades al personalizar.","coccion":"Crudos cuando corresponda, al vapor, al horno o salteados.","notas":"Grupo descriptivo sin composición química exacta. Los ejemplos no son intercambios equivalentes."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"},"relaciones":[]}'::jsonb,'Colección inicial Nutrisfera, edición 1 del 12/11/2026. No es una indicación clínica individual.','Contenido original redactado para Nutrisfera. Reutilización y edición permitidas dentro de la aplicación; requiere revisión profesional.','2026-11-12T18:00:00Z');
insert into public.biblioteca_base_versiones(id,version,instantanea,referencia,licencia,publicado_en) values('00000000-0011-4000-8000-000000000007',1,'{"recurso":{"id":"00000000-0011-4000-8000-000000000007","version":1,"tipo":"preparacion","nombre":"Banana pisada · preparación básica","categoria":"Frutas","etiquetas":["Colección inicial"],"contenido":{"porciones":1,"peso_final":100,"preparacion":"Pesar 100 g de banana sin cáscara.\nPisar y utilizar la preparación según la receta revisada.","alternativas":"","notas":"Composición calculada con la referencia USDA guardada. Peso final declarado para esta receta, sin pérdidas."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"},"relaciones":[{"referencia_id":"00000000-0011-4000-8000-000000000002","detalle":{"cantidad":100,"unidad":"g","gramos_por_unidad":1,"rendimiento":1},"instantanea":{"id":"00000000-0011-4000-8000-000000000002","version":1,"tipo":"alimento","nombre":"Banana cruda · parte comestible","categoria":"Frutas","etiquetas":["Colección inicial"],"contenido":{"energia":89,"proteinas":1.09,"carbohidratos":22.84,"grasas":0.33,"notas":"USDA SR Legacy: Bananas, raw. FDC 173944. Por 100 g sin cáscara; carbohidratos por diferencia. https://fdc.nal.usda.gov/fdc-app.html#/food-details/173944/nutrients"},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z","fuente_id":"00000000-0011-4000-8000-000000000001","fuente_instantanea":{"id":"00000000-0011-4000-8000-000000000001","version":1,"tipo":"fuente","nombre":"USDA FoodData Central · SR Legacy","categoria":"Referencias","etiquetas":["Colección inicial"],"contenido":{"referencia":"USDA Agricultural Research Service. FoodData Central. Registros SR Legacy FDC 173944 y 172217; https://fdc.nal.usda.gov/fdc-app.html","version":"SR Legacy · registros 173944 y 172217 · consulta 12/11/2026","licencia":"CC0 1.0 Universal. USDA FoodData Central: https://fdc.nal.usda.gov/api-guide/ (verificado el 12/11/2026).","fecha":"2026-11-12","base":"Por 100 g de parte comestible. Carbohidratos por diferencia; no se presentan como carbohidratos disponibles. No representa productos locales específicos.","notas":"Valores genéricos de referencia. Confirmar alimento, estado y pertinencia antes de utilizarlos."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"}}}]}'::jsonb,'Colección inicial Nutrisfera, edición 1 del 12/11/2026. No es una indicación clínica individual.','Contenido original redactado para Nutrisfera. Reutilización y edición permitidas dentro de la aplicación; requiere revisión profesional.','2026-11-12T18:00:00Z');
insert into public.biblioteca_base_versiones(id,version,instantanea,referencia,licencia,publicado_en) values('00000000-0011-4000-8000-000000000008',1,'{"recurso":{"id":"00000000-0011-4000-8000-000000000008","version":1,"tipo":"plato","nombre":"Banana con leche · receta para personalizar","categoria":"Desayuno/Merienda","etiquetas":["Colección inicial"],"contenido":{"porciones":1,"peso_final":250,"preparacion":"Pesar 100 g de banana sin cáscara y 150 g de la leche seleccionada.\nMezclar o licuar. Revisar cantidades e ingredientes antes de incorporar a un plan.","alternativas":"Cambiar ingredientes requiere recalcular la receta; no asumir equivalencias.","notas":"Las cantidades están expresadas en gramos. No se usa una conversión automática de ml a g. La receta no define una indicación individual."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"},"relaciones":[{"referencia_id":"00000000-0011-4000-8000-000000000002","detalle":{"cantidad":100,"unidad":"g","gramos_por_unidad":1,"rendimiento":1},"instantanea":{"id":"00000000-0011-4000-8000-000000000002","version":1,"tipo":"alimento","nombre":"Banana cruda · parte comestible","categoria":"Frutas","etiquetas":["Colección inicial"],"contenido":{"energia":89,"proteinas":1.09,"carbohidratos":22.84,"grasas":0.33,"notas":"USDA SR Legacy: Bananas, raw. FDC 173944. Por 100 g sin cáscara; carbohidratos por diferencia. https://fdc.nal.usda.gov/fdc-app.html#/food-details/173944/nutrients"},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z","fuente_id":"00000000-0011-4000-8000-000000000001","fuente_instantanea":{"id":"00000000-0011-4000-8000-000000000001","version":1,"tipo":"fuente","nombre":"USDA FoodData Central · SR Legacy","categoria":"Referencias","etiquetas":["Colección inicial"],"contenido":{"referencia":"USDA Agricultural Research Service. FoodData Central. Registros SR Legacy FDC 173944 y 172217; https://fdc.nal.usda.gov/fdc-app.html","version":"SR Legacy · registros 173944 y 172217 · consulta 12/11/2026","licencia":"CC0 1.0 Universal. USDA FoodData Central: https://fdc.nal.usda.gov/api-guide/ (verificado el 12/11/2026).","fecha":"2026-11-12","base":"Por 100 g de parte comestible. Carbohidratos por diferencia; no se presentan como carbohidratos disponibles. No representa productos locales específicos.","notas":"Valores genéricos de referencia. Confirmar alimento, estado y pertinencia antes de utilizarlos."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"}}},{"referencia_id":"00000000-0011-4000-8000-000000000003","detalle":{"cantidad":150,"unidad":"g","gramos_por_unidad":1,"rendimiento":1},"instantanea":{"id":"00000000-0011-4000-8000-000000000003","version":1,"tipo":"alimento","nombre":"Leche entera sin vitaminas agregadas · referencia USDA","categoria":"Lácteos","etiquetas":["Colección inicial"],"contenido":{"energia":61,"proteinas":3.15,"carbohidratos":4.78,"grasas":3.27,"notas":"USDA SR Legacy: Milk, whole, 3.25% milkfat, without added vitamin A and vitamin D. FDC 172217. Por 100 g, no por 100 ml. Referencia genérica, no equiparar automáticamente a una marca local. https://fdc.nal.usda.gov/fdc-app.html#/food-details/172217/nutrients"},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z","fuente_id":"00000000-0011-4000-8000-000000000001","fuente_instantanea":{"id":"00000000-0011-4000-8000-000000000001","version":1,"tipo":"fuente","nombre":"USDA FoodData Central · SR Legacy","categoria":"Referencias","etiquetas":["Colección inicial"],"contenido":{"referencia":"USDA Agricultural Research Service. FoodData Central. Registros SR Legacy FDC 173944 y 172217; https://fdc.nal.usda.gov/fdc-app.html","version":"SR Legacy · registros 173944 y 172217 · consulta 12/11/2026","licencia":"CC0 1.0 Universal. USDA FoodData Central: https://fdc.nal.usda.gov/api-guide/ (verificado el 12/11/2026).","fecha":"2026-11-12","base":"Por 100 g de parte comestible. Carbohidratos por diferencia; no se presentan como carbohidratos disponibles. No representa productos locales específicos.","notas":"Valores genéricos de referencia. Confirmar alimento, estado y pertinencia antes de utilizarlos."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"}}}]}'::jsonb,'Colección inicial Nutrisfera, edición 1 del 12/11/2026. No es una indicación clínica individual.','Contenido original redactado para Nutrisfera. Reutilización y edición permitidas dentro de la aplicación; requiere revisión profesional.','2026-11-12T18:00:00Z');
insert into public.biblioteca_base_versiones(id,version,instantanea,referencia,licencia,publicado_en) values('00000000-0011-4000-8000-000000000009',1,'{"recurso":{"id":"00000000-0011-4000-8000-000000000009","version":1,"tipo":"plato_grupos","nombre":"Fruta y lácteo · esquema por partes","categoria":"Desayuno/Merienda","etiquetas":["Colección inicial"],"contenido":{"preparacion":"Seleccionar opciones y definir cantidades en el contexto del plan individual.","alternativas":"","notas":"Esquema descriptivo para editar. Las partes no determinan gramos, porciones ni composición química."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"},"relaciones":[{"referencia_id":"00000000-0011-4000-8000-000000000004","detalle":{"fraccion":0.5,"ejemplos":"Elegir una fruta y definir cantidad.","coccion":"Según elección."},"instantanea":{"id":"00000000-0011-4000-8000-000000000004","version":1,"tipo":"grupo","nombre":"Frutas · opciones para personalizar","categoria":"Frutas","etiquetas":["Colección inicial"],"contenido":{"ejemplos":"Banana, manzana, pera, cítricos. Elegir variedades y cantidades de forma profesional.","coccion":"Frescas, en compota o al horno, según el alimento y la preparación.","notas":"Agrupación descriptiva. Los ejemplos no implican equivalencia nutricional ni reemplazo automático."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"}},{"referencia_id":"00000000-0011-4000-8000-000000000005","detalle":{"fraccion":0.5,"ejemplos":"Elegir un lácteo y definir cantidad.","coccion":"Según producto."},"instantanea":{"id":"00000000-0011-4000-8000-000000000005","version":1,"tipo":"grupo","nombre":"Lácteos · opciones para personalizar","categoria":"Lácteos","etiquetas":["Colección inicial"],"contenido":{"ejemplos":"Leche, yogur natural y quesos. Revisar cada producto y su composición.","coccion":"Según el producto y la receta.","notas":"No equiparar porciones ni asumir tolerancia o indicaciones a partir del grupo."},"archivado_en":null,"actualizado_en":"2026-11-12T18:00:00Z"}}]}'::jsonb,'Colección inicial Nutrisfera, edición 1 del 12/11/2026. No es una indicación clínica individual.','Contenido original redactado para Nutrisfera. Reutilización y edición permitidas dentro de la aplicación; requiere revisión profesional.','2026-11-12T18:00:00Z');
