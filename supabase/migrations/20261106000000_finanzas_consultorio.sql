-- Finanzas de pacientes: independientes de las suscripciones de la plataforma.
create table public.servicios_consultorio (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios(id),
  profesional_id uuid not null references auth.users(id),
  nombre text not null check (length(btrim(nombre)) between 1 and 100),
  descripcion text check (length(descripcion) <= 1000),
  precio numeric(14,2) not null check (precio >= 0 and precio < 1000000000000),
  moneda text not null check (moneda ~ '^[A-Z]{3}$'),
  duracion_minutos integer check (duracion_minutos between 10 and 240),
  activo boolean not null default true,
  unique(id, consultorio_id)
);
create table public.configuracion_financiera (
  profesional_id uuid primary key references auth.users(id),
  consultorio_id uuid not null references public.consultorios(id),
  moneda text not null default 'ARS' check (moneda ~ '^[A-Z]{3}$'),
  dias_vencimiento integer not null default 0 check (dias_vencimiento between 0 and 365),
  recordatorios boolean not null default false,
  plazos integer[] not null default '{24,48}' check (cardinality(plazos) between 1 and 5 and 0 < all(plazos)),
  instrucciones text not null default '' check (length(instrucciones) <= 2000),
  texto_recordatorio text not null default 'Te recordamos que tenés un saldo pendiente. Comunicate con tu nutricionista para coordinar el pago.' check(length(texto_recordatorio) <= 2000),
  nombre_remitente text not null default 'Consultorio nutricional' check(length(nombre_remitente) between 1 and 100),
  medios text[] not null default '{Efectivo,Transferencia,Tarjeta de débito,Tarjeta de crédito,Billetera virtual,Otro}' check(cardinality(medios) between 1 and 20)
);
alter table public.turnos add column servicio_id uuid,
  add column atendido_en timestamptz;
