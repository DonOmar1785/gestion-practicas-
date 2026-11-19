import { API_PREFIX, API_URL, USE_MOCK } from "../config/env.js";
import { getIdToken } from "./auth.js";
import { BACKEND_UNREACHABLE, readJson } from "./http.js";

// "/api/users/3" o "/users/3" => "users/3"
function toResourcePath(path) {
  return path.replace(/^\/+/, "").replace(/^api\//, "");
}

// Llamada autenticada a la API. Devuelve `data` (o el cuerpo completo).
export async function apiRequest(path, options = {}) {
  const resourcePath = toResourcePath(path);

  if (USE_MOCK) {
    const { mockRequest } = await import("../mocks/handlers.js");
    return mockRequest(resourcePath, options);
  }

  const token = await getIdToken();
  const response = await fetch(`${API_URL}${API_PREFIX}/${resourcePath}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => null);

  if (!response) throw new Error(BACKEND_UNREACHABLE);
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(body?.error || (body ? "La solicitud no pudo completarse." : BACKEND_UNREACHABLE));
  }
  return body?.data ?? body;
}

// Atajos para escribir menos código en los componentes.
export const api = {
  get: (path) => apiRequest(path),
  post: (path, payload) => apiRequest(path, { method: "POST", body: JSON.stringify(payload) }),
  put: (path, payload) => apiRequest(path, { method: "PUT", body: JSON.stringify(payload) }),
  patch: (path, payload) => apiRequest(path, { method: "PATCH", body: JSON.stringify(payload) }),
  delete: (path, payload) => apiRequest(path, {
    method: "DELETE",
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  }),
};
