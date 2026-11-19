// Utilidades y constantes de roles de usuario.

// Rol que usa la interfaz => ruta inicial de ese rol.
export const ROLE_HOME = {
  director: "/director",
  docente: "/docente",
  asesor: "/asesor",
  estudiante: "/estudiante",
};

// Título que se muestra arriba de la barra lateral.
export const ROLE_TITLES = {
  director: "Director de Programa",
  docente: "Docente Tutor",
  asesor: "Asesor Pedagógico",
  estudiante: "Estudiante",
};

// Nombres alternativos con los que puede llegar un rol.
const ROLE_ALIASES = {
  "director de programa": "director",
  "tutor academico": "tutor",
  "asesor pedagogico": "asesor",
};

// Quita tildes y pasa a minúsculas: "Asesor Pedagógico" => "asesor pedagogico".
export function normalizeRole(role) {
  return String(role ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Convierte el rol del backend en el rol de la interfaz (tutor => docente).
export function toUiRole(role) {
  const normalized = normalizeRole(role);
  const base = ROLE_ALIASES[normalized] ?? normalized;
  return base === "tutor" ? "docente" : base;
}

// Devuelve la página de inicio para un rol, o null si no tiene una.
export function homeForRole(role) {
  return ROLE_HOME[toUiRole(role)] ?? null;
}
