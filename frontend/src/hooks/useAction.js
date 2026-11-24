import { useCallback, useRef, useState } from "react";

// Ejecuta una acción asíncrona (guardar, eliminar...) y controla
// si está en curso y si produjo un error para mostrarlo en pantalla.
export function useAction() {
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async (action) => {
    if (running.current) return false;
    running.current = true;
    setPending(true);
    setError("");
    try {
      await action();
      return true;
    } catch (caught) {
      setError(caught.message || "La solicitud no pudo completarse.");
      return false;
    } finally {
      running.current = false;
      setPending(false);
    }
  }, []);

  const clearError = useCallback(() => setError(""), []);

  return { run, pending, error, setError, clearError };
}
