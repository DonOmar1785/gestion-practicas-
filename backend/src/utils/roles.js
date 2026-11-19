// Normaliza aliases de roles para decidir permisos en rutas protegidas y servicios.


// El catálogo de aliases evita que nombres con acentos o variantes se interpreten como roles distintos.

const ROLE_ALIASES = new Map([
  ["director", "director"],
  ["director de programa", "director"],
  ["tutor", "tutor"],
  ["tutor academico", "tutor"],
  ["docente tutor", "tutor"],
  ["asesor", "asesor"],
  ["asesor pedagogico", "asesor"],
  ["estudiante", "estudiante"],
]);

export function normalizeRole(role) {
  const normalized = String(role ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  return ROLE_ALIASES.get(normalized) ?? null;
}

export const MANAGER_ROLES = ["director", "tutor"];
