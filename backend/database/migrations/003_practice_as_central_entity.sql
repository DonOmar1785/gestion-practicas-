-- Migra la asignación estudiante-práctica a una práctica individual por estudiante.
-- Antes de ejecutarla, completa fecha_vencimiento_arl para las asignaciones presenciales.

begin;

alter table public.usuario
  add column if not exists cedula varchar(20);
create unique index if not exists usuario_cedula_unique
  on public.usuario(cedula) where cedula is not null;

alter table public.estudiante
  drop constraint if exists estudiante_semestre_valido;
alter table public.estudiante
  add constraint estudiante_semestre_valido
  check (semestre is null or semestre between 1 and 12);

alter table public.practica
  add column if not exists id_estudiante integer,
  add column if not exists id_institucion integer,
  add column if not exists id_tutor integer,
  add column if not exists id_asesor integer,
  add column if not exists modalidad varchar(20),
  add column if not exists estado_arl varchar(20),
  add column if not exists fecha_vencimiento_arl date,
  add column if not exists horas_acumuladas numeric(6, 2) not null default 0;

alter table public.practica
  alter column horas_requeridas type numeric(6, 2)
    using horas_requeridas::numeric(6, 2);

alter table public.asignacion_estudiante
  add column if not exists fecha_vencimiento_arl date;
update public.asignacion_estudiante
set fecha_vencimiento_arl = estado_arl::date
where fecha_vencimiento_arl is null
  and estado_arl ~ '^\d{4}-\d{2}-\d{2}$';

create temporary table migration_practice_map (
  id_asignacion integer primary key,
  id_practica_anterior integer not null,
  id_practica_nueva integer not null
) on commit drop;

create temporary table migration_old_practices on commit drop as
  select id_practica from public.practica;

do $$
declare
  assignment_row record;
  new_practice_id integer;
