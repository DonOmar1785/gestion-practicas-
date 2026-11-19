import { db } from "../mocks/db.js";

// Sesión simulada para el modo demostración (sin Firebase).
const STORAGE_KEY = "gp-mock-session";
const listeners = new Set();
let memorySession = null; // respaldo si el navegador no permite guardar datos

function readStored(storage) {
  try {
    return JSON.parse(storage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function readSession() {
  if (typeof window === "undefined") return memorySession;
  return readStored(window.sessionStorage) ?? readStored(window.localStorage) ?? memorySession;
}

function writeSession(session, remember) {
  memorySession = session;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_KEY);
    if (session) (remember ? window.localStorage : window.sessionStorage).setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Sin almacenamiento disponible: se conserva solo en memoria.
  }
}

function notify() {
  const session = readSession();
  for (const callback of listeners) callback(session ? { emailVerified: true, email: session.email } : null);
}

// Cuenta (correo + usuario) de la sesión actual, o null.
export function getCurrentAccount() {
  const session = readSession();
  if (!session) return null;
  return db.accounts.find((account) => account.email === session.email) ?? null;
}

export function onAuthChange(callback) {
  listeners.add(callback);
  queueMicrotask(() => {
    if (!listeners.has(callback)) return;
    const session = readSession();
    callback(session ? { emailVerified: true, email: session.email } : null);
  });
  return () => listeners.delete(callback);
}

export async function signIn({ email, password, remember }) {
  const account = db.accounts.find(
    (item) => item.email === String(email).trim().toLowerCase() && item.password === password,
  );
  if (!account) {
    const error = new Error("Correo o contraseña incorrectos.");
    error.code = "auth/invalid-credential";
    throw error;
  }
  writeSession({ email: account.email }, remember);
  notify();
  return { verified: true, message: null };
}

export async function signOutUser() {
  writeSession(null, false);
  notify();
}

export async function requestPasswordReset() {
  // En modo demostración no se envían correos.
}

export async function getIdToken() {
  if (!readSession()) throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");
  return "mock-token";
}
