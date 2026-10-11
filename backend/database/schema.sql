begin;

create table if not exists public.usuario (
  id_usuario serial primary key,
  uid_firebase varchar(128) unique not null,
  nombre_completo varchar(150) not null,
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
  id_programa integer references public.programa_academico(id_programa),
  semestre smallint,
  constraint estudiante_semestre_valido check (semestre is null or semestre between 1 and 8)
);

create table if not exists public.ciclo_practica (
  id_ciclo serial primary key,
  nombre_periodo varchar(20) not null,
  estado_ciclo varchar(20) default 'Abierto',
  id_director integer references public.director(id_director)
);

create table if not exists public.practica (
  id_practica serial primary key,
  fecha_inicio date,
  fecha_fin date,
  horas_requeridas integer not null,
  estado_horas varchar(20),
  estado_practica varchar(20),
  estado_seg varchar(20),
  id_programa integer references public.programa_academico(id_programa),
  id_ciclo integer references public.ciclo_practica(id_ciclo)
);

create table if not exists public.asignacion_estudiante (
  id_asignacion serial primary key,
  horas_acumuladas integer default 0,
  estado_arl varchar(20) default 'Pendiente',
  id_estudiante integer references public.estudiante(id_estudiante),
  id_practica integer references public.practica(id_practica),
  id_institucion integer references public.institucion(id_institucion),
  id_tutor integer references public.tutor(id_tutor),
  id_asesor integer references public.asesor(id_asesor)
);

create table if not exists public.bitacora (
  id_bitacora serial primary key,
  fecha date not null,
  horas_realizadas integer not null,
  actividad text,
  url_evidencias varchar(255),
  estado varchar(20) default 'Borrador',
  id_asignacion integer references public.asignacion_estudiante(id_asignacion)
);

create table if not exists public.documento (
  id_documento serial primary key,
  tipo_documento varchar(50) not null,
  url_archivo varchar(255) not null,
  fecha date,
  estado varchar(20),
  id_asignacion integer references public.asignacion_estudiante(id_asignacion)
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

alter table public.usuario enable row level security;
alter table public.institucion enable row level security;
alter table public.director enable row level security;
alter table public.tutor enable row level security;
alter table public.asesor enable row level security;
alter table public.auditoria enable row level security;
alter table public.programa_academico enable row level security;
alter table public.estudiante enable row level security;
alter table public.ciclo_practica enable row level security;
alter table public.practica enable row level security;
alter table public.asignacion_estudiante enable row level security;
alter table public.bitacora enable row level security;
alter table public.documento enable row level security;
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

commit;
