importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

const encodedConfig = new URL(self.location.href).searchParams.get("config");
if (!encodedConfig) throw new Error("Falta la configuración web de Firebase.");

firebase.initializeApp(JSON.parse(encodedConfig));
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  self.registration.showNotification(notification.title || "Gestión de Prácticas", {
    body: notification.body || "Tienes una nueva notificación.",
    data: { url: payload.data?.url || "/" },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(self.clients.openWindow(url));
});