alter table public.turnos add foreign key(servicio_id, consultorio_id) references public.servicios_consultorio(id, consultorio_id);
grant insert(servicio_id), update(servicio_id) on public.turnos to authenticated;
-- Consentimiento separado: nunca se infiere de una dirección de correo existente.
create table public.consentimientos_cobro (
  paciente_id uuid not null,
  consultorio_id uuid not null,
  profesional_id uuid not null references auth.users(id),
  autorizado boolean not null default false,
  registrado_en timestamptz not null default now(),
  primary key(paciente_id, profesional_id),
  foreign key(paciente_id,consultorio_id) references public.pacientes(id,consultorio_id)
);
create table public.operaciones_consultorio (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null unique,
  consultorio_id uuid not null references public.consultorios(id),
  profesional_id uuid not null references auth.users(id),
  paciente_id uuid not null,
  servicio_nombre text not null,
  moneda text not null check(moneda ~ '^[A-Z]{3}$'),
  original numeric(14,2) not null check(original >= 0 and original < 1000000000000),
  descuento numeric(14,2) not null default 0 check(descuento >= 0 and descuento < 1000000000000),
  abonado numeric(14,2) not null default 0 check(abonado >= 0 and abonado < 1000000000000),
  bonificado boolean not null default false,
  motivo text,
  vence_en timestamptz,
  check(descuento <= original and abonado <= original-descuento),
  foreign key(turno_id,consultorio_id) references public.turnos(id,consultorio_id),
  foreign key(paciente_id,consultorio_id) references public.pacientes(id,consultorio_id)
);
create table public.pagos_consultorio (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.operaciones_consultorio(id),
  consultorio_id uuid not null references public.consultorios(id),
  profesional_id uuid not null references auth.users(id),
  registrado_por uuid not null references auth.users(id),
  importe numeric(14,2) not null check(importe > 0 and importe < 1000000000000),
  fecha timestamptz not null,
  medio text not null check(length(medio) between 1 and 100),
  referencia text check(length(referencia) <= 200),
  observaciones text check(length(observaciones) <= 1000),
  clave uuid not null unique,
  revertido_en timestamptz,
  motivo_reversion text,
  check((revertido_en is null and tipo_reversion is null) or (revertido_en is not null and tipo_reversion is not null and length(btrim(motivo_reversion)) >= 3)),
  tipo_reversion text check(tipo_reversion in ('error','devolucion'))
);
create table public.movimientos_consultorio (
  id uuid primary key default gen_random_uuid(),
  consultorio_id uuid not null references public.consultorios(id),
  profesional_id uuid not null references auth.users(id),
  registrado_por uuid not null references auth.users(id),
  pago_id uuid references public.pagos_consultorio(id),
  tipo text not null check(tipo in ('ingreso','egreso')),
  categoria text not null check(length(categoria) between 1 and 100),
  descripcion text not null check(length(descripcion) between 1 and 500),
  importe numeric(14,2) not null check(importe > 0 and importe < 1000000000000),
  moneda text not null check(moneda ~ '^[A-Z]{3}$'),
  medio text not null,
  fecha timestamptz not null,
  clave uuid not null unique,
  compensacion_de uuid unique references public.movimientos_consultorio(id),
  unique(pago_id,tipo)
);
create table public.ajustes_consultorio (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.operaciones_consultorio(id),
  consultorio_id uuid not null references public.consultorios(id),
  profesional_id uuid not null references auth.users(id),
  registrado_por uuid not null references auth.users(id),
  fecha timestamptz not null default now(),
  detalle jsonb not null
);
create table public.recordatorios_cobro (
  id uuid primary key default gen_random_uuid(),
  operacion_id uuid not null references public.operaciones_consultorio(id),
  consultorio_id uuid not null references public.consultorios(id),
  profesional_id uuid not null references auth.users(id),
  clave text not null,
  programado_en timestamptz not null,
  intentos integer not null default 0,
  estado text not null default 'pendiente' check(estado in ('pendiente','enviando','enviado','cancelado','fallido','incierto')),
  reclamado_en timestamptz,
  enviado_en timestamptz,
  mensaje_id text,
  unique(operacion_id,clave)
);
create table public.intentos_recordatorio_cobro (
  id uuid primary key default gen_random_uuid(),
  recordatorio_id uuid not null references public.recordatorios_cobro(id),
  consultorio_id uuid not null references public.consultorios(id),
  profesional_id uuid not null references auth.users(id),
  fecha timestamptz not null default now(),
  resultado text not null
);
-- Lectura por dueño, sin acceso de pacientes, anónimos ni administradores.
-- Las mutaciones solo se otorgan a las funciones transaccionales de abajo.
do $$ declare tabla text; begin
  foreach tabla in array array['servicios_consultorio','configuracion_financiera','consentimientos_cobro','operaciones_consultorio','pagos_consultorio','movimientos_consultorio','ajustes_consultorio','recordatorios_cobro','intentos_recordatorio_cobro'] loop
    execute format('alter table public.%I enable row level security', tabla);
    execute format('revoke all on public.%I from anon, authenticated', tabla);
    execute format('grant select on public.%I to authenticated', tabla);
    execute format('create policy "profesional consulta sus finanzas" on public.%I for select to authenticated using (profesional_id = (select auth.uid()) and privado.es_miembro_consultorio(consultorio_id))', tabla);
  end loop;
end $$;
create index operaciones_finanzas_dueno on public.operaciones_consultorio(profesional_id,consultorio_id,paciente_id);
create index movimientos_finanzas_fecha on public.movimientos_consultorio(profesional_id,fecha);
create index recordatorios_finanzas_pendientes on public.recordatorios_cobro(estado,programado_en);

create function privado.preparar_economia_turno() returns trigger
language plpgsql security definer set search_path = '' as $$
declare servicio public.servicios_consultorio; begin
  if tg_op = 'UPDATE' then
    if exists(select 1 from public.operaciones_consultorio where turno_id = old.id) and
      (new.paciente_id <> old.paciente_id or new.profesional_id <> old.profesional_id or new.servicio_id is distinct from old.servicio_id) then
      raise exception 'operacion_historica';
    end if;
    new.atendido_en := old.atendido_en;
  else new.atendido_en := null;
  end if;
  if new.servicio_id is not null and (tg_op = 'INSERT' or new.servicio_id is distinct from old.servicio_id) then
    select * into servicio from public.servicios_consultorio where id = new.servicio_id and consultorio_id = new.consultorio_id and profesional_id = new.profesional_id and activo;
    if not found then raise exception 'servicio_invalido'; end if;
  end if;
  if new.estado = 'completado' and new.atendido_en is null then new.atendido_en := now(); end if;
  return new;
