-- El id sin calificar se resolvía como pacientes.id dentro de la subconsulta.
-- La persona activa solo puede leer el consultorio de su propia ficha vinculada.
drop policy if exists "consultorios: la persona ve el de su ficha" on public.consultorios;

create policy "consultorios: la persona ve el de su ficha"
  on public.consultorios for select to authenticated
  using (
    exists (
      select 1
      from public.pacientes p
      where p.consultorio_id = consultorios.id
        and p.usuario_id = (select auth.uid())
        and p.estado = 'activo'
    )
  );
