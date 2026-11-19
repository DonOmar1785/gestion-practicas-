import { db, nextId } from "./db.js";
import { getCurrentAccount } from "../services/mockAuth.js";

// Servidor simulado: responde como lo haría la API real (ver docs/API_CONTRACT.md).

const LATENCY_MS = 120;
const MANAGERS = ["director", "tutor"];
const CATALOGS = {
  programs: "id_programa",
  cycles: "id_ciclo",
  institutions: "id_institucion",
};

function fail(message) {
  throw new Error(message);
}

function currentUser() {
  const account = getCurrentAccount();
  const user = account && db.users.find((item) => item.id_usuario === account.userId);
  if (!user) fail("Tu sesión expiró. Inicia sesión de nuevo.");
  return user;
}

function requireRole(user, roles) {
  if (!roles.includes(user.rol)) fail("No tienes permisos para realizar esta acción.");
}

function writeAudit(entidad, accion) {
  db.audit.unshift({
    id_auditoria: nextId(db.audit, "id_auditoria"),
    entidad,
    accion,
    creado_en: new Date().toISOString(),
  });
}

function findOrFail(list, idField, id, label) {
  const record = list.find((item) => Number(item[idField]) === Number(id));
  if (!record) fail(`${label} no encontrado.`);
  return record;
}

function hasPractices(field, id) {
  return db.practices.some((practice) => Number(practice[field]) === Number(id));
}

// Prácticas individuales que puede ver cada rol.
function visiblePractices(user) {
  if (user.rol === "estudiante") return db.practices.filter((item) => item.id_estudiante === user.id_usuario);
  if (user.rol === "tutor") return db.practices.filter((item) => item.id_tutor === user.id_usuario);
  if (user.rol === "asesor") return db.practices.filter((item) => item.id_asesor === user.id_usuario);
  return db.practices;
}

// Igual que el backend: la práctica incluye los datos legibles de estudiante y responsables.
function withPractice(practice) {
  const person = (userId, key) => {
    const found = db.users.find((item) => item.id_usuario === userId);
    return found
      ? { [key]: userId, id_programa: found.id_programa, semestre: found.semestre, usuario: { id_usuario: found.id_usuario, nombre_completo: found.nombre_completo, cedula: found.cedula, correo: found.correo } }
      : null;
  };
  return {
    ...practice,
    institucion: db.institutions.find((item) => item.id_institucion === practice.id_institucion) ?? null,
    estudiante: person(practice.id_estudiante, "id_estudiante"),
    tutor: person(practice.id_tutor, "id_tutor"),
    asesor: person(practice.id_asesor, "id_asesor"),
  };
}

function visiblePracticeIds(user) {
  return new Set(visiblePractices(user).map((item) => item.id_practica));
}

function toMinutes(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
}

function requireText(value, label, min = 1) {
  if (typeof value !== "string" || value.trim().length < min) fail(`${label} es obligatorio.`);
  return value.trim();
}

function buildQuestions(preguntas = []) {
  let id = nextId(db.sessions.flatMap((session) => session.pregunta_bitacora), "id_pregunta");
  return preguntas.map((question, index) => ({
    id_pregunta: question.id_pregunta ?? id++,
    texto: requireText(question.texto, "El texto de la pregunta"),
    tipo: question.tipo || "texto",
    obligatoria: question.obligatoria === true,
    opciones: question.opciones || [],
    orden: question.orden ?? index + 1,
    activa: question.activa !== false,
  }));
}

