# Gestión de Prácticas

Aplicación web con frontend estático, API en Node/Express, Firebase Authentication y
Supabase/PostgreSQL. El backend está organizado en rutas, controladores, servicios,
middleware y configuración. No se debe conectar el navegador directamente con la
clave `service_role` de Supabase.

## Preparar el entorno

Se requiere Node.js 22 o superior.

1. Ejecuta `backend/database/schema.sql`. Crea las tablas que falten y activa RLS
   para que las tablas no queden expuestas directamente desde el navegador:
   `usuario`, `director`, `estudiante`,
   `tutor`, `asesor`, `programa_academico`, `ciclo_practica`, `practica`,
   `institucion`, `asignacion_estudiante`, `bitacora`, `documento`,
   `plantilla_tutor`, `evaluacion_asesor` y `evaluacion_tutor`. También concede
   permisos de base de datos a `service_role`, que solo usa el backend.
2. Ejecuta `backend/database/migrations/001_logbook_sessions.sql` en el SQL Editor
   de Supabase. Añade sesiones de bitácora, preguntas configurables, respuestas,
   modalidad, semestre de práctica, tipo de práctica y horarios de ingreso/salida, y concede
   a `service_role` acceso a las tablas y secuencias nuevas.
3. Ejecuta `backend/database/migrations/002_student_semester.sql` para añadir el
   semestre (1–8) al perfil del estudiante. Asigna el semestre actual a cada
   estudiante existente desde la gestión académica.
4. En Firebase habilita el proveedor de autenticación **Correo/contraseña** y
   activa la verificación de correo y agrega el dominio de producción a los
   dominios autorizados. El usuario debe abrir el enlace de verificación antes
   de poder acceder a la API.
5. Crea una clave de cuenta de servicio para Firebase Admin. Guarda ese archivo
   fuera del proyecto; no lo subas al repositorio.
6. Copia `.env.example` a `.env` y completa la URL del proyecto Supabase,
   `SUPABASE_SERVICE_ROLE_KEY`, el ID del proyecto Firebase, la configuración web
   pública de Firebase y la ruta local de la cuenta de servicio. La contraseña
   PostgreSQL no sustituye la URL ni la `service_role` key de Supabase.
7. Crea la primera cuenta de Firebase Auth en la consola. Con su UID de Firebase,
   crea su fila en `usuario` con rol `director` y la fila correspondiente en
   `director`; por ejemplo, sustituyendo los tres valores:

   ```sql
   with nuevo_usuario as (
     insert into public.usuario (uid_firebase, nombre_completo, rol, correo)
     values ('<UID_FIREBASE>', '<NOMBRE>', 'Director', '<CORREO>')
     returning id_usuario
   )
   insert into public.director (id_director)
   select id_usuario from nuevo_usuario;
   ```

   Desde esa cuenta ya se pueden crear los demás usuarios usando la API.
8. Instala e inicia:

   ```powershell
   npm.cmd install
   npm.cmd start
   ```

   Abre `http://localhost:3000`. Para desarrollo con reinicio automático usa
   `npm.cmd run dev`.

La configuración web de Firebase se sirve desde `GET /api/config/firebase`; son
valores públicos para el SDK del navegador. Las credenciales administrativas y la
clave de servicio de Supabase solo se leen en el backend desde variables de entorno.

## Roles y límites de acceso

- **Director** y **tutor académico** pueden gestionar catálogos, usuarios,
  asignaciones y sesiones de bitácora. El director puede evaluar como administrador.
- **Estudiante** consulta sus asignaciones/sesiones y registra bitácoras y enlaces
  a documentos únicamente para asignaciones propias.
- **Asesor pedagógico** ve las asignaciones asociadas a su usuario y solo puede
  registrar observación y calificación de esas bitácoras.
- Firebase verifica la identidad; el perfil activo y el rol se resuelven en
  `usuario` mediante `uid_firebase`. Los permisos de API se comprueban nuevamente
  en el servidor y no dependen de la ruta visible en el navegador.

