// Cálculos de los paneles (cifras, progreso de horas, nivel, insignias, alertas).
// Son funciones puras: reciben listas y devuelven resultados, por eso se pueden probar fácil.

export const DEFAULT_REQUIRED_HOURS = 200;

const asList = (value) => (Array.isArray(value) ? value : []);
const round1 = (number) => Math.round(number * 10) / 10;
const sameText = (a, b) => String(a ?? "").toLowerCase() === String(b).toLowerCase();

export function plural(count, singular, pluralWord) {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

// Cuenta los elementos cuyo campo coincide con un valor (sin importar mayúsculas).
export function countByState(items, field, value) {
  return asList(items).filter((item) => sameText(item?.[field], value)).length;
}

// Cuenta valores distintos (por ejemplo, estudiantes únicos).
export function uniqueCount(items, getter) {
  return new Set(asList(items).map(getter).filter((value) => value !== undefined && value !== null)).size;
}

// Horas hechas, horas requeridas y porcentaje (máximo 100).
export function hoursProgress(practices) {
  const list = asList(practices);
  const done = list.reduce((total, item) => total + (Number(item.horas_acumuladas) || 0), 0);
  const requiredSum = list.reduce((total, item) => total + (Number(item.horas_requeridas) || 0), 0);
  const required = requiredSum || DEFAULT_REQUIRED_HOURS;
  const percent = Math.min(100, Math.round((done / required) * 100));
  return { done: round1(done), required, percent };
}

export const LEVELS = [
  { min: 0, name: "Explorador/a" },
  { min: 25, name: "Aprendiz" },
  { min: 50, name: "Practicante" },
  { min: 75, name: "Experto/a" },
  { min: 100, name: "Maestro/a de práctica" },
];

// Nivel actual según el porcentaje y cuántas horas faltan para el siguiente.
export function levelFor(percent, done, required) {
  const index = LEVELS.reduce((best, level, position) => (percent >= level.min ? position : best), 0);
  const next = LEVELS[index + 1] ?? null;
  const hoursToNext = next ? Math.max(0, Math.ceil((next.min / 100) * required - done)) : 0;
  return { number: index + 1, name: LEVELS[index].name, next: next?.name ?? null, hoursToNext };
}

// Insignias: se desbloquean al cumplir metas.
export function buildBadges({ percent = 0, logbooks = [], documents = [] }) {
  return [
    { id: "bitacora-1", icon: "✍️", title: "Primera bitácora", description: "Registraste tu primera bitácora", unlocked: asList(logbooks).length >= 1 },
    { id: "bitacora-5", icon: "📚", title: "Constante", description: "5 bitácoras registradas", unlocked: asList(logbooks).length >= 5 },
    { id: "aprobada", icon: "✅", title: "Bitácora aprobada", description: "Una bitácora fue aprobada", unlocked: countByState(logbooks, "estado", "Aprobada") >= 1 },
    { id: "documento", icon: "📄", title: "Documentado", description: "Registraste un documento", unlocked: asList(documents).length >= 1 },
    { id: "horas-25", icon: "🌱", title: "25 % de horas", description: "Un cuarto del camino", unlocked: percent >= 25 },
    { id: "horas-50", icon: "🌿", title: "50 % de horas", description: "Mitad de la práctica", unlocked: percent >= 50 },
    { id: "horas-75", icon: "🌳", title: "75 % de horas", description: "Tres cuartos recorridos", unlocked: percent >= 75 },
    { id: "horas-100", icon: "🏆", title: "Práctica completa", description: "Cumpliste todas las horas", unlocked: percent >= 100 },
  ];
}

// Avisos personales del estudiante.
export function studentNotifications(logbooks, documents) {
  const notes = [];
  const corrections = countByState(logbooks, "estado", "Corrección");
  const pending = countByState(logbooks, "estado", "Pendiente");
  const approved = countByState(logbooks, "estado", "Aprobada");
  const docsPending = countByState(documents, "estado", "Pendiente");
  if (corrections) notes.push(`Tienes ${plural(corrections, "bitácora", "bitácoras")} con corrección solicitada.`);
  if (pending) notes.push(`${plural(pending, "bitácora espera", "bitácoras esperan")} revisión de tu tutor.`);
  if (approved) notes.push(`${plural(approved, "bitácora aprobada", "bitácoras aprobadas")}.`);
  if (docsPending) notes.push(`${plural(docsPending, "documento pendiente", "documentos pendientes")} de aprobación.`);
  return notes;
}

// Alertas del sistema para director y tutor.
export function buildAlerts({ logbooks = [], documents = [], practices = [] }) {
  const alerts = [];
  const pendingLogbooks = countByState(logbooks, "estado", "Pendiente");
  const pendingDocuments = countByState(documents, "estado", "Pendiente");
  const arlAlerts = asList(practices).filter((practice) =>
    practice.modalidad === "Presencial" &&
    ["Vencida", "Por vencer"].includes(arlStatus(practice.fecha_vencimiento_arl)),
  ).length;
  if (pendingLogbooks) alerts.push(`${plural(pendingLogbooks, "bitácora pendiente", "bitácoras pendientes")} de revisión.`);
  if (pendingDocuments) alerts.push(`${plural(pendingDocuments, "documento pendiente", "documentos pendientes")} de aprobación.`);
  if (arlAlerts) alerts.push(`${plural(arlAlerts, "práctica", "prácticas")} con ARL vencida o próxima a vencer.`);
  return alerts;
}

// Estado del seguro ARL según su fecha de vencimiento (YYYY-MM-DD).
export function arlStatus(dateText, today = new Date()) {
  if (!dateText) return "Sin registro";
  const due = new Date(`${dateText}T23:59:59`);
  if (Number.isNaN(due.getTime())) return "Sin registro";
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "Vencida";
  if (days <= 30) return "Por vencer";
  return "Vigente";
}

// Fecha legible en español (ej. "10 ago 2026").
export function formatDate(isoText) {
  if (!isoText) return "—";
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
