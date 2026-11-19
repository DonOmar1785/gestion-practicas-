import { useCallback, useEffect, useState } from "react";
import { USE_MOCK } from "../config/env.js";
import { api } from "../services/api.js";
import {
  disablePushNotifications,
  enablePushNotifications,
  listenForForegroundMessages,
} from "../services/firebaseMessaging.js";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  const refresh = useCallback(async () => {
    if (USE_MOCK) return;
    setLoading(true);
    setError("");
    try {
      setNotifications(await api.get("/notifications"));
    } catch (caught) {
      setError(caught.message || "No se pudieron cargar las notificaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (USE_MOCK) return undefined;
    let active = true;
    let unsubscribe;
    listenForForegroundMessages((payload) => {
      if (!active) return;
      setMessage(payload.notification?.body || payload.notification?.title || "Tienes una nueva notificación.");
      void refresh();
    }).then((stop) => {
      if (active) unsubscribe = stop;
      else stop();
    }).catch((caught) => {
      if (active && typeof Notification !== "undefined" && Notification.permission === "granted") {
        setError(caught.message || "No se pudo iniciar la recepción de notificaciones.");
      }
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [refresh]);

  const enable = async () => {
    setError("");
    try {
      await enablePushNotifications();
      setPermission("granted");
      setMessage("Notificaciones activadas en este navegador.");
      await refresh();
    } catch (caught) {
      setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
      setError(caught.message || "No se pudieron activar las notificaciones.");
    }
  };

  const disable = async () => {
    setError("");
    try {
      await disablePushNotifications();
      setMessage("Notificaciones desactivadas en este navegador.");
      setPermission("default");
    } catch (caught) {
      setError(caught.message || "No se pudieron desactivar las notificaciones.");
    }
  };

  return (
    <section className="notification-center" aria-label="Notificaciones">
      <div className="notification-actions">
        <button type="button" className="btn-mini" onClick={refresh} disabled={loading}>
          Avisos {notifications.length ? `(${notifications.length})` : ""}
        </button>
        {!USE_MOCK && permission !== "granted" && (
          <button type="button" className="btn-mini" onClick={enable}>Activar avisos</button>
        )}
        {!USE_MOCK && permission === "granted" && (
          <button type="button" className="btn-mini" onClick={disable}>Desactivar avisos</button>
        )}
      </div>
      {message && <p className="notification-message" role="status">{message}</p>}
      {error && <p className="notification-error" role="alert">{error}</p>}
      {notifications.length > 0 && (
        <ul className="notification-list">
          {notifications.slice(0, 5).map((notification) => (
            <li key={notification.id}>
              <a href={notification.url || "/"}>
                <strong>{notification.title}</strong>
                <span>{notification.body}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {USE_MOCK && <small>La lista de avisos push requiere conectar Firebase.</small>}
    </section>
  );
}
