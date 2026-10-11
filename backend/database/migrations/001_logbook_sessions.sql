begin;

alter table public.practica
  add column if not exists semestre smallint,
  add column if not exists tipo_practica text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'practica_semestre_valido'
      and conrelid = 'public.practica'::regclass
  ) then
    alter table public.practica
      add constraint practica_semestre_valido
      check (semestre is null or semestre between 1 and 12);
  end if;
end;
$$;

alter table public.asignacion_estudiante
  add column if not exists modalidad text
  check (modalidad is null or modalidad in ('Presencial', 'Virtual')),
  alter column horas_acumuladas type numeric(8, 2)
    using horas_acumuladas::numeric(8, 2);

alter table public.bitacora
  alter column horas_realizadas type numeric(6, 2)
    using horas_realizadas::numeric(6, 2),
  add column if not exists id_sesion bigint,
  add column if not exists numero_visita smallint,
  add column if not exists hora_ingreso time,
  add column if not exists hora_salida time,
  add column if not exists reflexion_pedagogica text,
  add column if not exists retroalimentacion_tutor text,
  add column if not exists revisado_por integer references public.usuario(id_usuario);

create table if not exists public.sesion_bitacora (
  id_sesion bigserial primary key,
  nombre varchar(150) not null,
  descripcion text,
  codigo varchar(16) not null unique,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado varchar(20) not null default 'Abierta'
    check (estado in ('Abierta', 'Cerrada')),
  visible boolean not null default true,
  id_creado_por integer not null references public.usuario(id_usuario),
  id_programa integer references public.programa_academico(id_programa),
  id_ciclo integer references public.ciclo_practica(id_ciclo),
  id_practica integer references public.practica(id_practica),
  creado_en timestamptz not null default now(),
  constraint sesion_bitacora_fechas_validas check (fecha_fin >= fecha_inicio)
);

create table if not exists public.pregunta_bitacora (
  id_pregunta bigserial primary key,
  id_sesion bigint not null references public.sesion_bitacora(id_sesion) on delete cascade,
  texto text not null,
  tipo varchar(20) not null check (tipo in ('texto', 'numero', 'opcion')),
  obligatoria boolean not null default false,
  opciones jsonb not null default '[]'::jsonb,
  orden integer not null default 0,
  activa boolean not null default true
);

create table if not exists public.respuesta_bitacora (
  id_respuesta bigserial primary key,
  id_bitacora integer not null references public.bitacora(id_bitacora) on delete cascade,
  id_pregunta bigint not null references public.pregunta_bitacora(id_pregunta),
  valor text not null,
  unique (id_bitacora, id_pregunta)
);

create or replace function public.replace_logbook_questions(
  p_id_sesion bigint,
  p_preguntas jsonb
)
returns setof public.pregunta_bitacora
language plpgsql
as $$
begin
  if jsonb_typeof(p_preguntas) <> 'array' then
    raise exception 'p_preguntas debe ser un arreglo JSON';
  end if;

  if exists (
    select 1
    from public.respuesta_bitacora respuesta
    join public.pregunta_bitacora pregunta
      on pregunta.id_pregunta = respuesta.id_pregunta
    where pregunta.id_sesion = p_id_sesion
  ) then
    update public.pregunta_bitacora
      set activa = false
      where id_sesion = p_id_sesion;
  else
    delete from public.pregunta_bitacora
      where id_sesion = p_id_sesion;
  end if;

  insert into public.pregunta_bitacora (
    id_sesion, texto, tipo, obligatoria, opciones, orden, activa
  )
  select
    p_id_sesion,
    question.value->>'texto',
    question.value->>'tipo',
    coalesce((question.value->>'obligatoria')::boolean, false),
    coalesce(question.value->'opciones', '[]'::jsonb),
    coalesce((question.value->>'orden')::integer, 0),
    coalesce((question.value->>'activa')::boolean, true)
  from jsonb_array_elements(p_preguntas) as question(value);

  return query
  select *
  from public.pregunta_bitacora
  where id_sesion = p_id_sesion
    and activa = true
  order by orden, id_pregunta;