end $$;
-- El trigger clínico asigna profesional_id primero (orden alfabético).
create trigger zz_economia_preparar before insert or update on public.turnos
for each row execute function privado.preparar_economia_turno();
create function privado.vincular_economia_turno() returns trigger
language plpgsql security definer set search_path = '' as $$
declare dias integer; begin
  select coalesce(dias_vencimiento,0) into dias from public.configuracion_financiera where profesional_id = new.profesional_id;
  if new.servicio_id is not null then
    insert into public.operaciones_consultorio(turno_id,consultorio_id,profesional_id,paciente_id,servicio_nombre,moneda,original)
      select new.id,new.consultorio_id,new.profesional_id,new.paciente_id,nombre,moneda,precio from public.servicios_consultorio where id=new.servicio_id
      on conflict(turno_id) do nothing;
  end if;
  if new.atendido_en is not null then
    update public.operaciones_consultorio set vence_en=coalesce(vence_en,new.atendido_en + make_interval(days=>coalesce(dias,0))) where turno_id=new.id;
  end if;
  if new.estado in ('cancelado','ausente') then
    update public.recordatorios_cobro set estado='cancelado' where operacion_id in(select id from public.operaciones_consultorio where turno_id=new.id) and estado in ('pendiente','fallido');
  end if;
  return new;
end $$;
create trigger zz_economia_vincular after insert or update on public.turnos for each row execute function privado.vincular_economia_turno();

