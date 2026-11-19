// Definición de cada pantalla: título, recursos de la API que necesita y roles permitidos.
export const PAGES = {
  director: {
    title: "Panel de control",
    resources: ["reports/summary", "users", "practices", "audit", "logbooks", "documents"],
    roles: ["director"],
  },
  "gestion-academica": {
    title: "Gestión académica",
    resources: ["users", "programs", "institutions"],
    roles: ["director"],
  },
  "gestion-practicas": {
    title: "Gestión de prácticas",
    resources: ["programs", "cycles", "institutions", "practices", "users"],
    roles: ["director"],
  },
  seguimiento: {
    title: "Seguimiento",
    resources: ["practices", "logbooks", "documents"],
    roles: ["director"],
  },
  reportes: {
    title: "Reportes",
    resources: ["reports/summary", "practices", "logbooks", "documents"],
    roles: ["director"],
  },
  auditoria: {
    title: "Auditoría",
    resources: ["audit"],
    roles: ["director"],
  },
  estudiante: {
    title: "Panel del estudiante",
    resources: ["practices", "logbooks", "documents"],
    roles: ["estudiante"],
  },
  "mi-practica": {
    title: "Mi práctica",
    resources: ["practices"],
    roles: ["estudiante"],
  },
  bitacora: {
    title: "Bitácoras",
    resources: ["sessions", "logbooks", "practices"],
    roles: ["estudiante"],
  },
  documentos: {
    title: "Documentos",
    resources: ["documents", "practices"],
    roles: ["estudiante"],
  },
  "reportes-estudiante": {
    title: "Mis reportes",
    resources: ["logbooks", "documents", "practices"],
    roles: ["estudiante"],
  },
  docente: {
    title: "Panel del tutor",
    resources: ["practices", "logbooks", "documents", "templates"],
    roles: ["docente"],
  },
  revision: {
    title: "Revisión de bitácoras",
    resources: ["logbooks", "practices"],
    roles: ["docente"],
  },
  observaciones: {
    title: "Evaluaciones del tutor",
    resources: ["logbooks"],
    roles: ["docente"],
  },
  asesor: {
    title: "Panel del asesor",
    resources: ["practices", "logbooks"],
    roles: ["asesor"],
  },
  "seguimiento-estudiantes": {
    title: "Seguimiento de estudiantes",
    resources: ["practices", "logbooks"],
    roles: ["asesor"],
  },
  "horas-reportes": {
    title: "Horas y reportes",
    resources: ["practices", "logbooks"],
    roles: ["asesor"],
  },
  formulario: {
    title: "Formularios de bitácora",
    resources: ["sessions", "programs", "cycles", "practices"],
    roles: ["director", "docente"],
  },
};

// Nombre legible de cada recurso de la API.
export const RESOURCE_NAMES = {
  practices: "Prácticas",
  sessions: "Sesiones de bitácora",
  logbooks: "Bitácoras",
  documents: "Documentos",
  templates: "Plantillas",
  programs: "Programas académicos",
  cycles: "Ciclos académicos",
  institutions: "Instituciones",
  users: "Usuarios",
  audit: "Eventos de auditoría",
  "reports/summary": "Resumen desde Supabase",
};