## API inicial

Las rutas protegidas reciben un encabezado `Authorization` con el esquema
`Bearer` y el Firebase ID token.
Firebase Auth autentica la cuenta y la API exige además que el correo esté
verificado; los correos no existentes o sin acceso al buzón no pueden completar
la verificación ni entrar al sistema. Los estudiantes tienen un semestre (1–8)
en su perfil de Supabase; el panel muestra la etapa de práctica descrita para
ese semestre y las bitácoras siguen usando las preguntas configuradas por el
Director o tutor académico.

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/health` | Público; comprueba Supabase |
| GET | `/api/config/firebase` | Público; configuración web |
| GET | `/api/me` | Cualquier cuenta activa |
| GET, POST, PUT | `/api/users` | Director, tutor; PUT modifica nombre/correo en Firebase y Supabase |
| DELETE | `/api/users/:id` | Solo Director; definitivo, bloqueado si existen datos relacionados |
| GET, POST, PUT | `/api/programs`, `/api/cycles`, `/api/institutions`, `/api/practices` | Director, tutor |
| DELETE | `/api/institutions/:id`, `/api/practices/:id` | Solo Director; bloqueado si existen datos relacionados |
| GET, POST | `/api/assignments` | GET según rol; POST director/tutor |
| GET, POST | `/api/sessions` | GET según rol; POST director/tutor |
| PATCH | `/api/sessions/:id/state` | Director, tutor |
| PUT | `/api/sessions/:id/questions` | Director, tutor |
| POST | `/api/sessions/:id/questions/import` | Director, tutor; DOCX hasta 2 MiB |
| GET, POST | `/api/logbooks` | GET según rol; POST estudiante |
| POST | `/api/logbooks/:id/evaluations/advisor` | Asesor, director, tutor |
| POST | `/api/logbooks/:id/evaluations/tutor` | Director, tutor |
| PATCH | `/api/logbooks/:id/review` | Director, tutor |
| GET, POST | `/api/documents` | GET según rol; POST estudiante, director o tutor |
| PATCH | `/api/documents/:id/state` | Director, tutor asignado |
| GET, POST, PUT | `/api/templates` | Director, tutor académico |
| GET | `/api/reports/summary` | Director, tutor |
| GET | `/api/audit` | Director, tutor |
| GET | `/api/events` | Cualquier cuenta activa; flujo autenticado de cambios en vivo |

`/api/events` emite una notificación sin datos personales después de cada cambio
correcto realizado por la API. El navegador debe volver a consultar las rutas
autorizadas para refrescar la pantalla. No se expone la llave administrativa de
Supabase al cliente.

Para importar preguntas, cada párrafo no vacío del `.docx` se convierte en una
pregunta de texto obligatoria y se devuelve como vista previa. El cliente confirma
o edita esa lista con `PUT /api/sessions/:id/questions`; la importación no borra
preguntas existentes automáticamente.

## Estructura

```text
frontend/public/       HTML, CSS y JavaScript del navegador
backend/src/config/    Firebase Admin y Supabase
backend/src/models/    Mapeo del esquema relacional y roles
backend/src/routes/    Rutas HTTP
backend/src/controllers/
backend/src/services/  Reglas de negocio y persistencia
backend/src/middleware/
backend/database/migrations/
backend/test/
```

Todas las páginas autenticadas consultan la API del backend en lugar de cargar
datos precargados en `localStorage`. Los flujos disponibles de creación de
usuarios, programas, instituciones, ciclos, prácticas, asignaciones, bitácoras,
documentos, sesiones y evaluaciones guardan cambios mediante la API. Las
pantallas autenticadas reciben eventos en vivo y vuelven a cargar los datos.
Los eventos cubren escrituras realizadas por la API; los cambios ejecutados
directamente en el SQL Editor de Supabase no publican eventos.