create function public.gestionar_finanzas(p_accion text, p_datos jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare usuario uuid := auth.uid(); consultorio uuid; identificador uuid; operacion public.operaciones_consultorio;
  pago public.pagos_consultorio; importe numeric; campo text; numero numeric; clave_operacion uuid; servicio public.servicios_consultorio; movimiento public.movimientos_consultorio;
begin
  select consultorio_id into consultorio from public.miembros_consultorio where usuario_id=usuario and privado.es_miembro_consultorio(consultorio_id) limit 1;
  if usuario is null or consultorio is null then raise exception 'sin_permiso'; end if;
  foreach campo in array array['precio','importe','descuento'] loop
    if p_datos ? campo then
      if jsonb_typeof(p_datos->campo)<>'number' then raise exception 'importe_invalido'; end if;
      numero:=(p_datos->>campo)::numeric;
      if numero<0 or numero>=1000000000000 or numero<>round(numero,2) then raise exception 'importe_invalido'; end if;
    end if;
  end loop;
  insert into public.configuracion_financiera(profesional_id,consultorio_id) values(usuario,consultorio) on conflict do nothing;
  if p_accion='servicio' then
    identificador := coalesce(nullif(p_datos->>'id','')::uuid,gen_random_uuid());
    insert into public.servicios_consultorio(id,consultorio_id,profesional_id,nombre,descripcion,precio,moneda,duracion_minutos,activo)
      values(identificador,consultorio,usuario,btrim(p_datos->>'nombre'),p_datos->>'descripcion',(p_datos->>'precio')::numeric,p_datos->>'moneda',nullif(p_datos->>'duracion','')::integer,(p_datos->>'activo')::boolean)
      on conflict(id) do update set nombre=excluded.nombre,descripcion=excluded.descripcion,precio=excluded.precio,moneda=excluded.moneda,duracion_minutos=excluded.duracion_minutos,activo=excluded.activo
      where servicios_consultorio.profesional_id=usuario and servicios_consultorio.consultorio_id=consultorio;
    if not found then raise exception 'sin_permiso'; end if;
  elsif p_accion='configuracion' then
    update public.configuracion_financiera set moneda=p_datos->>'moneda',dias_vencimiento=(p_datos->>'dias')::integer,recordatorios=(p_datos->>'recordatorios')::boolean,
      instrucciones=p_datos->>'instrucciones',nombre_remitente=p_datos->>'nombre',texto_recordatorio=p_datos->>'texto',
      plazos=array(select jsonb_array_elements_text(p_datos->'plazos')::integer),medios=array(select jsonb_array_elements_text(p_datos->'medios'))
      where profesional_id=usuario;
  elsif p_accion='consentimiento' then
    if not exists(select 1 from public.pacientes where id=(p_datos->>'paciente')::uuid and consultorio_id=consultorio) then raise exception 'sin_permiso'; end if;
    insert into public.consentimientos_cobro(paciente_id,consultorio_id,profesional_id,autorizado) values((p_datos->>'paciente')::uuid,consultorio,usuario,(p_datos->>'autorizado')::boolean)
    on conflict(paciente_id,profesional_id) do update set autorizado=excluded.autorizado,registrado_en=now();
  elsif p_accion='movimiento' then
    clave_operacion:=(p_datos->>'clave')::uuid;
    if exists(select 1 from public.movimientos_consultorio where movimientos_consultorio.clave=clave_operacion and profesional_id=usuario) then return jsonb_build_object('ok',true); end if;
    if (p_datos->>'fecha')::timestamptz > now() then raise exception 'fecha_futura'; end if;
    insert into public.movimientos_consultorio(consultorio_id,profesional_id,registrado_por,tipo,categoria,descripcion,importe,moneda,medio,fecha,clave)
      values(consultorio,usuario,usuario,p_datos->>'tipo',p_datos->>'categoria',p_datos->>'descripcion',(p_datos->>'importe')::numeric,p_datos->>'moneda',p_datos->>'medio',(p_datos->>'fecha')::timestamptz,clave_operacion) on conflict(clave) do nothing;
  elsif p_accion='revertir_movimiento' then
    select * into movimiento from public.movimientos_consultorio where id=(p_datos->>'id')::uuid and profesional_id=usuario and consultorio_id=consultorio for update;
    if not found or movimiento.pago_id is not null or movimiento.compensacion_de is not null then raise exception 'movimiento_invalido'; end if;
    if length(btrim(coalesce(p_datos->>'motivo',''))) < 3 then raise exception 'motivo_requerido'; end if;
    insert into public.movimientos_consultorio(consultorio_id,profesional_id,registrado_por,tipo,categoria,descripcion,importe,moneda,medio,fecha,clave,compensacion_de)
      values(consultorio,usuario,usuario,case movimiento.tipo when 'ingreso' then 'egreso' else 'ingreso' end,'Corrección',p_datos->>'motivo',movimiento.importe,movimiento.moneda,movimiento.medio,now(),(p_datos->>'clave')::uuid,movimiento.id)
      on conflict(compensacion_de) do nothing;
  else
    -- El bloqueo del turno precede al de la operación, igual que los triggers.
    perform 1 from public.turnos where id=(p_datos->>'turno')::uuid and consultorio_id=consultorio and profesional_id=usuario for update;
    if not found then raise exception 'sin_permiso'; end if;
    if p_accion='asignar' then
      if exists(select 1 from public.operaciones_consultorio where turno_id=(p_datos->>'turno')::uuid) then raise exception 'operacion_historica'; end if;
      update public.turnos set servicio_id=(p_datos->>'servicio')::uuid where id=(p_datos->>'turno')::uuid;
      return jsonb_build_object('ok',true);
    end if;
    select * into operacion from public.operaciones_consultorio where turno_id=(p_datos->>'turno')::uuid and profesional_id=usuario and consultorio_id=consultorio for update;
    if not found then raise exception 'precio_sin_configurar'; end if;
    if p_accion='pago' then
      clave_operacion:=(p_datos->>'clave')::uuid;
      select * into pago from public.pagos_consultorio where pagos_consultorio.clave=clave_operacion;
      if found then
        if pago.operacion_id<>operacion.id or pago.importe<>(p_datos->>'importe')::numeric or pago.fecha is distinct from (p_datos->>'fecha')::timestamptz or pago.medio is distinct from p_datos->>'medio' or pago.referencia is distinct from p_datos->>'referencia' or pago.observaciones is distinct from p_datos->>'observaciones' then raise exception 'clave_reutilizada'; end if;
        return jsonb_build_object('ok',true);
      end if;
      if exists(select 1 from public.turnos where id=operacion.turno_id and estado in ('cancelado','ausente')) then raise exception 'turno_no_cobrable'; end if;
      importe:=(p_datos->>'importe')::numeric;
      if importe is null or importe<=0 or importe<>round(importe,2) or importe>operacion.original-operacion.descuento-operacion.abonado then raise exception 'importe_invalido'; end if;
      if (p_datos->>'fecha')::timestamptz > now() then raise exception 'fecha_futura'; end if;
      if not exists(select 1 from public.configuracion_financiera where profesional_id=usuario and (p_datos->>'medio')=any(medios)) then raise exception 'medio_invalido'; end if;
      insert into public.pagos_consultorio(operacion_id,consultorio_id,profesional_id,registrado_por,importe,fecha,medio,referencia,observaciones,clave)
        values(operacion.id,consultorio,usuario,usuario,importe,(p_datos->>'fecha')::timestamptz,p_datos->>'medio',p_datos->>'referencia',p_datos->>'observaciones',clave_operacion) returning * into pago;
      update public.operaciones_consultorio set abonado=abonado+importe where id=operacion.id;
      insert into public.movimientos_consultorio(consultorio_id,profesional_id,registrado_por,pago_id,tipo,categoria,descripcion,importe,moneda,medio,fecha,clave)
        values(consultorio,usuario,usuario,pago.id,'ingreso','Consultas',operacion.servicio_nombre,importe,operacion.moneda,pago.medio,pago.fecha,clave_operacion);
    elsif p_accion='ajuste' then
      importe:=case when (p_datos->>'bonificado')::boolean then operacion.original when p_datos->>'tipo'='porcentaje' then round(operacion.original*(p_datos->>'descuento')::numeric/100,2) else (p_datos->>'descuento')::numeric end;
      if importe is null or importe<0 or importe<>round(importe,2) or importe>operacion.original-operacion.abonado then raise exception 'descuento_invalido'; end if;
      insert into public.ajustes_consultorio(operacion_id,consultorio_id,profesional_id,registrado_por,detalle) values(operacion.id,consultorio,usuario,usuario,jsonb_build_object('anterior',operacion.descuento,'nuevo',importe,'bonificado',p_datos->'bonificado','motivo',p_datos->>'motivo'));
      update public.operaciones_consultorio set descuento=importe,bonificado=(p_datos->>'bonificado')::boolean,motivo=p_datos->>'motivo',vence_en=coalesce(nullif(p_datos->>'vence','')::timestamptz,vence_en) where id=operacion.id;
    elsif p_accion='reversion' then
      if length(btrim(coalesce(p_datos->>'motivo',''))) < 3 then raise exception 'motivo_requerido'; end if;
      select * into pago from public.pagos_consultorio where id=(p_datos->>'pago')::uuid and operacion_id=operacion.id for update;
      if not found then raise exception 'pago_invalido'; end if;
      if pago.revertido_en is not null then return jsonb_build_object('ok',true); end if;
      update public.pagos_consultorio set revertido_en=now(),motivo_reversion=p_datos->>'motivo',tipo_reversion=p_datos->>'tipo' where id=pago.id;
      update public.operaciones_consultorio set abonado=abonado-pago.importe where id=operacion.id;
      insert into public.movimientos_consultorio(consultorio_id,profesional_id,registrado_por,pago_id,tipo,categoria,descripcion,importe,moneda,medio,fecha,clave)
        values(consultorio,usuario,usuario,pago.id,'egreso','Reversión',p_datos->>'motivo',pago.importe,operacion.moneda,pago.medio,now(),(p_datos->>'clave')::uuid);
    elsif p_accion='recordatorio' then
      if operacion.original-operacion.descuento-operacion.abonado<=0 then raise exception 'sin_saldo'; end if;
      if not exists(select 1 from public.turnos where id=operacion.turno_id and estado='completado' and atendido_en is not null) then raise exception 'consulta_no_atendida'; end if;
      if not exists(select 1 from public.consentimientos_cobro where paciente_id=operacion.paciente_id and profesional_id=usuario and autorizado) then raise exception 'sin_consentimiento'; end if;
      insert into public.recordatorios_cobro(operacion_id,consultorio_id,profesional_id,clave,programado_en) values(operacion.id,consultorio,usuario,'manual-'||(p_datos->>'clave'),now()) on conflict do nothing;
    else raise exception 'accion_invalida'; end if;
    update public.recordatorios_cobro set estado='cancelado' where operacion_id=operacion.id and estado in ('pendiente','fallido') and exists(select 1 from public.operaciones_consultorio where id=operacion.id and original-descuento-abonado=0);
  end if;
  return jsonb_build_object('ok',true);
end $$;
revoke all on function public.gestionar_finanzas(text,jsonb) from public,anon;
grant execute on function public.gestionar_finanzas(text,jsonb) to authenticated;

create function public.consultar_finanzas(p_turno uuid default null,p_paciente uuid default null) returns jsonb language sql stable security invoker set search_path='' as $$
with operaciones as (select * from public.operaciones_consultorio where (p_turno is null or turno_id=p_turno) and (p_paciente is null or paciente_id=p_paciente))
select jsonb_build_object(
 'ahora',now(),
 'servicios',coalesce((select jsonb_agg(s order by s.nombre) from public.servicios_consultorio s),'[]'::jsonb),
 'configuracion',(select to_jsonb(c) from public.configuracion_financiera c),
 'consentimientos',coalesce((select jsonb_agg(c) from public.consentimientos_cobro c),'[]'::jsonb),
 'operaciones',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object('paciente',p.nombre||' '||p.apellido,'inicio',t.inicio,'estado_turno',t.estado,'atendido_en',t.atendido_en) order by t.inicio desc) from operaciones o join public.turnos t on t.id=o.turno_id join public.pacientes p on p.id=o.paciente_id),'[]'::jsonb),
 'pagos',coalesce((select jsonb_agg(p order by p.fecha desc) from public.pagos_consultorio p where p.operacion_id in(select id from operaciones)),'[]'::jsonb),
 'movimientos',coalesce((select jsonb_agg(m order by m.fecha desc) from public.movimientos_consultorio m where p_turno is null and p_paciente is null),'[]'::jsonb),
 'ajustes',coalesce((select jsonb_agg(a order by a.fecha desc) from public.ajustes_consultorio a where a.operacion_id in(select id from operaciones)),'[]'::jsonb),
 'recordatorios',coalesce((select jsonb_agg(r order by r.programado_en desc) from public.recordatorios_cobro r where r.operacion_id in(select id from operaciones)),'[]'::jsonb),
 'intentos',coalesce((select jsonb_agg(i order by i.fecha desc) from public.intentos_recordatorio_cobro i where i.recordatorio_id in(select id from public.recordatorios_cobro where operacion_id in(select id from operaciones))),'[]'::jsonb),
 'atenciones',coalesce((select jsonb_agg(jsonb_build_object('paciente_id',t.paciente_id,'fecha',t.atendido_en,'servicio',coalesce(o.servicio_nombre,s.nombre))) from public.turnos t left join public.servicios_consultorio s on t.servicio_id=s.id left join public.operaciones_consultorio o on o.turno_id=t.id where t.profesional_id=auth.uid() and (p_turno is null or t.id=p_turno) and (p_paciente is null or t.paciente_id=p_paciente) and t.estado='completado' and t.atendido_en is not null),'[]'::jsonb)
);
$$;
revoke all on function public.consultar_finanzas(uuid,uuid) from public,anon;
grant execute on function public.consultar_finanzas(uuid,uuid) to authenticated;