begin
  if exists (
    select 1
    from public.asignacion_estudiante a
    where a.id_estudiante is null
      or a.id_practica is null
      or a.id_institucion is null
      or a.id_tutor is null
      or a.id_asesor is null
      or a.modalidad is null
      or a.modalidad not in ('Presencial', 'Virtual')
      or (
        a.modalidad = 'Presencial'
        and a.fecha_vencimiento_arl is null
      )
  ) then
    raise exception 'Hay asignaciones incompletas o sin modalidad/fecha ARL válida. Corrígelas antes de ejecutar esta migración.';
  end if;

  if exists (
    select 1
    from public.practica p
    where not exists (
      select 1 from public.asignacion_estudiante a where a.id_practica = p.id_practica
    )
  ) then
    raise exception 'Hay prácticas sin estudiante asignado. Resuélvelas antes de ejecutar esta migración.';
  end if;

  if exists (
    select 1
    from public.estudiante e
    where e.id_programa is null or e.semestre is null
      or e.semestre not between 1 and 12
  ) then
    raise exception 'Hay estudiantes sin programa o semestre válido. Completa esos datos antes de ejecutar esta migración.';
  end if;

  if exists (
    select 1
    from public.practica p
    where p.horas_requeridas is null
      or p.horas_requeridas <= 0
      or p.horas_requeridas > 9999.99
      or p.id_ciclo is null
      or (p.fecha_inicio is not null and p.fecha_fin is not null and p.fecha_fin < p.fecha_inicio)
      or (p.tipo_practica is not null and p.tipo_practica not in ('Pedagógica', 'Pedagógica investigativa'))
      or (p.estado_practica is not null and p.estado_practica not in ('Activa', 'Finalizada'))
  ) then
    raise exception 'Hay prácticas con tipo u horas no válidos para la nueva estructura. Corrígelas antes de ejecutar esta migración.';
  end if;

  if exists (
    select a.id_estudiante, p.id_ciclo, coalesce(p.semestre, student.semestre)
    from public.asignacion_estudiante a
    join public.practica p on p.id_practica = a.id_practica
    join public.estudiante student on student.id_estudiante = a.id_estudiante
    group by a.id_estudiante, p.id_ciclo, coalesce(p.semestre, student.semestre)
    having count(*) > 1
  ) then
    raise exception 'Un estudiante tiene más de una asignación en el mismo ciclo y semestre. Resuelve los duplicados antes de ejecutar esta migración.';
  end if;

  for assignment_row in
    select
      a.id_asignacion,
      a.id_practica as id_practica_anterior,
      a.id_estudiante,
      a.id_institucion,
      a.id_tutor,
      a.id_asesor,
      a.modalidad,
      a.estado_arl,
      a.fecha_vencimiento_arl,
      a.horas_acumuladas,
      p.id_ciclo,
      coalesce(p.semestre, student.semestre) as semestre,
      coalesce(p.tipo_practica, 'Pedagógica') as tipo_practica,
      p.fecha_inicio,
      p.fecha_fin,
      p.horas_requeridas,
      p.estado_practica,
      p.estado_seg
    from public.asignacion_estudiante a
    join public.practica p on p.id_practica = a.id_practica
    join public.estudiante student on student.id_estudiante = a.id_estudiante
    order by a.id_asignacion
  loop
    insert into public.practica (
      id_estudiante,
      id_institucion,
      id_tutor,
      id_asesor,
      id_ciclo,
      semestre,
      tipo_practica,
      fecha_inicio,
      fecha_fin,
      horas_requeridas,
      horas_acumuladas,
      estado_horas,
      estado_practica,
      estado_seg,
      modalidad,
      estado_arl,
      fecha_vencimiento_arl
    )
    values (
      assignment_row.id_estudiante,
      assignment_row.id_institucion,
      assignment_row.id_tutor,
      assignment_row.id_asesor,
      assignment_row.id_ciclo,
      assignment_row.semestre,
      assignment_row.tipo_practica,
      assignment_row.fecha_inicio,
      assignment_row.fecha_fin,
      assignment_row.horas_requeridas,
      coalesce(assignment_row.horas_acumuladas, 0),
      case
        when coalesce(assignment_row.horas_acumuladas, 0) >= assignment_row.horas_requeridas then 'Cumplidas'
        else 'En curso'
      end,
      coalesce(assignment_row.estado_practica, 'Activa'),
      case when assignment_row.estado_seg = 'Cerrado' then 'Cerrado' else 'En seguimiento' end,
      assignment_row.modalidad,
      case
        when assignment_row.modalidad = 'Virtual' then 'No aplica'
        when assignment_row.fecha_vencimiento_arl < current_date then 'Vencida'
        else 'Vigente'
      end,
      case
        when assignment_row.modalidad = 'Presencial' then assignment_row.fecha_vencimiento_arl
        else null
      end
    )
    returning id_practica into new_practice_id;

    insert into migration_practice_map
      (id_asignacion, id_practica_anterior, id_practica_nueva)
    values
      (assignment_row.id_asignacion, assignment_row.id_practica_anterior, new_practice_id);
  end loop;
end;
$$;

alter table public.estudiante
  alter column id_programa set not null,
  alter column semestre set not null;

alter table public.bitacora
  add column if not exists id_practica integer;
update public.bitacora b
set id_practica = m.id_practica_nueva
from migration_practice_map m
where b.id_asignacion = m.id_asignacion;

alter table public.documento
  add column if not exists id_practica integer;
update public.documento d
set id_practica = m.id_practica_nueva
from migration_practice_map m
where d.id_asignacion = m.id_asignacion;

update public.practica practice
set
  horas_acumuladas = coalesce(hours.total, 0),
  estado_horas = case when coalesce(hours.total, 0) >= practice.horas_requeridas then 'Cumplidas' else 'En curso' end
from (
  select
    practice.id_practica,
    sum(logbook.horas_realizadas) as total
  from public.practica practice
  join migration_practice_map m on m.id_practica_nueva = practice.id_practica
  left join public.bitacora logbook
    on logbook.id_practica = practice.id_practica
    and logbook.estado = 'Aprobada'
  group by practice.id_practica
) hours
where practice.id_practica = hours.id_practica;

