// Opciones de la barra lateral según el rol. Cada par es [texto, ruta].
export const MENU_BY_ROLE = {
  estudiante: [
    ["Panel", "/estudiante"],
    ["Mi práctica", "/mi-practica"],
    ["Bitácoras", "/bitacora"],
    ["Documentos", "/documentos"],
    ["Reportes", "/reportes-estudiante"],
  ],
  docente: [
    ["Panel", "/docente"],
    ["Revisión", "/revision"],
    ["Evaluaciones", "/observaciones"],
    ["Formulario", "/formulario"],
  ],
  asesor: [
    ["Panel", "/asesor"],
    ["Seguimiento", "/seguimiento-estudiantes"],
    ["Horas", "/horas-reportes"],
  ],
  director: [
    ["Panel", "/director"],
    ["Gestión académica", "/gestion-academica"],
    ["Prácticas", "/gestion-practicas"],
    ["Seguimiento", "/seguimiento"],
    ["Formulario", "/formulario"],
    ["Reportes", "/reportes"],
    ["Auditoría", "/auditoria"],
  ],
};

// Arma el menú de un usuario; al estudiante le muestra su semestre en el "Panel".
export function getMenu(role, semester) {
  const entries = MENU_BY_ROLE[role] ?? [];
  if (role !== "estudiante" || !semester) return entries;
  return entries.map(([label, path], index) =>
    index === 0 ? [`Panel · Semestre ${semester}`, path] : [label, path],
  );
}