create function public.preparar_recordatorios_cobro() returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.recordatorios_cobro(operacion_id,consultorio_id,profesional_id,clave,programado_en)
 select o.id,o.consultorio_id,o.profesional_id,'automatico-'||plazo,t.atendido_en+make_interval(hours=>plazo)
 from public.operaciones_consultorio o join public.turnos t on t.id=o.turno_id
 join public.configuracion_financiera c on c.profesional_id=o.profesional_id
 join public.consentimientos_cobro a on a.paciente_id=o.paciente_id and a.profesional_id=o.profesional_id
 cross join lateral unnest(c.plazos) plazo
 where c.recordatorios and a.autorizado and t.estado='completado' and t.atendido_en is not null and o.original-o.descuento-o.abonado>0
 on conflict(operacion_id,clave) do nothing;
 -- Un proceso que murió durante SMTP requiere revisión; no se reenvía a ciegas.
 with abandonados as (update public.recordatorios_cobro set estado='incierto' where estado='enviando' and reclamado_en < now()-interval '15 minutes' returning *)
 insert into public.intentos_recordatorio_cobro(recordatorio_id,consultorio_id,profesional_id,resultado) select id,consultorio_id,profesional_id,'incierto' from abandonados;
 update public.recordatorios_cobro r set estado='cancelado' from public.operaciones_consultorio o,public.turnos t,public.configuracion_financiera c
 where r.operacion_id=o.id and t.id=o.turno_id and c.profesional_id=o.profesional_id and r.estado in ('pendiente','fallido')
 and (o.original-o.descuento-o.abonado<=0 or t.estado<>'completado' or (r.clave like 'automatico-%' and not c.recordatorios)
 or not exists(select 1 from public.consentimientos_cobro a where a.paciente_id=o.paciente_id and a.profesional_id=o.profesional_id and a.autorizado));
