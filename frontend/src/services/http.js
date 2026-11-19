export const BACKEND_UNREACHABLE =
  "No se pudo conectar con el servidor de la API. Verifica que esté encendido y que VITE_API_URL sea correcta, o activa el modo demostración con VITE_USE_MOCK=true en el archivo .env.";

export const FIREBASE_NOT_CONFIGURED =
  "Falta configurar Firebase. Copia .env.example como .env y completa las variables VITE_FIREBASE_*, o activa el modo demostración con VITE_USE_MOCK=true.";

// Lee la respuesta como JSON; devuelve null si viene vacía o no es JSON.
export async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