const ROUTES = {
  "GET me": ({ user }) => ({
    id: user.id_usuario,
    name: user.nombre_completo,
    role: user.rol,
    email: user.correo,
    semester: user.semestre,
  }),

  "GET users": ({ user }) => {
    requireRole(user, MANAGERS);
    return db.users;
  },
  "POST users": ({ user, body }) => {
    requireRole(user, MANAGERS);
    const nombre = requireText(body.nombreCompleto, "El nombre", 3);
    const correo = requireText(body.correo, "El correo").toLowerCase();
    if (String(body.password ?? "").length < 8) fail("La contraseña debe tener al menos 8 caracteres.");
    if (!["estudiante", "tutor", "asesor"].includes(body.rol)) fail("El rol no es válido.");
    if (db.users.some((item) => item.correo === correo)) fail("Ya existe un usuario con ese correo.");
    if (body.rol === "estudiante" && (!body.idPrograma || !body.semestre || !/^\d{6,20}$/.test(String(body.cedula || "")))) {
      fail("El estudiante necesita cédula, programa y semestre.");
    }
    const created = {
      id_usuario: nextId(db.users, "id_usuario"),
      nombre_completo: nombre,
      cedula: body.rol === "estudiante" ? body.cedula : null,
      correo,
      rol: body.rol,
      estado: "Activo",
      semestre: body.rol === "estudiante" ? Number(body.semestre) : null,
      id_programa: body.rol === "estudiante" ? Number(body.idPrograma) : null,
    };
    db.users.push(created);
    db.accounts.push({ email: correo, password: body.password, userId: created.id_usuario });
    writeAudit("usuario", "Creación de usuario");
    return created;
  },
  "PUT users/:id": ({ user, id, body }) => {
    requireRole(user, MANAGERS);
    const record = findOrFail(db.users, "id_usuario", id, "Usuario");
    for (const field of ["nombre_completo", "correo", "semestre"]) {
      if (field in body) record[field] = body[field];
    }
    writeAudit("usuario", "Actualización de usuario");
    return record;
  },
  "DELETE users/:id": ({ user, id }) => {
    requireRole(user, ["director"]);
    const record = findOrFail(db.users, "id_usuario", id, "Usuario");
    if (hasPractices("id_estudiante", id) || hasPractices("id_tutor", id) || hasPractices("id_asesor", id)) {
      fail("No se puede eliminar: el usuario tiene prácticas relacionadas.");
    }
    db.users = db.users.filter((item) => item !== record);
    db.accounts = db.accounts.filter((item) => item.userId !== record.id_usuario);
    writeAudit("usuario", "Eliminación de usuario");
    return null;
  },

  "GET practices": ({ user }) => visiblePractices(user).map(withPractice),
  "POST practices/batch": ({ user, body }) => {
    requireRole(user, MANAGERS);
    const cycle = findOrFail(db.cycles, "id_ciclo", body.id_ciclo, "Ciclo");
    if (cycle.estado_ciclo !== "Abierto") fail("El ciclo seleccionado no está abierto.");
    if (!Array.isArray(body.estudiantes) || !body.estudiantes.length) fail("Selecciona al menos un estudiante.");
    const firstPracticeId = nextId(db.practices, "id_practica");
    const created = body.estudiantes.map((item, index) => {
      const student = findOrFail(db.users, "id_usuario", item.id_estudiante, "Estudiante");
      if (
        student.rol !== "estudiante" ||
        student.estado !== "Activo" ||
        Number(student.id_programa) !== Number(body.id_programa) ||
        Number(student.semestre) !== Number(body.semestre)
      ) fail("Los estudiantes deben coincidir con el programa y semestre seleccionados.");
      if (db.practices.some((practice) =>
        practice.id_estudiante === student.id_usuario &&
        Number(practice.id_ciclo) === Number(body.id_ciclo) &&
        Number(practice.semestre) === Number(body.semestre),
      )) fail("Uno o más estudiantes ya tienen una práctica en ese ciclo y semestre.");
      const due = item.modalidad === "Presencial" ? item.fecha_vencimiento_arl : null;
      return {
        id_practica: firstPracticeId + index,
        id_estudiante: student.id_usuario,
        id_institucion: Number(item.id_institucion),
        id_tutor: Number(item.id_tutor),
        id_asesor: Number(item.id_asesor),
        id_ciclo: Number(body.id_ciclo),
        semestre: Number(body.semestre),
        tipo_practica: body.tipo_practica,
        fecha_inicio: body.fecha_inicio,
        fecha_fin: body.fecha_fin,
        horas_requeridas: Number(body.horas_requeridas),
        horas_acumuladas: 0,
        estado_horas: "En curso",
        estado_practica: "Activa",
        estado_seg: "En seguimiento",
        modalidad: item.modalidad,
        estado_arl: item.modalidad === "Virtual" ? "No aplica" : due < new Date().toISOString().slice(0, 10) ? "Vencida" : "Vigente",
        fecha_vencimiento_arl: due,
      };
    });
    db.practices.push(...created);
    writeAudit("practica", "Creación de prácticas por lote");
    return created;
  },

  "GET sessions": ({ user }) => {
    if (MANAGERS.includes(user.rol)) return db.sessions;
    const groups = new Set(visiblePractices(user).map((practice) =>
      `${practice.id_ciclo}:${db.users.find((item) => item.id_usuario === practice.id_estudiante)?.id_programa}:${practice.semestre}`,
    ));
    return db.sessions.filter((session) =>
      session.visible !== false &&
      groups.has(`${session.id_ciclo}:${session.id_programa}:${session.semestre}`),
    );
  },
  "POST sessions": ({ user, body }) => {
    requireRole(user, MANAGERS);
    const cycle = findOrFail(db.cycles, "id_ciclo", body.id_ciclo, "Ciclo");
    if (cycle.estado_ciclo !== "Abierto") fail("Selecciona un ciclo abierto.");
    const created = {
      id_sesion: nextId(db.sessions, "id_sesion"),
      nombre: requireText(body.nombre, "El nombre"),
      descripcion: body.descripcion ?? "",
      fecha_inicio: body.fecha_inicio,
      fecha_fin: body.fecha_fin,
      estado: "Abierta",
      visible: true,
      id_programa: body.id_programa ?? null,
      id_ciclo: body.id_ciclo ?? null,
      semestre: Number(body.semestre),
      pregunta_bitacora: buildQuestions(body.preguntas),
    };
    db.sessions.push(created);
    writeAudit("sesion", "Creación de sesión");
    return created;
  },
  "POST sessions/:id/duplicate": ({ user, id, body }) => {
    requireRole(user, MANAGERS);
    const source = findOrFail(db.sessions, "id_sesion", id, "Sesión");
    const cycle = findOrFail(db.cycles, "id_ciclo", body.id_ciclo, "Ciclo");
    if (cycle.estado_ciclo !== "Abierto") fail("Selecciona un ciclo abierto.");
    const created = {
      ...source,
      id_sesion: nextId(db.sessions, "id_sesion"),
      nombre: body.nombre || `${source.nombre} (copia)`,
      fecha_inicio: body.fecha_inicio || source.fecha_inicio,
      fecha_fin: body.fecha_fin || source.fecha_fin,
      id_programa: Number(body.id_programa),
      id_ciclo: Number(body.id_ciclo),
      semestre: Number(body.semestre),
      pregunta_bitacora: buildQuestions(source.pregunta_bitacora.filter((question) => question.activa)),
    };
    db.sessions.push(created);
    writeAudit("sesion", "Duplicación de sesión");
    return created;
  },
  "PATCH sessions/:id/state": ({ user, id, body }) => {
    requireRole(user, MANAGERS);
    const session = findOrFail(db.sessions, "id_sesion", id, "Sesión");
    session.estado = body.estado;
    session.visible = body.visible !== false;
    writeAudit("sesion", "Cambio de estado de sesión");
    return session;
  },
  "PUT sessions/:id/questions": ({ user, id, body }) => {
    requireRole(user, MANAGERS);
    const session = findOrFail(db.sessions, "id_sesion", id, "Sesión");
    session.pregunta_bitacora = buildQuestions(body.preguntas);
    writeAudit("sesion", "Actualización de preguntas");
    return session;
  },

  "GET logbooks": ({ user }) => {
    const ids = visiblePracticeIds(user);
    return db.logbooks.filter((item) => ids.has(item.id_practica));
  },
  "POST logbooks": ({ user, body }) => {
    requireRole(user, ["estudiante"]);
    const practice = visiblePractices(user).find((item) => item.id_practica === Number(body.idPractica));
    if (!practice) fail("La práctica no pertenece al estudiante.");
    const minutes = toMinutes(body.horaSalida) - toMinutes(body.horaIngreso);
    if (!(minutes > 0)) fail("La hora de salida debe ser posterior a la de ingreso.");
    if (body.idSesion) {
      const session = findOrFail(db.sessions, "id_sesion", body.idSesion, "Sesión");
      if (
        session.estado !== "Abierta" ||
        !session.visible ||
        Number(session.id_ciclo) !== Number(practice.id_ciclo) ||
        Number(session.id_programa) !== Number(user.id_programa) ||
        Number(session.semestre) !== Number(practice.semestre)
      ) fail("La sesión no está disponible para esta práctica.");
    }
    if (db.logbooks.some((item) => item.id_practica === practice.id_practica && item.id_sesion === Number(body.idSesion))) {
      fail("Ya existe una bitácora para esta práctica y sesión.");
    }
    const created = {
      id_bitacora: nextId(db.logbooks, "id_bitacora"),
      id_practica: practice.id_practica,
      id_sesion: body.idSesion ?? null,
      fecha: body.fecha,
      horas_realizadas: Math.round((minutes / 60) * 100) / 100,
      actividad: requireText(body.actividad, "La actividad", 10),
      url_evidencias: body.urlEvidencias ?? null,
      estado: "Pendiente",
      retroalimentacion_tutor: null,
      calificacion_asesor: null,
      observacion_asesor: null,
    };
    db.logbooks.push(created);
    writeAudit("bitacora", "Registro de bitácora");
    return created;
  },
  "PATCH logbooks/:id/review": ({ user, id, body }) => {
    requireRole(user, MANAGERS);
    const logbook = findOrFail(db.logbooks, "id_bitacora", id, "Bitácora");
    if (!["Aprobada", "Corrección"].includes(body.estado)) fail("El estado de revisión no es válido.");
    requireText(body.retroalimentacion, "La retroalimentación");
    logbook.estado = body.estado;
    logbook.retroalimentacion_tutor = body.retroalimentacion;
    const practice = db.practices.find((item) => item.id_practica === logbook.id_practica);
    if (practice) {
      practice.horas_acumuladas = db.logbooks
        .filter((item) => item.id_practica === practice.id_practica && item.estado === "Aprobada")
        .reduce((hours, item) => hours + Number(item.horas_realizadas || 0), 0);
      practice.estado_horas = practice.horas_acumuladas >= practice.horas_requeridas ? "Cumplidas" : "En curso";
    }
    writeAudit("bitacora", "Revisión de bitácora");
    return logbook;
  },
  "POST logbooks/:id/evaluations/advisor": ({ user, id, body }) => evaluate(user, id, body, "asesor"),
  "POST logbooks/:id/evaluations/tutor": ({ user, id, body }) => evaluate(user, id, body, "tutor"),

  "GET documents": ({ user }) => {
    const ids = visiblePracticeIds(user);
    return db.documents.filter((item) => ids.has(item.id_practica));
  },
  "POST documents": ({ user, body }) => {
    requireRole(user, ["estudiante", ...MANAGERS]);
    findOrFail(db.practices, "id_practica", body.idPractica, "Práctica");
    const created = {
      id_documento: nextId(db.documents, "id_documento"),
      id_practica: Number(body.idPractica),
      tipo_documento: requireText(body.tipoDocumento, "El tipo de documento"),
      url_archivo: requireText(body.urlArchivo, "El enlace"),
      estado: "Pendiente",
    };
    db.documents.push(created);
    writeAudit("documento", "Registro de documento");
    return created;
  },
  "PATCH documents/:id/state": ({ user, id, body }) => {
    requireRole(user, MANAGERS);
    const document = findOrFail(db.documents, "id_documento", id, "Documento");
    document.estado = body.estado;
    writeAudit("documento", "Cambio de estado de documento");
    return document;
  },

  "GET templates": ({ user }) => {
    requireRole(user, MANAGERS);
    return db.templates;
  },
  "POST templates": ({ user, body }) => {
    requireRole(user, MANAGERS);
    const created = {
      id_plantilla: nextId(db.templates, "id_plantilla"),
      contenido: requireText(body.contenido, "El contenido"),
    };
    db.templates.push(created);
    writeAudit("plantilla", "Creación de plantilla");
    return created;
  },
  "PUT templates/:id": ({ user, id, body }) => {
    requireRole(user, MANAGERS);
    const template = findOrFail(db.templates, "id_plantilla", id, "Plantilla");
    template.contenido = requireText(body.contenido, "El contenido");
    writeAudit("plantilla", "Actualización de plantilla");
    return template;
  },

  "GET reports/summary": ({ user }) => {
    requireRole(user, MANAGERS);
    return {
      estudiantes: db.users.filter((item) => item.rol === "estudiante").length,
      practicas: db.practices.length,
      bitacoras: db.logbooks.length,
      documentos: db.documents.length,
      instituciones: db.institutions.length,
    };
  },
  "GET audit": ({ user }) => {
    requireRole(user, MANAGERS);
    return db.audit;
  },
};

