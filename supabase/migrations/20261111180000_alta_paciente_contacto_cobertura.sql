-- Alta mínima: solamente nombre. Los campos de cobertura son administrativos.
alter table public.pacientes
  drop constraint pacientes_apellido_check,
  alter column apellido set default '',
  add constraint pacientes_apellido_check check (char_length(btrim(apellido)) <= 80),
  add column sexo text check (sexo is null or sexo in ('femenino', 'masculino', 'x')),
  add column obra_social text check (obra_social is null or char_length(obra_social) <= 120),
  add column numero_afiliado text check (numero_afiliado is null or char_length(numero_afiliado) <= 80);

comment on column public.pacientes.sexo is 'Dato opcional declarado; no inferir desde el nombre ni usar como criterio clínico automático.';
comment on column public.pacientes.numero_afiliado is 'Identificador de cobertura opcional; conservar ceros iniciales.';

-- Se mantienen las políticas RLS existentes por operación: miembros seleccionan,
-- insertan y actualizan; la persona solo selecciona su ficha. No se permite borrar.
-- SELECT ya está concedido sobre la tabla. Las escrituras se conceden por columna.
grant insert (sexo, obra_social, numero_afiliado) on public.pacientes to authenticated;
grant update (sexo, obra_social, numero_afiliado) on public.pacientes to authenticated;
