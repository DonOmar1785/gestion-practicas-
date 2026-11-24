// Opciones de la barra lateral según el rol. Cada par es [texto, ruta].
export const MENU_BY_ROLE = {
  estudiante: [
    ["Inicio", "/estudiante"],
    ["Mi práctica", "/mi-practica"],
    ["Bitácoras", "/bitacora"],
    ["Documentos", "/documentos"],
    ["Mis horas", "/reportes-estudiante"],
  ],
  docente: [
    ["Inicio", "/docente"],
    ["Revisar entregas", "/revision"],
    ["Evaluaciones", "/observaciones"],
    ["Formularios", "/formulario"],
  ],
  asesor: [
    ["Inicio", "/asesor"],
    ["Seguimiento", "/seguimiento-estudiantes"],
    ["Horas", "/horas-reportes"],
  ],
  director: [
    ["Inicio", "/director"],
    ["Directorio", "/gestion-academica"],
    ["Asignar prácticas", "/gestion-practicas"],
    ["Seguimiento", "/seguimiento"],
    ["Formularios", "/formulario"],
    ["Reportes", "/reportes"],
    ["Auditoría", "/auditoria"],
  ],
};

// Arma el menú de un usuario; al estudiante le muestra su semestre en el "Inicio".
export function getMenu(role, semester) {
  const entries = MENU_BY_ROLE[role] ?? [];
  if (role !== "estudiante" || !semester) return entries;
  return entries.map(([label, path], index) =>
    index === 0 ? [`Inicio · Semestre ${semester}`, path] : [label, path],
  );
}
