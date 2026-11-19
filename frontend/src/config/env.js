// Variables de entorno de Vite (archivo .env). Ver .env.example.
const env = import.meta.env ?? {};

// Modo demostración: datos de prueba en el navegador, sin backend ni Firebase.
export const USE_MOCK = env.VITE_USE_MOCK === "true";

// Dirección del backend (vacío = mismo dominio; en desarrollo Vite usa un proxy).
export const API_URL = String(env.VITE_API_URL ?? "").replace(/\/+$/, "");

// Prefijo de las rutas de la API.
export const API_PREFIX = `/${String(env.VITE_API_PREFIX ?? "api").replace(/^\/+|\/+$/g, "")}`;

// Actualizaciones en vivo (SSE en /events). Solo si el backend lo ofrece.
export const REALTIME_ENABLED = env.VITE_REALTIME === "true" && !USE_MOCK;

// Configuración web de Firebase (Project Settings > General > Tus apps).
export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};
