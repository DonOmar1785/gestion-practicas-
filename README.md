# Gestión de Prácticas

Aplicación React/Vite conectada por REST a una API Node/Express. Firebase
Authentication identifica al usuario, Firebase Cloud Messaging (FCM) entrega
avisos push y Supabase/PostgreSQL conserva los datos académicos. El navegador
nunca recibe `SUPABASE_SERVICE_ROLE_KEY`.

## Modelo de prácticas

`practica` es la práctica de un estudiante y se relaciona directamente con
estudiante, ciclo, institución, tutor y asesor. Bitácoras y documentos apuntan a
la práctica; ya no hay `asignacion_estudiante`. Las sesiones de bitácora se
definen por ciclo, programa y semestre.

El Director selecciona ciclo, programa y semestre, ve estudiantes
activos por nombre y cédula, marca uno o varios y captura una sola vez el tipo,
fechas y horas. Después completa los datos que varían por estudiante. La API
crea todas las prácticas del grupo en una sola petición.

## Supabase

### Instalación nueva

Ejecuta `backend/database/schema.sql` en el SQL Editor de Supabase. Contiene el
esquema final, roles, relaciones, sesiones, preguntas, auditoría, restricciones
RLS y permisos para `service_role`.

### Base existente

No ejecutes `schema.sql` ni el SQL antiguo que crea las tablas desde cero sobre
esta base: `create table if not exists` no agrega columnas a tablas existentes.
Para mantener los datos y convertir `practica` en la entidad central:

1. Haz un respaldo. Aplica `001_logbook_sessions.sql` si aún no está aplicada.
2. Aplica `002_student_semester.sql` si aún no está aplicada. Esta migración
   agrega `estudiante.semestre`; es necesaria antes de la siguiente. Si aparece
   `column "semestre" does not exist` en `003_practice_as_central_entity.sql`,
   verifica que `002` se haya ejecutado correctamente.
3. Antes de ejecutar `003_practice_as_central_entity.sql`, completa los
   estudiantes que no tengan
   cédula, programa o semestre válido (1–12), y completa la fecha real de ARL
   para cada asignación presencial. La migración copia automáticamente fechas
   que ya estén guardadas en `estado_arl` con formato `YYYY-MM-DD`; no inventes
   ni reutilices fechas de ejemplo. Puedes detectar las fechas ARL faltantes con:

   ```sql
   alter table public.asignacion_estudiante
     add column if not exists fecha_vencimiento_arl date;

   select id_asignacion, id_estudiante, modalidad, estado_arl
   from public.asignacion_estudiante
   where modalidad = 'Presencial' and fecha_vencimiento_arl is null;
   ```

   Para cada fila, actualiza `fecha_vencimiento_arl` con la fecha real confirmada
   antes de continuar. En modalidad Virtual, la migración dejará la fecha vacía.
4. Revisa las condiciones iniciales de
   `backend/database/migrations/003_practice_as_central_entity.sql`: cada
   práctica antigua debe tener asignación; las asignaciones deben tener
   estudiante, institución, tutor, asesor, modalidad y fecha ARL válida cuando
   sean presenciales; cada sesión debe tener ciclo, programa y semestre
   identificables. La migración también valida fechas, tipos, horas y que no
   existan dos prácticas del mismo estudiante en un ciclo y semestre.
5. Ejecuta esa migración en el SQL Editor una sola vez. Si detecta una sesión o relación
   ambigua, la transacción se revierte. Completa los datos que faltan y vuelve
   a ejecutarla.

La migración copia una práctica por cada asignación histórica, mueve bitácoras y
documentos a sus nuevas prácticas y después elimina la tabla pivote y las filas
antiguas de práctica. No ejecutes la migración de nuevo tras aplicarla.

## Firebase y FCM

1. Habilita Email/Password en Firebase Authentication y configura verificación
   de correo y dominios autorizados.
2. En Firebase habilita Cloud Messaging y crea la configuración de Web Push
   (clave VAPID). Habilita Firestore en el mismo proyecto.
3. El servidor usa la cuenta de servicio existente con Firebase Admin para
   verificar usuarios, guardar tokens/notificaciones en
   `usuarios/{uid}/dispositivos` y `usuarios/{uid}/notificaciones`, y enviar FCM.
   No expongas credenciales de Admin ni abras acceso público a Firestore.
4. El frontend solicita permiso tras una acción explícita. Si el usuario lo
   rechaza o el navegador no soporta push, los avisos internos siguen disponibles.
   En iPhone, las notificaciones web requieren instalar la página en la pantalla
   de inicio.
5. Ya se notifican bitácoras enviadas/revisadas y documentos revisados. Los
   eventos de reapertura concedida y planilla pendiente quedan por conectar
   cuando existan esos flujos en la API; el push no es el único canal de aviso.

## Variables de entorno

En la raíz, configura Supabase (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`), Firebase Admin (`FIREBASE_PROJECT_ID` y
`FIREBASE_SERVICE_ACCOUNT` o `GOOGLE_APPLICATION_CREDENTIALS`) y el origen
frontend (`FRONTEND_ORIGIN`). Conserva la cuenta de servicio fuera del repositorio.

En `frontend`, copia `.env.example` a `.env`. Para el modo real:

- `VITE_USE_MOCK=false`
- Completa `VITE_FIREBASE_*` con la configuración web pública de Firebase.
- `VITE_FIREBASE_VAPID_KEY` con la clave pública VAPID.
- `VITE_API_URL` con la URL pública del backend; en desarrollo puede quedar vacío
  y usar `VITE_PROXY_TARGET=http://localhost:3000`.

Las claves `VITE_*` se publican en el navegador; nunca pongas ahí la clave Admin
de Firebase ni la `service_role` de Supabase.

## Ejecutar

Requiere Node.js 22 o superior.

```powershell
npm.cmd install
Set-Location .\frontend
npm.cmd install
npm.cmd run dev
```

La interfaz de desarrollo queda en `http://localhost:5173`. Para servirla junto
con la API en producción:

```powershell
Set-Location .\frontend
npm.cmd run build
Set-Location ..
npm.cmd start
```

La API y el build se sirven desde el mismo origen, normalmente
`http://localhost:3000`. El modo demostración usa cuentas `@demo.com` con clave
`demo1234` y no envía notificaciones push.

## Verificación

```powershell
Set-Location .\frontend
npm.cmd run lint
npm.cmd test
npm.cmd run build
Set-Location ..
npm.cmd test
```

## API

El contrato completo está en `frontend/docs/API_CONTRACT.md`. Rutas principales:

- `GET/POST/PUT /api/users`
- `GET /api/practices`, `POST /api/practices/batch`
- `GET/POST /api/sessions`
- `GET/POST /api/logbooks`, revisión y evaluaciones
- `GET/POST /api/documents`, revisión
- `GET /api/notifications`, `POST/DELETE /api/notifications/tokens`
- `/api/reports/summary`, `/api/audit` y `/api/events` (SSE)
