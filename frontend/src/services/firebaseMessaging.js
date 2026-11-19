import { getApp, getApps, initializeApp } from "firebase/app";
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { FIREBASE_CONFIG } from "../config/env.js";
import { api } from "./api.js";

const TOKEN_STORAGE_KEY = "gp-fcm-token";

function firebaseApp() {
  if (!FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) {
    throw new Error("Falta configurar Firebase para activar las notificaciones.");
  }
  return getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
}

async function messagingClient() {
  if (!("serviceWorker" in navigator) || !(await isSupported())) {
    throw new Error("Este navegador no admite notificaciones web.");
  }
  return getMessaging(firebaseApp());
}

export async function enablePushNotifications() {
  if (typeof Notification === "undefined") {
    throw new Error("Este navegador no admite notificaciones.");
  }
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) throw new Error("Falta configurar la clave pública VAPID de Firebase.");

  const permission = Notification.permission === "default"
    ? await Notification.requestPermission()
    : Notification.permission;
  if (permission !== "granted") {
    throw new Error("El permiso de notificaciones no fue concedido. La lista interna seguirá disponible.");
  }

  const config = encodeURIComponent(JSON.stringify(FIREBASE_CONFIG));
  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?config=${config}`,
  );
  const messaging = await messagingClient();
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) throw new Error("Firebase no pudo generar el token de este navegador.");

  await api.post("/notifications/tokens", { token });
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  return token;
}

export async function disablePushNotifications() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) return;
  await api.delete("/notifications/tokens", { token });
  if (typeof Notification !== "undefined" && await isSupported()) {
    const messaging = await messagingClient();
    await deleteToken(messaging);
  }
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function listenForForegroundMessages(callback) {
  const messaging = await messagingClient();
  return onMessage(messaging, callback);
}
