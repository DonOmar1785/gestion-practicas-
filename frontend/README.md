# Gestión de Prácticas – Frontend

Interfaz del sistema de gestión de prácticas académicas hecha con **React + JavaScript (Vite)** y
validada con **ESLint**. Este repositorio contiene **solo la parte visual**: el backend es un proyecto
aparte y se comunica con este por HTTP (ver `docs/API_CONTRACT.md`).

## Inicio rápido (modo demostración, sin backend)

Requisitos: Node.js 22 o superior.

```powershell
npm.cmd install
Copy-Item .env.example .env     # ya viene con VITE_USE_MOCK=true
npm.cmd run dev
```

Abre **http://localhost:5173**. Cuentas de prueba (clave `demo1234`):
`director@demo.com`, `tutor@demo.com`, `asesor@demo.com`, `estudiante@demo.com`, `estudiante5@demo.com`.
En el login hay botones que rellenan los datos. Los datos viven en memoria y se reinician al recargar.

## Conectarlo al backend real

1. En `.env` pon `VITE_USE_MOCK=false`.
2. Completa las variables `VITE_FIREBASE_*` (configuración web de Firebase).
3. Indica dónde está la API:
   - **Desarrollo:** deja `VITE_API_URL` vacío y define `VITE_PROXY_TARGET` (por defecto `http://localhost:3000`). Vite reenvía `/api` allí y evita problemas de CORS.
   - **Producción:** pon `VITE_API_URL=https://tu-api.com`. El backend debe permitir el origen del frontend en CORS (incluyendo `DELETE`).
4. Reinicia `npm run dev` (Vite lee el `.env` solo al arrancar).

| Variable | Para qué sirve |
|---|---|
| `VITE_USE_MOCK` | `true` = datos de prueba sin servidor |
| `VITE_API_URL` | URL del backend (vacío = proxy en desarrollo / mismo dominio) |
| `VITE_API_PREFIX` | Prefijo de rutas, por defecto `api` |
| `VITE_PROXY_TARGET` | Backend al que apunta el proxy de desarrollo |
| `VITE_REALTIME` | `true` activa `GET /events` (actualizaciones en vivo) |
| `VITE_FIREBASE_*` | Configuración web de Firebase |

## Scripts

```powershell
npm.cmd run dev        # servidor de desarrollo
npm.cmd run build      # compilación de producción en dist/
npm.cmd run preview    # probar la compilación
npm.cmd run lint       # ESLint (debe terminar sin errores)
npm.cmd run lint:fix   # corrige lo que ESLint pueda arreglar solo
npm.cmd test           # pruebas con Vitest
```

## Despliegue

`npm run build` genera `dist/`, que se puede publicar en Vercel o Netlify (ya incluyen la
redirección a `index.html` que necesita React Router: `vercel.json` y `public/_redirects`).
Configura allí las mismas variables `VITE_*` del `.env`.

## Estructura

```text
docs/API_CONTRACT.md      contrato de la API para quien construye el backend
src/
  main.jsx                punto de entrada (StrictMode + BrowserRouter)
  App.jsx                 rutas de la aplicación
  config/                 env, páginas, menús, roles, etiquetas, campos editables
  services/               auth (Firebase o simulada), api (fetch con token), http
  mocks/                  base de datos y API simulada del modo demostración
  context/                AuthProvider (sesión) y RealtimeProvider (cambios en vivo)
  hooks/                  useAuth, useResources, useForm, useAction, useRealtime
  utils/                  funciones puras de formato
  components/             Layout, tablas, secciones, rutas protegidas
  components/forms/       un componente por formulario o acción
  pages/                  LoginPage, ResourcePage, PageContent, redirecciones
```

## Conceptos de React que se aplican

- **Componentes y props**, con validación mediante `PropTypes`.
- **Estado** (`useState`) en formularios controlados y **efectos** (`useEffect`) para cargar datos.
- **Contexto** (`useContext`): `AuthContext` y `RealtimeContext`.
- **Hooks personalizados:** `useForm`, `useAction`, `useResources`, `useAuth`.
- **Listas** con `.map()` y `key`; **renderizado condicional** según el rol.
- **React Router:** rutas, `ProtectedRoute` por rol, `Navigate`, `NavLink`.
- **ESLint** con reglas de React, Hooks y React Refresh (`eslint.config.js`).

## Pantallas por rol

| Rol | Rutas |
|---|---|
| Estudiante | `/estudiante`, `/mi-practica`, `/bitacora`, `/documentos`, `/reportes-estudiante` |
| Docente (tutor) | `/docente`, `/revision`, `/observaciones`, `/formulario` |
| Asesor | `/asesor`, `/seguimiento-estudiantes`, `/horas-reportes` |
| Director | `/director`, `/gestion-academica`, `/gestion-practicas`, `/seguimiento`, `/formulario`, `/reportes`, `/auditoria` |

## Paneles (barra de horas, nivel, alertas)

Cada pantalla muestra arriba sus indicadores, calculados con los datos de la API
(`src/components/PageWidgets.jsx` y `src/utils/dashboard.js`):

- **Estudiante:** tarjetas de cifras, notificaciones, **barra de progreso de horas con porcentaje e hitos (25/50/75 %)**, nivel, insignias y accesos rápidos.
- **Director:** alertas del sistema, cifras por rol y accesos rápidos.
- **Docente:** tarjetas de acción, cifras, notificaciones, tareas pendientes y monitoreo de horas y seguro ARL.
- **Asesor, gestión académica, gestión de prácticas, seguimiento, reportes y auditoría:** tarjetas de cifras.

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| "No se pudo conectar con el servidor de la API" | El backend está apagado o `VITE_API_URL`/`VITE_PROXY_TARGET` es incorrecta. Para ver la interfaz sin backend usa `VITE_USE_MOCK=true`. |
| "Falta configurar Firebase" | Completa `VITE_FIREBASE_*` en `.env` o activa el modo demostración. |
| Cambié el `.env` y no pasa nada | Detén `npm run dev` con `Ctrl + C` y vuélvelo a ejecutar. |
| Error de CORS al borrar registros | El backend debe incluir `DELETE` en los métodos permitidos. |
| Te devuelve al login | El correo no está verificado o tu rol no tiene permiso en esa página. |
