begin;

alter table public.estudiante
  add column if not exists semestre smallint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'estudiante_semestre_valido'
      and conrelid = 'public.estudiante'::regclass
  ) then
    alter table public.estudiante
      add constraint estudiante_semestre_valido
      check (semestre is null or semestre between 1 and 8);
  end if;
end;
$$;

grant select, insert, update, delete on public.estudiante to service_role;

commit;
