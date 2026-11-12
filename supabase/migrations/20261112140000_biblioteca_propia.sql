-- Biblioteca propia (11A). Solo recursos reutilizables; sin asociaciones a pacientes.
create function privado.numero_biblioteca(p_valor jsonb, p_min numeric, p_max numeric, p_nulo boolean default false)
returns boolean language sql immutable set search_path='' as $$
  select case when p_valor is null or p_valor='null'::jsonb then p_nulo
    when jsonb_typeof(p_valor)<>'number' then false
    else (p_valor::text)::numeric between p_min and p_max end;
$$;

create function privado.validar_contenido_biblioteca(p_tipo text, p_contenido jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare clave text; permitidas text[];
begin
  if jsonb_typeof(p_contenido) is distinct from 'object' then return false; end if;
  permitidas := case p_tipo
    when 'fuente' then array['referencia','version','licencia','fecha','base','notas']
    when 'alimento' then array['energia','proteinas','carbohidratos','grasas','notas']
    when 'grupo' then array['ejemplos','coccion','notas']
    when 'plato' then array['porciones','peso_final','preparacion','alternativas','notas']
    when 'plato_grupos' then array['preparacion','alternativas','notas'] else null end;
  if permitidas is null then return false; end if;
  for clave in select jsonb_object_keys(p_contenido) loop
    if not clave=any(permitidas) then return false; end if;
    if clave not in ('energia','proteinas','carbohidratos','grasas','porciones','peso_final') and
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
  elsif p_tipo='alimento' then
    if not privado.numero_biblioteca(p_contenido->'energia',0,10000,true) then return false; end if;
    foreach clave in array array['proteinas','carbohidratos','grasas'] loop
      if not privado.numero_biblioteca(p_contenido->clave,0,100,true) then return false; end if;
    end loop;
    if coalesce((p_contenido->>'proteinas')::numeric,0)+coalesce((p_contenido->>'carbohidratos')::numeric,0)+coalesce((p_contenido->>'grasas')::numeric,0)>100 then return false; end if;
  elsif p_tipo='plato' then
    if not privado.numero_biblioteca(p_contenido->'porciones',0.001,10000) or not privado.numero_biblioteca(p_contenido->'peso_final',0.001,1000000,true) then return false; end if;
  end if;
  return true;
exception when others then return false;
end $$;
revoke all on function privado.numero_biblioteca(jsonb,numeric,numeric,boolean), privado.validar_contenido_biblioteca(text,jsonb) from public,anon,authenticated;

create table public.biblioteca_recursos (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios(id),
  creado_por uuid not null references public.perfiles(id),
  tipo text not null check(tipo in ('fuente','alimento','grupo','plato','plato_grupos')),
  nombre text not null check(length(btrim(nombre)) between 1 and 150),
  categoria text not null default '' check(length(categoria)<=80),
  etiquetas text[] not null default '{}' check(cardinality(etiquetas)<=12 and length(array_to_string(etiquetas,','))<=360),
  contenido jsonb not null check(privado.validar_contenido_biblioteca(tipo,contenido)),
  fuente_id uuid,
  fuente_instantanea jsonb,
  version integer not null default 1 check(version>=1),
  duplicado_de uuid,
  archivado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique(id,consultorio_id),
  foreign key(fuente_id,consultorio_id) references public.biblioteca_recursos(id,consultorio_id),
  foreign key(duplicado_de,consultorio_id) references public.biblioteca_recursos(id,consultorio_id),
  check((tipo='alimento')=(fuente_id is not null))
);
create index biblioteca_recursos_listado on public.biblioteca_recursos(consultorio_id,tipo,actualizado_en desc,id);

create table public.biblioteca_relaciones (
  recurso_id uuid not null,
  consultorio_id uuid not null,
  orden integer not null check(orden between 1 and 100),
  referencia_id uuid not null,
  detalle jsonb not null check(jsonb_typeof(detalle)='object'),
  instantanea jsonb not null,
  primary key(recurso_id,orden),
  foreign key(recurso_id,consultorio_id) references public.biblioteca_recursos(id,consultorio_id),
  foreign key(referencia_id,consultorio_id) references public.biblioteca_recursos(id,consultorio_id),
  check(recurso_id<>referencia_id)
);
create table public.biblioteca_versiones (
  recurso_id uuid not null,
  consultorio_id uuid not null,
  version integer not null,
  guardada_en timestamptz not null default now(),
  guardada_por uuid not null references public.perfiles(id),
  instantanea jsonb not null,
  primary key(recurso_id,version),
  foreign key(recurso_id,consultorio_id) references public.biblioteca_recursos(id,consultorio_id)
);

-- Las únicas escrituras son RPC: no hay borrado físico ni edición de instantáneas.
revoke all on public.biblioteca_recursos,public.biblioteca_relaciones,public.biblioteca_versiones from public,anon,authenticated;
grant select on public.biblioteca_recursos,public.biblioteca_relaciones,public.biblioteca_versiones to authenticated;
alter table public.biblioteca_recursos enable row level security;
alter table public.biblioteca_relaciones enable row level security;
alter table public.biblioteca_versiones enable row level security;
create policy biblioteca_recursos_lectura on public.biblioteca_recursos for select to authenticated using(privado.es_miembro_consultorio(consultorio_id));
create policy biblioteca_recursos_alta on public.biblioteca_recursos for insert to authenticated with check(false);
create policy biblioteca_recursos_edicion on public.biblioteca_recursos for update to authenticated using(false) with check(false);
create policy biblioteca_recursos_borrado on public.biblioteca_recursos for delete to authenticated using(false);
create policy biblioteca_relaciones_lectura on public.biblioteca_relaciones for select to authenticated using(privado.es_miembro_consultorio(consultorio_id));
create policy biblioteca_relaciones_alta on public.biblioteca_relaciones for insert to authenticated with check(false);
create policy biblioteca_relaciones_edicion on public.biblioteca_relaciones for update to authenticated using(false) with check(false);
create policy biblioteca_relaciones_borrado on public.biblioteca_relaciones for delete to authenticated using(false);
create policy biblioteca_versiones_lectura on public.biblioteca_versiones for select to authenticated using(privado.es_miembro_consultorio(consultorio_id));
create policy biblioteca_versiones_alta on public.biblioteca_versiones for insert to authenticated with check(false);
create policy biblioteca_versiones_edicion on public.biblioteca_versiones for update to authenticated using(false) with check(false);
create policy biblioteca_versiones_borrado on public.biblioteca_versiones for delete to authenticated using(false);

create function public.gestionar_biblioteca(p_accion text,p_datos jsonb) returns uuid
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
    if p_datos->>'tipo'='alimento' then
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
    if recurso.tipo not in ('plato','plato_grupos') and jsonb_array_length(filas)<>0 then raise exception 'datos_invalidos'; end if;
    if recurso.tipo in ('plato','plato_grupos') and jsonb_array_length(filas)=0 then raise exception 'composicion_vacia'; end if;
    delete from public.biblioteca_relaciones where recurso_id=recurso.id and consultorio_id=consultorio;
    for fila in select value from jsonb_array_elements(filas) loop
      numero:=numero+1; detalle:=fila->'detalle';
      select * into referencia from public.biblioteca_recursos where id=(fila->>'referencia_id')::uuid and consultorio_id=consultorio and archivado_en is null and tipo=case when recurso.tipo='plato' then 'alimento' else 'grupo' end for share;
      if not found then raise exception 'referencia_invalida'; end if;
      select v.instantanea->'recurso' into referencia_copia from public.biblioteca_versiones v
        where v.recurso_id=referencia.id and v.consultorio_id=consultorio and v.version=coalesce((fila->>'referencia_version')::integer,referencia.version);
      if not found then raise exception 'referencia_invalida'; end if;
      if jsonb_typeof(detalle) is distinct from 'object' then raise exception 'datos_invalidos'; end if;
      if recurso.tipo='plato' then
        if not privado.numero_biblioteca(detalle->'cantidad',0.001,1000000) or coalesce(detalle->>'unidad','') not in ('g','ml','unidad','porcion') or
          not privado.numero_biblioteca(detalle->'gramos_por_unidad',0.001,1000000,true) or not privado.numero_biblioteca(detalle->'rendimiento',0.001,1000) then raise exception 'datos_invalidos'; end if;
        if detalle->>'unidad'='g' and (detalle->>'gramos_por_unidad')::numeric is distinct from 1 then raise exception 'datos_invalidos'; end if;
        for clave in select jsonb_object_keys(detalle) loop
          if clave not in ('cantidad','unidad','gramos_por_unidad','rendimiento') then raise exception 'datos_invalidos'; end if;
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

create function public.consultar_biblioteca(p_filtros jsonb default '{}') returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_tipo text:=coalesce(p_filtros->>'tipo','plato'); pagina integer:=coalesce((p_filtros->>'pagina')::integer,1);
  busqueda text:=coalesce(p_filtros->>'q',''); v_categoria text:=coalesce(p_filtros->>'categoria',''); archivados boolean:=coalesce((p_filtros->>'archivados')::boolean,false);
begin
  if v_tipo not in ('fuente','alimento','grupo','plato','plato_grupos') or pagina not between 1 and 100000 or length(busqueda)>100 or length(v_categoria)>80 then raise exception 'filtro_invalido'; end if;
  return (with filtrados as (
    select r.* from public.biblioteca_recursos r where r.tipo=v_tipo and (r.archivado_en is not null)=archivados
      and (v_categoria='' or r.categoria=v_categoria) and (busqueda='' or r.nombre ilike '%'||busqueda||'%' or array_to_string(r.etiquetas,' ') ilike '%'||busqueda||'%')
  ), pagina_actual as (select id,tipo,nombre,categoria,etiquetas,version,archivado_en,actualizado_en,
      case when tipo='alimento' then contenido else contenido-'preparacion'-'alternativas'-'notas'-'ejemplos'-'coccion' end as contenido
    from filtrados order by actualizado_en desc,id limit 25 offset ((pagina-1)*25))
  select jsonb_build_object('recursos',coalesce((select jsonb_agg(to_jsonb(p)) from pagina_actual p),'[]'::jsonb),'total',(select count(*) from filtrados),
    'contadores',(select coalesce(jsonb_object_agg(c.tipo,c.cantidad),'{}'::jsonb) from (select r.tipo,count(*) cantidad from public.biblioteca_recursos r where (r.archivado_en is not null)=archivados group by r.tipo) c),
    'categorias',(select coalesce(jsonb_agg(distinct r.categoria order by r.categoria),'[]'::jsonb) from public.biblioteca_recursos r where r.tipo=v_tipo and r.categoria<>'' and (r.archivado_en is not null)=archivados)));
end $$;

create function public.obtener_recurso_biblioteca(p_id uuid,p_version integer default null) returns jsonb
language sql stable security invoker set search_path='' as $$
  select v.instantanea||jsonb_build_object('historial',(select jsonb_agg(jsonb_build_object('version',h.version,'guardada_en',h.guardada_en) order by h.version desc) from public.biblioteca_versiones h where h.recurso_id=r.id))
  from public.biblioteca_recursos r join public.biblioteca_versiones v on v.recurso_id=r.id and v.version=coalesce(p_version,r.version) where r.id=p_id;
$$;
revoke all on function public.gestionar_biblioteca(text,jsonb),public.consultar_biblioteca(jsonb),public.obtener_recurso_biblioteca(uuid,integer) from public,anon;
grant execute on function public.gestionar_biblioteca(text,jsonb),public.consultar_biblioteca(jsonb),public.obtener_recurso_biblioteca(uuid,integer) to authenticated;