function evaluate(user, id, body, who) {
  requireRole(user, who === "asesor" ? ["asesor", ...MANAGERS] : MANAGERS);
  const logbook = findOrFail(db.logbooks, "id_bitacora", id, "Bitácora");
  const score = Number(body.calificacion);
  if (!(score >= 0 && score <= 5)) fail("La calificación debe estar entre 0 y 5.");
  logbook[`calificacion_${who}`] = score;
  logbook[`observacion_${who}`] = requireText(body.observacion, "La observación");
  writeAudit("bitacora", `Evaluación del ${who}`);
  return logbook;
}

// Rutas de catálogos: programas, ciclos, instituciones y prácticas.
for (const [resource, idField] of Object.entries(CATALOGS)) {
  ROUTES[`GET ${resource}`] = ({ user }) => {
    requireRole(user, MANAGERS);
    return db[resource];
  };
  ROUTES[`POST ${resource}`] = ({ user, body }) => {
    requireRole(user, MANAGERS);
    if (resource === "programs") requireText(body.nombre_programa, "El nombre del programa", 5);
    if (resource === "institutions") requireText(body.nombre_institucion, "El nombre de la institución");
    if (resource === "cycles") requireText(body.nombre_periodo, "El nombre del ciclo");
    const created = { [idField]: nextId(db[resource], idField), ...body };
    db[resource].push(created);
    writeAudit(resource, "Creación en catálogo");
    return created;
  };
  ROUTES[`PUT ${resource}/:id`] = ({ user, id, body }) => {
    requireRole(user, MANAGERS);
    const record = findOrFail(db[resource], idField, id, "Registro");
    Object.assign(record, body);
    writeAudit(resource, "Actualización en catálogo");
    return record;
  };
}

