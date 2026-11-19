import { useCallback, useState } from "react";

// Ejecuta una acción asíncrona (guardar, eliminar...) y controla
// si está en curso y si produjo un error para mostrarlo en pantalla.
export function useAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async (action) => {
    setPending(true);
    setError("");
    try {
      await action();
      return true;
    } catch (caught) {
      setError(caught.message || "La solicitud no pudo completarse.");
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const clearError = useCallback(() => setError(""), []);

  return { run, pending, error, setError, clearError };
}