alter table public.sesion_bitacora
  add column if not exists semestre smallint;

do $$
begin
  if exists (
    select s.id_sesion
    from public.sesion_bitacora s
    join migration_practice_map m on m.id_practica_anterior = s.id_practica
    join public.practica p on p.id_practica = m.id_practica_nueva
    join public.estudiante e on e.id_estudiante = p.id_estudiante
    group by s.id_sesion, s.id_ciclo, s.id_programa, s.semestre
    having
      (s.id_ciclo is null and count(distinct p.id_ciclo) > 1)
      or (s.id_programa is null and count(distinct e.id_programa) > 1)
      or (s.semestre is null and count(distinct p.semestre) > 1)
      or (s.id_ciclo is not null and bool_or(s.id_ciclo <> p.id_ciclo))
      or (s.id_programa is not null and bool_or(s.id_programa <> e.id_programa))
      or (s.semestre is not null and bool_or(s.semestre <> p.semestre))
  ) then
    raise exception 'Hay sesiones con grupos ambiguos o incompatibles con sus prácticas. Corrígelas antes de ejecutar esta migración.';
  end if;
end;
$$;

update public.sesion_bitacora s
set
  id_ciclo = coalesce(s.id_ciclo, p.id_ciclo),
  id_programa = coalesce(s.id_programa, student.id_programa),
  semestre = coalesce(s.semestre, p.semestre)
from public.practica p
join migration_practice_map m on m.id_practica_anterior = p.id_practica
join public.practica new_practice on new_practice.id_practica = m.id_practica_nueva
join public.estudiante student on student.id_estudiante = new_practice.id_estudiante
where s.id_practica = p.id_practica;

do $$
begin
  if exists (
    select b.id_sesion
    from public.bitacora b
    join public.practica p on p.id_practica = b.id_practica
    join public.estudiante e on e.id_estudiante = p.id_estudiante
    join public.sesion_bitacora s on s.id_sesion = b.id_sesion
    group by b.id_sesion, s.id_ciclo, s.id_programa, s.semestre
    having count(distinct (p.id_ciclo, e.id_programa, p.semestre)) > 1
      or (s.id_ciclo is not null and bool_or(s.id_ciclo <> p.id_ciclo))
      or (s.id_programa is not null and bool_or(s.id_programa <> e.id_programa))
      or (s.semestre is not null and bool_or(s.semestre <> p.semestre))
  ) then
    raise exception 'Hay sesiones utilizadas por prácticas de grupos distintos o incompatibles. Corrígelas antes de ejecutar esta migración.';
  end if;
end;
$$;

update public.sesion_bitacora s
set
  id_ciclo = coalesce(s.id_ciclo, groups.id_ciclo),
  id_programa = coalesce(s.id_programa, groups.id_programa),
  semestre = coalesce(s.semestre, groups.semestre)
from (
  select
    b.id_sesion,
    min(p.id_ciclo) as id_ciclo,
    min(e.id_programa) as id_programa,
    min(p.semestre) as semestre
  from public.bitacora b
  join public.practica p on p.id_practica = b.id_practica
  join public.estudiante e on e.id_estudiante = p.id_estudiante
  where b.id_sesion is not null
  group by b.id_sesion
  having count(distinct (p.id_ciclo, e.id_programa, p.semestre)) = 1
) groups
where s.id_sesion = groups.id_sesion
  and (s.id_ciclo is null or s.id_programa is null or s.semestre is null);

do $$
begin
  if exists (
    select 1 from public.sesion_bitacora
    where id_ciclo is null or id_programa is null or semestre is null
  ) then
    raise exception 'Hay sesiones sin ciclo, programa o semestre inequívocos. Completa esos datos antes de ejecutar esta migración.';
  end if;
  if exists (
    select 1 from public.bitacora where id_practica is null
  ) or exists (
    select 1 from public.documento where id_practica is null
  ) then
    raise exception 'Hay bitácoras o documentos que no se pudieron vincular a una práctica.';
  end if;
