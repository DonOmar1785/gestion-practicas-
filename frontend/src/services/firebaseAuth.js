import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { FIREBASE_CONFIG } from "../config/env.js";
import { FIREBASE_NOT_CONFIGURED } from "./http.js";

let auth = null;

// Crea (una sola vez) la instancia de Firebase Auth con la configuración del .env.
function getAuthInstance() {
  if (!auth) {
    if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) throw new Error(FIREBASE_NOT_CONFIGURED);
    auth = getAuth(initializeApp(FIREBASE_CONFIG));
  }
  return auth;
}

// Avisa cuando cambia la sesión. Devuelve la función para dejar de escuchar.
export function onAuthChange(callback) {
  return onAuthStateChanged(getAuthInstance(), callback);
}

// Inicia sesión. Si el correo no está verificado, envía el enlace y cierra la sesión.
export async function signIn({ email, password, remember }) {
  const firebaseAuth = getAuthInstance();
  await setPersistence(firebaseAuth, remember ? browserLocalPersistence : browserSessionPersistence);
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  if (credential.user.emailVerified) return { verified: true, message: null };

  let message =
    "Debes verificar que tienes acceso a este correo. Te enviamos un enlace de verificación; confírmalo y vuelve a iniciar sesión.";
  try {
    await sendEmailVerification(credential.user);
  } catch (error) {
    console.error("No se pudo enviar el correo de verificación:", error);
    message =
      error.code === "auth/too-many-requests"
        ? "Firebase limitó temporalmente los correos de verificación. Espera unos minutos e inténtalo de nuevo."
        : "No se pudo enviar el correo de verificación. Confirma que la dirección sea correcta o contacta al Director.";
  }
  await signOut(firebaseAuth);
  return { verified: false, message };
}

export async function signOutUser() {
  await signOut(getAuthInstance());
}

export async function requestPasswordReset(email) {
  await sendPasswordResetEmail(getAuthInstance(), email);
}

// Token de identidad que el backend valida en el encabezado Authorization.
export async function getIdToken() {
  const user = getAuthInstance().currentUser;
  if (!user) throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");
  return user.getIdToken();
}
