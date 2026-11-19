// Hub local para publicar cambios y notificar a clientes conectados por Server-Sent Events.

export function createRealtimeHub() {
  const listeners = new Set();

  return {
    publish(change) {
      for (const listener of listeners) listener(change);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