end;
$$;

drop index if exists public.idx_bitacora_asignacion_fecha;

alter table public.bitacora
  drop constraint if exists bitacora_id_asignacion_fkey,
  drop column if exists id_asignacion,
  alter column id_practica set not null;

alter table public.bitacora
  add constraint bitacora_practica_fk
  foreign key (id_practica) references public.practica(id_practica);

alter table public.documento
  drop constraint if exists documento_id_asignacion_fkey,
  drop column if exists id_asignacion,
  alter column id_practica set not null;
alter table public.documento
  add constraint documento_practica_fk
  foreign key (id_practica) references public.practica(id_practica);

alter table public.sesion_bitacora
  drop constraint if exists sesion_bitacora_id_practica_fkey,
  drop column if exists id_practica,
  alter column id_ciclo set not null,
  alter column id_programa set not null,
  alter column semestre set not null;
alter table public.sesion_bitacora
  add constraint sesion_semestre_valido check (semestre between 1 and 12);

delete from public.practica old_practice
where exists (
  select 1 from migration_old_practices old
  where old.id_practica = old_practice.id_practica
);

alter table public.practica
  drop constraint if exists practica_id_programa_fkey,
  drop constraint if exists practica_semestre_valido,
  drop column if exists id_programa,
  alter column id_estudiante set not null,
  alter column id_institucion set not null,
  alter column id_tutor set not null,
  alter column id_asesor set not null,
  alter column id_ciclo set not null,
  alter column semestre set not null,
  alter column tipo_practica set not null,
  alter column modalidad set not null,
  alter column estado_arl set not null;

alter table public.practica
  add constraint practica_estudiante_fk foreign key (id_estudiante) references public.estudiante(id_estudiante),
  add constraint practica_institucion_fk foreign key (id_institucion) references public.institucion(id_institucion),
  add constraint practica_tutor_fk foreign key (id_tutor) references public.tutor(id_tutor),
  add constraint practica_asesor_fk foreign key (id_asesor) references public.asesor(id_asesor),
  add constraint practica_estudiante_ciclo_semestre_unique unique (id_estudiante, id_ciclo, semestre),
  add constraint practica_tipo_valido check (tipo_practica in ('Pedagógica', 'Pedagógica investigativa')),
  add constraint practica_estado_horas_valido check (estado_horas in ('En curso', 'Cumplidas')),
  add constraint practica_estado_valido check (estado_practica in ('Activa', 'Finalizada')),
  add constraint practica_estado_seguimiento_valido check (estado_seg in ('En seguimiento', 'Cerrado')),
  add constraint practica_modalidad_valida check (modalidad in ('Presencial', 'Virtual')),
  add constraint practica_arl_valido check (estado_arl in ('Vigente', 'Vencida', 'No aplica')),
  add constraint practica_arl_modalidad check (
    (modalidad = 'Presencial' and fecha_vencimiento_arl is not null and estado_arl in ('Vigente', 'Vencida'))
    or (modalidad = 'Virtual' and fecha_vencimiento_arl is null and estado_arl = 'No aplica')
  );

alter table public.practica
  add constraint practica_fechas_validas check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio),
  add constraint practica_semestre_valido check (semestre between 1 and 12),
  add constraint practica_horas_requeridas_positivas check (horas_requeridas > 0),
  add constraint practica_horas_acumuladas_no_negativas check (horas_acumuladas >= 0);

alter table public.bitacora
  add constraint bitacora_practica_sesion_unique unique (id_practica, id_sesion);

alter table public.sesion_bitacora
  add constraint sesion_ciclo_fk foreign key (id_ciclo) references public.ciclo_practica(id_ciclo),
  add constraint sesion_programa_fk foreign key (id_programa) references public.programa_academico(id_programa);

