import { LABELS } from "../config/labels.js";

// Convierte cualquier valor en un texto para mostrar en una celda.
export function display(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map(display).join(", ");
  if (typeof value === "object") {
    const preferred =
      value.nombre_completo || value.usuario?.nombre_completo || value.nombre_programa || value.nombre_institucion || value.nombre || value.texto;
    if (preferred) return String(preferred);
    return Object.entries(value)
      .map(([key, item]) => `${LABELS[key] || key}: ${display(item)}`)
      .join(" · ");
  }
  return String(value);
}

// ¿Es un enlace http o https?
export function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

// Nombre de columna legible.
export function labelFor(key) {
  return LABELS[key] || key;
}

// Une todas las columnas (claves) que aparecen en una lista de filas.
export function getColumns(rows) {
  return [
    ...new Set(
      rows.flatMap((row) => (row && typeof row === "object" ? Object.keys(row) : ["valor"])),
    ),
  ];
}

// Convierte un objeto { indicador: total } en filas para una tabla.
export function summaryToRows(summary) {
  return Object.entries(summary || {}).map(([indicador, total]) => ({ indicador, total }));
}

// Convierte texto en número, o null si está vacío.
export function toNumberOrNull(value) {
  return value === "" || value === null || value === undefined ? null : Number(value);
}

// Interpreta un JSON de preguntas y comprueba que sea una lista.
export function parseQuestions(text) {
  if (!text || !text.trim()) return [];
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("El JSON de preguntas no es válido.");
  }
  if (!Array.isArray(parsed)) throw new Error("Las preguntas deben ser una lista JSON.");
  return parsed;
}