end;
$$;

create or replace function public.review_logbook(
  p_id_bitacora integer,
  p_estado varchar,
  p_retroalimentacion text,
  p_revisado_por integer
)
returns setof public.bitacora
language plpgsql
as $$
declare
  v_id_asignacion integer;
begin
  if p_estado is null
    or p_estado not in ('Aprobada', 'Corrección')
    or p_retroalimentacion is null
    or length(trim(p_retroalimentacion)) = 0 then
    raise exception 'Estado o retroalimentación inválidos';
  end if;

  select id_asignacion
    into v_id_asignacion
    from public.bitacora
    where id_bitacora = p_id_bitacora
    for update;
  if not found then
    raise exception 'Bitácora no encontrada';
  end if;
  if v_id_asignacion is null then
    raise exception 'La bitácora no tiene asignación';
  end if;

  perform 1
    from public.asignacion_estudiante
    where id_asignacion = v_id_asignacion
    for update;

  update public.bitacora
    set estado = p_estado,
        retroalimentacion_tutor = trim(p_retroalimentacion),
        revisado_por = p_revisado_por
    where id_bitacora = p_id_bitacora;

  update public.asignacion_estudiante
    set horas_acumuladas = coalesce((
      select sum(horas_realizadas)
      from public.bitacora
      where id_asignacion = v_id_asignacion
        and estado = 'Aprobada'
    ), 0)
    where id_asignacion = v_id_asignacion;

  return query
    select *
    from public.bitacora
    where id_bitacora = p_id_bitacora;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bitacora_horas_realizadas_no_negativas'
      and conrelid = 'public.bitacora'::regclass
  ) then
    alter table public.bitacora
      add constraint bitacora_horas_realizadas_no_negativas
      check (horas_realizadas >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'bitacora_horas_salida_posterior'
      and conrelid = 'public.bitacora'::regclass
  ) then
    alter table public.bitacora
      add constraint bitacora_horas_salida_posterior
      check (hora_ingreso is null or hora_salida is null or hora_salida > hora_ingreso);
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bitacora_sesion_fk'
      and conrelid = 'public.bitacora'::regclass
  ) then
    alter table public.bitacora
      add constraint bitacora_sesion_fk
      foreign key (id_sesion)
      references public.sesion_bitacora(id_sesion)
      on delete set null;
  end if;
end;
$$;

create index if not exists idx_sesion_bitacora_programa_ciclo
  on public.sesion_bitacora(id_programa, id_ciclo);
create index if not exists idx_bitacora_asignacion_fecha
  on public.bitacora(id_asignacion, fecha desc);
create index if not exists idx_respuesta_bitacora_logbook
  on public.respuesta_bitacora(id_bitacora);

create table if not exists public.evento_auditoria (
  id_evento bigserial primary key,
  id_usuario integer references public.usuario(id_usuario) on delete set null,
  accion varchar(100) not null,
  entidad varchar(100) not null,
  id_entidad text,
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists idx_evento_auditoria_fecha
  on public.evento_auditoria(creado_en desc);

alter table public.sesion_bitacora enable row level security;
alter table public.pregunta_bitacora enable row level security;
alter table public.respuesta_bitacora enable row level security;
alter table public.evento_auditoria enable row level security;

revoke all on function public.replace_logbook_questions(bigint, jsonb)
  from public, anon, authenticated;
revoke all on function public.review_logbook(integer, varchar, text, integer)
  from public, anon, authenticated;
grant execute on function public.replace_logbook_questions(bigint, jsonb)
  to service_role;
grant execute on function public.review_logbook(integer, varchar, text, integer)
  to service_role;

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select, update on sequences to service_role;

commit;