end $$;
create function public.reclamar_recordatorios_cobro() returns jsonb language plpgsql security definer set search_path='' as $$
declare resultado jsonb; begin
 with lote as (
 select r.id from public.recordatorios_cobro r where r.estado in ('pendiente','fallido') and r.intentos<4 and r.programado_en<=now()
 order by r.programado_en for update skip locked limit 10
 ), reclamados as (
 update public.recordatorios_cobro r set estado='enviando',reclamado_en=now(),intentos=intentos+1 from lote where r.id=lote.id returning r.*
 ) select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('correo',p.correo,'paciente',p.nombre,'consulta',t.inicio,'original',o.original,'abonado',o.abonado,'saldo',o.original-o.descuento-o.abonado,'moneda',o.moneda,'nombre_remitente',c.nombre_remitente,'instrucciones',c.instrucciones,'texto',c.texto_recordatorio,'zona',co.zona_horaria)),'[]'::jsonb)
 into resultado from reclamados r join public.operaciones_consultorio o on o.id=r.operacion_id join public.pacientes p on p.id=o.paciente_id join public.turnos t on t.id=o.turno_id join public.configuracion_financiera c on c.profesional_id=o.profesional_id join public.consultorios co on co.id=o.consultorio_id;
 return resultado;
end $$;
create function public.confirmar_recordatorio_cobro(p_id uuid,p_reclamado text,p_resultado text,p_mensaje text) returns void language plpgsql security definer set search_path='' as $$
declare aviso public.recordatorios_cobro; begin
 select * into aviso from public.recordatorios_cobro where id=p_id and reclamado_en=p_reclamado::timestamptz and estado='enviando' for update;
 if not found then raise exception 'reclamo_vencido'; end if;
 if p_resultado not in ('enviado','fallido','incierto','cancelado') then raise exception 'resultado_invalido'; end if;
 update public.recordatorios_cobro set estado=p_resultado,mensaje_id=p_mensaje,enviado_en=case when p_resultado='enviado' then now() else null end,programado_en=case when p_resultado='fallido' then now()+make_interval(mins=>15*intentos) else programado_en end where id=p_id;
 insert into public.intentos_recordatorio_cobro(recordatorio_id,consultorio_id,profesional_id,resultado) values(p_id,aviso.consultorio_id,aviso.profesional_id,p_resultado);
