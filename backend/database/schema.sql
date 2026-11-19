-- Esquema final solo para una base de datos nueva.
-- Para una base existente, no ejecutar este archivo: aplicar las migraciones
-- en orden para conservar sus datos y transformar asignacion_estudiante.

begin;

create table if not exists public.usuario (
  id_usuario serial primary key,
  uid_firebase varchar(128) unique not null,
  nombre_completo varchar(150) not null,
  cedula varchar(20) unique,
  rol varchar(30) not null,
  correo varchar(100) unique not null,
  estado varchar(20) default 'Activo'
);

create table if not exists public.institucion (
  id_institucion serial primary key,
  nombre_institucion varchar(150) not null,
  ciudad varchar(100),
  direccion varchar(200),
  telefono varchar(20),
  estado_institucion varchar(20) default 'Activo'
);

create table if not exists public.director (
  id_director integer primary key references public.usuario(id_usuario) on delete cascade
);

create table if not exists public.tutor (
  id_tutor integer primary key references public.usuario(id_usuario) on delete cascade
);

create table if not exists public.asesor (
  id_asesor integer primary key references public.usuario(id_usuario) on delete cascade
);

create table if not exists public.auditoria (
  id_auditoria serial primary key,
  nombre_periodo varchar(50),
  estado_ciclo varchar(20),
  id_usuario integer references public.usuario(id_usuario)
);

create table if not exists public.programa_academico (
  id_programa serial primary key,
  nombre_programa varchar(100) not null,
  facultad varchar(100),
  id_director integer references public.director(id_director)
);

create table if not exists public.estudiante (
  id_estudiante integer primary key references public.usuario(id_usuario) on delete cascade,
  id_programa integer not null references public.programa_academico(id_programa),
  semestre smallint not null,
  constraint estudiante_semestre_valido check (semestre between 1 and 12)
);

create table if not exists public.ciclo_practica (
  id_ciclo serial primary key,
  nombre_periodo varchar(20) not null,
  estado_ciclo varchar(20) default 'Abierto',
  id_director integer references public.director(id_director)
);

create table if not exists public.sesion_bitacora (
  id_sesion bigserial primary key,
  nombre varchar(150) not null,
  descripcion text,
  codigo varchar(16) not null unique,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado varchar(20) not null default 'Abierta' check (estado in ('Abierta', 'Cerrada')),
  visible boolean not null default true,
  id_creado_por integer not null references public.usuario(id_usuario),
  id_programa integer not null references public.programa_academico(id_programa),
  id_ciclo integer not null references public.ciclo_practica(id_ciclo),
  semestre smallint not null check (semestre between 1 and 12),
  creado_en timestamptz not null default now(),
  constraint sesion_bitacora_fechas_validas check (fecha_fin >= fecha_inicio)
);

create table if not exists public.practica (
  id_practica serial primary key,
  id_estudiante integer not null references public.estudiante(id_estudiante),
  id_institucion integer not null references public.institucion(id_institucion),
  id_tutor integer not null references public.tutor(id_tutor),
  id_asesor integer not null references public.asesor(id_asesor),
  id_ciclo integer not null references public.ciclo_practica(id_ciclo),
  semestre smallint not null check (semestre between 1 and 12),
  tipo_practica varchar(40) not null
    check (tipo_practica in ('Pedagógica', 'Pedagógica investigativa')),
  fecha_inicio date,
  fecha_fin date,
  horas_requeridas numeric(6, 2) not null check (horas_requeridas > 0),
  horas_acumuladas numeric(6, 2) not null default 0 check (horas_acumuladas >= 0),
  estado_horas varchar(20) not null default 'En curso'
    check (estado_horas in ('En curso', 'Cumplidas')),
  estado_practica varchar(20) not null default 'Activa'
    check (estado_practica in ('Activa', 'Finalizada')),
  estado_seg varchar(20) not null default 'En seguimiento'
    check (estado_seg in ('En seguimiento', 'Cerrado')),
  modalidad varchar(20) not null check (modalidad in ('Presencial', 'Virtual')),
  estado_arl varchar(20) not null
    check (estado_arl in ('Vigente', 'Vencida', 'No aplica')),
  fecha_vencimiento_arl date,
  constraint practica_fechas_validas check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio),
  constraint practica_arl_modalidad check (
    (modalidad = 'Presencial' and fecha_vencimiento_arl is not null and estado_arl in ('Vigente', 'Vencida'))
    or (modalidad = 'Virtual' and fecha_vencimiento_arl is null and estado_arl = 'No aplica')
  ),
  constraint practica_estudiante_ciclo_semestre_unique unique (id_estudiante, id_ciclo, semestre)
);