do $$
begin
  if to_regclass('public.reapertura_bitacora') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'reapertura_bitacora'
        and column_name = 'id_asignacion'
    ) then
    alter table public.reapertura_bitacora add column if not exists id_practica integer;
    execute '
      update public.reapertura_bitacora r
      set id_practica = m.id_practica_nueva
      from migration_practice_map m
      where r.id_asignacion = m.id_asignacion';
    if exists (select 1 from public.reapertura_bitacora where id_practica is null) then
      raise exception 'Hay solicitudes de reapertura sin asignación válida; vincúlalas antes de migrar.';
    end if;
    alter table public.reapertura_bitacora drop column id_asignacion;
    alter table public.reapertura_bitacora
      alter column id_practica set not null;
    alter table public.reapertura_bitacora
      add constraint reapertura_practica_fk
      foreign key (id_practica) references public.practica(id_practica);
  end if;
end;
$$;

drop function if exists public.review_logbook(integer, varchar, text, integer);
create function public.review_logbook(
  p_id_bitacora integer,
  p_estado varchar,
  p_retroalimentacion text,
  p_revisado_por integer
)
returns setof public.bitacora
language plpgsql
as $$
declare
  v_id_practica integer;
begin
  if p_estado not in ('Aprobada', 'Corrección')
    or p_retroalimentacion is null
    or length(trim(p_retroalimentacion)) = 0 then
    raise exception 'Estado o retroalimentación inválidos';
  end if;

  select id_practica into v_id_practica
  from public.bitacora where id_bitacora = p_id_bitacora for update;
  if not found then raise exception 'Bitácora no encontrada'; end if;

  perform 1 from public.practica where id_practica = v_id_practica for update;
  update public.bitacora
  set estado = p_estado,
      retroalimentacion_tutor = trim(p_retroalimentacion),
      revisado_por = p_revisado_por
  where id_bitacora = p_id_bitacora;

  update public.practica
  set horas_acumuladas = coalesce((
        select sum(horas_realizadas)
        from public.bitacora
        where id_practica = v_id_practica and estado = 'Aprobada'
      ), 0),
      estado_horas = case when coalesce((
        select sum(horas_realizadas)
        from public.bitacora
        where id_practica = v_id_practica and estado = 'Aprobada'
      ), 0) >= horas_requeridas then 'Cumplidas' else 'En curso' end
  where id_practica = v_id_practica;

  return query select * from public.bitacora where id_bitacora = p_id_bitacora;
end;
$$;

create or replace function public.close_cycle_sessions()
returns trigger
language plpgsql
as $$
begin
  if new.estado_ciclo = 'Cerrado' and old.estado_ciclo is distinct from new.estado_ciclo then
    update public.sesion_bitacora
    set estado = 'Cerrada', visible = false
    where id_ciclo = new.id_ciclo;
  end if;
  return new;
end;
$$;

drop trigger if exists ciclo_cierra_sesiones on public.ciclo_practica;
create trigger ciclo_cierra_sesiones
after update of estado_ciclo on public.ciclo_practica
for each row execute function public.close_cycle_sessions();

drop table public.asignacion_estudiante;

create index if not exists idx_practica_estudiante on public.practica(id_estudiante);
create index if not exists idx_practica_tutor on public.practica(id_tutor);
create index if not exists idx_practica_asesor on public.practica(id_asesor);
create index if not exists idx_bitacora_practica_fecha on public.bitacora(id_practica, fecha desc);
create index if not exists idx_sesion_bitacora_grupo
  on public.sesion_bitacora(id_ciclo, id_programa, semestre);

alter table public.practica enable row level security;
grant select, insert, update, delete on public.practica to service_role;
grant select, insert, update, delete on public.bitacora, public.documento, public.sesion_bitacora to service_role;
grant usage, select, update on all sequences in schema public to service_role;

revoke all on function public.review_logbook(integer, varchar, text, integer)
  from public, anon, authenticated;
grant execute on function public.review_logbook(integer, varchar, text, integer)
  to service_role;

commit;
