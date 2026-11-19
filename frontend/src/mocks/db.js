// Datos de prueba para el modo demostración (VITE_USE_MOCK=true).
// Viven en memoria: se reinician al recargar la página.

export const DEMO_PASSWORD = "demo1234";

const seed = {
  accounts: [
    { email: "director@demo.com", password: DEMO_PASSWORD, userId: 1 },
    { email: "tutor@demo.com", password: DEMO_PASSWORD, userId: 2 },
    { email: "asesor@demo.com", password: DEMO_PASSWORD, userId: 3 },
    { email: "estudiante@demo.com", password: DEMO_PASSWORD, userId: 4 },
    { email: "estudiante5@demo.com", password: DEMO_PASSWORD, userId: 5 },
  ],
  users: [
    { id_usuario: 1, nombre_completo: "Laura Gómez", correo: "director@demo.com", rol: "director", estado: "Activo", semestre: null, id_programa: null },
    { id_usuario: 2, nombre_completo: "Carlos Ramírez", correo: "tutor@demo.com", rol: "tutor", estado: "Activo", semestre: null, id_programa: null },
    { id_usuario: 3, nombre_completo: "Marta Ortiz", correo: "asesor@demo.com", rol: "asesor", estado: "Activo", semestre: null, id_programa: null },
    { id_usuario: 4, nombre_completo: "Jorge Monsalve", cedula: "1098765432", correo: "estudiante@demo.com", rol: "estudiante", estado: "Activo", semestre: 3, id_programa: 1 },
    { id_usuario: 5, nombre_completo: "Valentina Rojas", cedula: "1023456789", correo: "estudiante5@demo.com", rol: "estudiante", estado: "Activo", semestre: 5, id_programa: 1 },
  ],
  programs: [
    { id_programa: 1, nombre_programa: "Licenciatura en Pedagogía Infantil", facultad: "Facultad de Educación" },
    { id_programa: 2, nombre_programa: "Licenciatura en Educación Física", facultad: "Facultad de Educación" },
  ],
  institutions: [
    { id_institucion: 1, nombre_institucion: "Jardín Infantil Los Pinos", ciudad: "Bucaramanga", direccion: "Cra 27 # 45-10", telefono: "6071234567", estado_institucion: "Activo" },
    { id_institucion: 2, nombre_institucion: "Colegio San José", ciudad: "Floridablanca", direccion: "Calle 5 # 12-30", telefono: "6077654321", estado_institucion: "Activo" },
  ],
  cycles: [
    { id_ciclo: 1, nombre_periodo: "2026-2", estado_ciclo: "Abierto" },
    { id_ciclo: 2, nombre_periodo: "2026-1", estado_ciclo: "Cerrado" },
  ],
  practices: [
    { id_practica: 1, id_estudiante: 4, id_institucion: 1, id_tutor: 2, id_asesor: 3, id_ciclo: 1, semestre: 3, tipo_practica: "Pedagógica", fecha_inicio: "2026-08-03", fecha_fin: "2026-11-27", horas_requeridas: 200, horas_acumuladas: 8, estado_horas: "En curso", estado_practica: "Activa", estado_seg: "En seguimiento", modalidad: "Presencial", estado_arl: "Vigente", fecha_vencimiento_arl: "2027-03-30" },
    { id_practica: 2, id_estudiante: 5, id_institucion: 2, id_tutor: 2, id_asesor: 3, id_ciclo: 1, semestre: 5, tipo_practica: "Pedagógica investigativa", fecha_inicio: "2026-08-03", fecha_fin: "2026-11-27", horas_requeridas: 200, horas_acumuladas: 0, estado_horas: "En curso", estado_practica: "Activa", estado_seg: "En seguimiento", modalidad: "Virtual", estado_arl: "No aplica", fecha_vencimiento_arl: null },
  ],
  sessions: [
    {
      id_sesion: 1,
      nombre: "Observación del ambiente pedagógico",
      descripcion: "Registro de observaciones del aula y sus materiales.",
      fecha_inicio: "2026-08-03",
      fecha_fin: "2026-11-27",
      estado: "Abierta",
      visible: true,
      id_programa: 1,
      id_ciclo: 1,
      semestre: 3,
      pregunta_bitacora: [
        { id_pregunta: 1, texto: "¿Cómo está organizado el espacio del aula?", tipo: "texto", obligatoria: true, opciones: [], orden: 1, activa: true },
        { id_pregunta: 2, texto: "Número de niños presentes", tipo: "numero", obligatoria: false, opciones: [], orden: 2, activa: true },
        { id_pregunta: 3, texto: "Nivel de participación", tipo: "opcion", obligatoria: true, opciones: ["Alto", "Medio", "Bajo"], orden: 3, activa: true },
      ],
    },
  ],
  logbooks: [
    { id_bitacora: 1, id_practica: 1, id_sesion: 1, fecha: "2026-08-10", horas_realizadas: 4, actividad: "Observación de la rutina de entrada y organización del salón.", url_evidencias: null, estado: "Aprobada", retroalimentacion_tutor: "Buen registro, amplía la reflexión.", calificacion_asesor: null, observacion_asesor: null },
    { id_bitacora: 2, id_practica: 1, id_sesion: 1, fecha: "2026-08-17", horas_realizadas: 4, actividad: "Registro de materiales disponibles y uso de los rincones.", url_evidencias: "https://ejemplo.com/evidencias", estado: "Pendiente", retroalimentacion_tutor: null, calificacion_asesor: null, observacion_asesor: null },
  ],
  documents: [
    { id_documento: 1, id_practica: 1, tipo_documento: "Plan de Trabajo", url_archivo: "https://ejemplo.com/plan-de-trabajo.pdf", estado: "Pendiente" },
  ],
  templates: [
    { id_plantilla: 1, contenido: "Excelente trabajo. Recuerda sustentar tus observaciones con referentes pedagógicos." },
  ],
  audit: [
    { id_auditoria: 1, entidad: "usuario", accion: "Creación de usuario", creado_en: "2026-08-01T14:00:00.000Z" },
    { id_auditoria: 2, entidad: "practica", accion: "Creación de práctica", creado_en: "2026-08-02T15:30:00.000Z" },
    { id_auditoria: 3, entidad: "bitacora", accion: "Revisión de bitácora", creado_en: "2026-08-11T09:10:00.000Z" },
  ],
};

// Base de datos en memoria que modifican los manejadores.
export const db = structuredClone(seed);

// Vuelve a los datos originales (se usa en las pruebas).
export function resetMockDb() {
  const fresh = structuredClone(seed);
  for (const key of Object.keys(db)) db[key] = fresh[key];
}

// Siguiente identificador libre de una lista.
export function nextId(list, idField) {
  return list.reduce((max, item) => Math.max(max, Number(item[idField]) || 0), 0) + 1;
}

// Cuentas que se muestran como ayuda en la pantalla de login.
export const DEMO_ACCOUNTS = [
  { label: "Director", email: "director@demo.com" },
  { label: "Tutor", email: "tutor@demo.com" },
  { label: "Asesor", email: "asesor@demo.com" },
  { label: "Estudiante (sem. 3)", email: "estudiante@demo.com" },
  { label: "Estudiante (sem. 5)", email: "estudiante5@demo.com" },
];