for (const [resource, idField] of [["institutions", "id_institucion"]]) {
  ROUTES[`DELETE ${resource}/:id`] = ({ user, id }) => {
    requireRole(user, ["director"]);
    const record = findOrFail(db[resource], idField, id, "Registro");
    if (hasPractices("id_institucion", id)) fail("No se puede eliminar: tiene datos relacionados.");
    db[resource] = db[resource].filter((item) => item !== record);
    writeAudit(resource, "Eliminación en catálogo");
    return null;
  };
}

ROUTES["PUT practices/:id"] = ({ user, id, body }) => {
  requireRole(user, MANAGERS);
  const practice = findOrFail(db.practices, "id_practica", id, "Práctica");
  Object.assign(practice, body);
  writeAudit("practica", "Actualización de práctica");
  return practice;
};

ROUTES["DELETE practices/:id"] = ({ user, id }) => {
  requireRole(user, ["director"]);
  const practice = findOrFail(db.practices, "id_practica", id, "Práctica");
  if (
    db.logbooks.some((item) => item.id_practica === practice.id_practica) ||
    db.documents.some((item) => item.id_practica === practice.id_practica)
  ) fail("No se puede eliminar: tiene datos relacionados.");
  db.practices = db.practices.filter((item) => item !== practice);
  writeAudit("practica", "Eliminación de práctica");
  return null;
};

// "users/3" => "users/:id" ; "logbooks/2/evaluations/tutor" => "logbooks/:id/evaluations/tutor"
function routeKey(method, segments) {
  const pattern = segments.map((segment, index) => (index > 0 && /^\d+$/.test(segment) ? ":id" : segment));
  return `${method} ${pattern.join("/")}`;
}

export async function mockRequest(resourcePath, options = {}) {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const method = (options.method || "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const segments = resourcePath.split("/").filter(Boolean);
  const handler = ROUTES[routeKey(method, segments)];
  if (!handler) fail("Ruta de API no encontrada.");

  const id = segments.find((segment, index) => index > 0 && /^\d+$/.test(segment));
  const result = handler({ user: currentUser(), id, body });
  return result === undefined || result === null ? null : structuredClone(result);
}
