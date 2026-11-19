# Contrato de la API

El frontend React usa la API REST del backend y nunca se conecta directamente a
Supabase con una clave administrativa.

## Reglas generales

| Tema | Contrato |
|---|---|
| Dirección | `VITE_API_URL` + `VITE_API_PREFIX` (por defecto `/api`) |
| Formato | JSON, excepto la importación de preguntas `.docx` |
| Autenticación | `Authorization: Bearer <Firebase ID token>` |
| Respuesta correcta | `{ "data": ... }` o el objeto/lista directamente |
| Error | `4xx/5xx` con `{ "error": "mensaje en español" }` |
| Roles | `director`, `tutor`, `asesor`, `estudiante`; tutor se muestra como docente |
| Fechas | `YYYY-MM-DD`; horas `HH:MM` |

El backend verifica Firebase Auth, correo confirmado y el rol asociado al perfil
activo. El cliente no decide a qué registros puede acceder cada rol.

## Sesión y usuarios

| Método | Ruta | Acceso | Cuerpo / respuesta |
|---|---|---|---|
| GET | `/me` | Cualquier usuario activo | `{ id, name, role, email, semester }` |
| GET | `/users` | Director, tutor | Lista con `cedula`, nombre, rol, programa y semestre |
| POST | `/users` | Director, tutor | `{ nombreCompleto, cedula?, correo, password, rol, idPrograma?, semestre? }`; estudiantes requieren cédula, programa y semestre (1–12) |
| PUT | `/users/:id` | Director, tutor | Nombre, cédula, correo o semestre |
| DELETE | `/users/:id` | Director | Bloqueado si tiene registros relacionados |

## Prácticas y ciclos

| Método | Ruta | Acceso | Cuerpo / respuesta |
|---|---|---|---|
| GET | `/practices` | Todos; cada rol ve sus prácticas | Prácticas con estudiante, cédula, institución, tutor y asesor |
| POST | `/practices/batch` | Director, tutor | `{ id_ciclo, id_programa, semestre, tipo_practica, fecha_inicio, fecha_fin, horas_requeridas, estudiantes: [{ id_estudiante, id_institucion, id_tutor, id_asesor, modalidad, fecha_vencimiento_arl? }] }` |
| PUT | `/practices/:id` | Director, tutor | Solo permite cambiar fecha fin y estado de práctica/seguimiento |
| DELETE | `/practices/:id` | Director | Bloqueado si hay bitácoras o documentos |
| GET, POST, PUT | `/cycles` | Director, tutor | Catálogo de ciclos |
| GET, POST, PUT | `/programs`, `/institutions` | Director, tutor | Catálogos académicos |
| DELETE | `/institutions/:id` | Director | Bloqueado si hay prácticas relacionadas |

`POST /practices/batch` crea un registro de práctica por estudiante en una sola
operación. El backend comprueba que todos pertenezcan al programa y semestre
seleccionados, que el ciclo esté abierto y que no tengan ya una práctica en el
mismo ciclo/semestre. No existe `/assignments`.

Cada práctica contiene `id_estudiante`, `id_institucion`, `id_tutor`,
`id_asesor`, `id_ciclo`, `semestre`, tipo, fechas, horas requeridas/acumuladas,
estados de práctica/horas/seguimiento, modalidad y datos ARL. El programa se
obtiene desde el perfil del estudiante. Las horas acumuladas se calculan con
bitácoras aprobadas y no se editan desde el cliente.

## Sesiones, bitácoras y documentos

| Método | Ruta | Acceso | Contrato |
|---|---|---|---|
| GET, POST | `/sessions` | Todos / Director y tutor | Crear sesión con `id_ciclo`, `id_programa`, `semestre`, nombre y fechas |
| POST | `/sessions/:id/duplicate` | Director, tutor | Copia sesión y preguntas a un ciclo, programa y semestre abiertos |
| PATCH | `/sessions/:id/state` | Director, tutor | `{ estado: "Abierta"｜"Cerrada", visible: boolean }` |
| PUT | `/sessions/:id/questions` | Director, tutor | Lista de preguntas configurables |
| POST | `/sessions/:id/questions/import` | Director, tutor | `multipart/form-data`, `.docx` |
| GET | `/logbooks` | Todos; cada rol ve lo suyo | Bitácoras relacionadas directamente con `id_practica` |
| POST | `/logbooks` | Estudiante | `{ idPractica, idSesion?, fecha, horaIngreso, horaSalida, numeroVisita?, urlEvidencias?, actividad, reflexionPedagogica?, respuestas: [] }` |
| PATCH | `/logbooks/:id/review` | Director, tutor | `{ estado: "Aprobada"｜"Corrección", retroalimentacion }` |
| POST | `/logbooks/:id/evaluations/advisor` | Asesor y gestores | `{ calificacion (0–5), observacion }` |
| POST | `/logbooks/:id/evaluations/tutor` | Director, tutor | `{ calificacion (0–5), observacion }` |
| GET, POST | `/documents` | Todos / Estudiante y gestores | Crear con `{ idPractica, tipoDocumento, urlArchivo }` |
| PATCH | `/documents/:id/state` | Director, tutor responsable | `{ estado: "Aprobado"｜"Corrección" }` |

Una sesión está dirigida a ciclo + programa + semestre. El backend solo permite
registrar una bitácora cuando coinciden esos tres valores con la práctica del
estudiante; la base garantiza unicidad por práctica y sesión.

## Notificaciones push

| Método | Ruta | Acceso | Contrato |
|---|---|---|---|
| GET | `/notifications` | Usuario activo | Últimos avisos internos guardados en Firestore |
| POST | `/notifications/tokens` | Usuario activo | `{ token }`; registra un navegador/dispositivo |
| DELETE | `/notifications/tokens` | Usuario activo | `{ token }`; elimina ese token |

El navegador solicita permiso solo cuando el usuario pulsa **Activar avisos**.
Firebase Cloud Messaging envía push a cada token del usuario; Firestore conserva
la lista interna como fuente de verdad y respaldo. El push actual se emite cuando
se envía/revisa una bitácora o se aprueba/corrige un documento. La entrega push
requiere configurar la clave pública VAPID en `VITE_FIREBASE_VAPID_KEY`.

## Reportes, auditoría y tiempo real

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/reports/summary` | Director, tutor |
| GET | `/audit` | Director, tutor |
| GET | `/events` | Usuario activo; SSE opcional |

Para ajustes de Supabase en bases existentes, aplicar
`backend/database/migrations/003_practice_as_central_entity.sql` después de las
migraciones anteriores. Revisar primero sus precondiciones y respaldar la base.
La estructura completa para una instalación nueva está en
`backend/database/schema.sql`.