end $$;
revoke all on function public.preparar_recordatorios_cobro(),public.reclamar_recordatorios_cobro(),public.confirmar_recordatorio_cobro(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.preparar_recordatorios_cobro(),public.reclamar_recordatorios_cobro(),public.confirmar_recordatorio_cobro(uuid,text,text,text) to service_role;
grant select on public.operaciones_consultorio,public.configuracion_financiera,public.consentimientos_cobro to service_role;

create function public.validar_recordatorio_cobro(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('correo',p.correo,'paciente',p.nombre,'consulta',t.inicio,'original',o.original,'abonado',o.abonado,'saldo',o.original-o.descuento-o.abonado,'moneda',o.moneda,'nombre_remitente',c.nombre_remitente,'instrucciones',c.instrucciones,'texto',c.texto_recordatorio,'zona',co.zona_horaria)
 from public.recordatorios_cobro r join public.operaciones_consultorio o on o.id=r.operacion_id join public.turnos t on t.id=o.turno_id join public.pacientes p on p.id=o.paciente_id
 join public.configuracion_financiera c on c.profesional_id=o.profesional_id join public.consultorios co on co.id=o.consultorio_id
 where r.id=p_id and r.estado='enviando' and t.estado='completado' and o.original-o.descuento-o.abonado>0 and p.correo is not null
 and (r.clave like 'manual-%' or c.recordatorios) and exists(select 1 from public.consentimientos_cobro a where a.paciente_id=o.paciente_id and a.profesional_id=o.profesional_id and a.autorizado);
$$;
revoke all on function public.validar_recordatorio_cobro(uuid) from public,anon,authenticated;
grant execute on function public.validar_recordatorio_cobro(uuid) to service_role;

create function public.consultar_economia_turnos(p_turnos uuid[]) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(o)||jsonb_build_object('paciente',p.nombre||' '||p.apellido,'inicio',t.inicio,'estado_turno',t.estado,'atendido_en',t.atendido_en)),'[]'::jsonb)
 from public.operaciones_consultorio o join public.turnos t on t.id=o.turno_id join public.pacientes p on p.id=o.paciente_id where o.turno_id=any(p_turnos);
$$;
revoke all on function public.consultar_economia_turnos(uuid[]) from public,anon;
grant execute on function public.consultar_economia_turnos(uuid[]) to authenticated;