create table if not exists public.bitacora (
  id_bitacora serial primary key,
  fecha date not null,
  horas_realizadas numeric(6, 2) not null check (horas_realizadas >= 0),
  actividad text,
  url_evidencias varchar(255),
  estado varchar(20) not null default 'Borrador',
  id_practica integer not null references public.practica(id_practica),
  id_sesion bigint references public.sesion_bitacora(id_sesion) on delete set null,
  numero_visita smallint,
  hora_ingreso time,
  hora_salida time,
  reflexion_pedagogica text,
  retroalimentacion_tutor text,
  revisado_por integer references public.usuario(id_usuario),
  constraint bitacora_salida_posterior check (hora_ingreso is null or hora_salida is null or hora_salida > hora_ingreso),
  constraint bitacora_practica_sesion_unique unique (id_practica, id_sesion)
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

create table if not exists public.evento_auditoria (
  id_evento bigserial primary key,
  id_usuario integer references public.usuario(id_usuario) on delete set null,
  accion varchar(100) not null,
  entidad varchar(100) not null,
  id_entidad text,
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create table if not exists public.documento (
  id_documento serial primary key,
  tipo_documento varchar(50) not null,
  url_archivo varchar(255) not null,
  fecha date,
  estado varchar(20),
  id_practica integer not null references public.practica(id_practica)
);

create table if not exists public.plantilla_tutor (
  id_plantilla serial primary key,
  contenido text not null,
  id_tutor integer references public.tutor(id_tutor)
);

create table if not exists public.evaluacion_asesor (
  id_evaluacion_a serial primary key,
  calificacion_cuant numeric(3, 1),
  observacion_cual text,
  fecha date,
  id_bitacora integer unique references public.bitacora(id_bitacora) on delete cascade
);

create table if not exists public.evaluacion_tutor (
  id_evaluacion_t serial primary key,
  calificacion_cuant numeric(3, 1),
  observacion_cual text,
  corte_actividad varchar(50),
  fecha date,
  id_bitacora integer unique references public.bitacora(id_bitacora) on delete cascade
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
    join public.pregunta_bitacora pregunta on pregunta.id_pregunta = respuesta.id_pregunta
    where pregunta.id_sesion = p_id_sesion
  ) then
    update public.pregunta_bitacora set activa = false where id_sesion = p_id_sesion;
  else
    delete from public.pregunta_bitacora where id_sesion = p_id_sesion;
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
  select * from public.pregunta_bitacora
  where id_sesion = p_id_sesion and activa = true
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
  v_id_practica integer;
begin
  if p_estado is null
    or p_estado not in ('Aprobada', 'Corrección')
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

create index if not exists idx_sesion_bitacora_grupo
  on public.sesion_bitacora(id_ciclo, id_programa, semestre);
create index if not exists idx_bitacora_practica_fecha
  on public.bitacora(id_practica, fecha desc);
create index if not exists idx_evento_auditoria_fecha
  on public.evento_auditoria(creado_en desc);

alter table public.usuario enable row level security;
alter table public.institucion enable row level security;
alter table public.director enable row level security;
alter table public.tutor enable row level security;
alter table public.asesor enable row level security;
alter table public.auditoria enable row level security;
alter table public.programa_academico enable row level security;
alter table public.estudiante enable row level security;
alter table public.ciclo_practica enable row level security;
alter table public.sesion_bitacora enable row level security;
alter table public.practica enable row level security;
alter table public.bitacora enable row level security;
alter table public.pregunta_bitacora enable row level security;
alter table public.respuesta_bitacora enable row level security;
alter table public.documento enable row level security;
alter table public.evento_auditoria enable row level security;
alter table public.plantilla_tutor enable row level security;
alter table public.evaluacion_asesor enable row level security;
alter table public.evaluacion_tutor enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select, update on sequences to service_role;
revoke all on function public.replace_logbook_questions(bigint, jsonb)
  from public, anon, authenticated;
revoke all on function public.review_logbook(integer, varchar, text, integer)
  from public, anon, authenticated;
grant execute on function public.replace_logbook_questions(bigint, jsonb)
  to service_role;
grant execute on function public.review_logbook(integer, varchar, text, integer)
  to service_role;

commit;
