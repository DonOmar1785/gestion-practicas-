import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { RealtimeContext } from "./RealtimeContext.js";
import { useAuth } from "../hooks/useAuth.js";
import { API_PREFIX, API_URL, REALTIME_ENABLED } from "../config/env.js";
import { getIdToken } from "../services/auth.js";

const RECONNECT_DELAY_MS = 2000;

// Interpreta los mensajes de texto del flujo /api/events (Server-Sent Events).
function parseMessage(message) {
  const event = message.match(/^event: (.+)$/m)?.[1];
  const data = message.match(/^data: (.+)$/m)?.[1];
  return { event, data };
}

// Mantiene abierta la conexión de cambios en vivo mientras haya sesión.
export default function RealtimeProvider({ children }) {
  const { status } = useAuth();
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!REALTIME_ENABLED || status !== "authenticated") return undefined;
    const controller = new AbortController();

    async function connect() {
      while (!controller.signal.aborted) {
        try {
          const token = await getIdToken();
          const response = await fetch(`${API_URL}${API_PREFIX}/events`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            throw new Error(`No se pudo abrir la conexión de actualizaciones (${response.status}).`);
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (!controller.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const messages = buffer.split("\n\n");
            buffer = messages.pop() || "";
            for (const message of messages) {
              const { event, data } = parseMessage(message);
              if (event === "data-change" && data) setVersion((current) => current + 1);
            }
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          console.error("Se perdió la conexión de actualizaciones en vivo:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, RECONNECT_DELAY_MS));
      }
    }

    connect();
    return () => controller.abort();
  }, [status]);

  const value = useMemo(() => ({ version }), [version]);
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

RealtimeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
