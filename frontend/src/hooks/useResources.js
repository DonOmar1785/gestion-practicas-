import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api.js";
import { useRealtime } from "./useRealtime.js";

// Carga uno o varios recursos de la API y los recarga cuando:
//  - el servidor avisa de cambios (tiempo real), o
//  - se llama a `reload()` después de guardar algo.
export function useResources(resources) {
  const { version } = useRealtime();
  const key = resources.join("|");
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [reloadCount, setReloadCount] = useState(0);

  const reload = useCallback(() => setReloadCount((current) => current + 1), []);

  useEffect(() => {
    let ignore = false;
    const names = key ? key.split("|") : [];

    Promise.all(names.map(async (name) => [name, await api.get(`/${name}`)]))
      .then((entries) => {
        if (!ignore) setState({ data: Object.fromEntries(entries), loading: false, error: "" });
      })
      .catch((error) => {
        if (!ignore) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error.message || "No se pudieron cargar los datos desde Supabase.",
          }));
        }
      });

    // Evita actualizar el estado si el componente ya se desmontó.
    return () => {
      ignore = true;
    };
  }, [key, version, reloadCount]);

  return { ...state, reload };
}
