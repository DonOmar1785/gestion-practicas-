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
