import "./firebase-session.js";

const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
})[character]);

const pages = {
  director: { title: "Panel de control", resources: ["reports/summary", "users", "practices", "audit"] },
  "gestion-academica": { title: "Gestión académica", resources: ["users", "programs", "institutions"] },
  estudiante: { title: "Panel del estudiante", resources: ["assignments", "logbooks", "documents"] },
  "mi-practica": { title: "Mi práctica", resources: ["assignments"] },
  bitacora: { title: "Bitácoras", resources: ["sessions", "logbooks", "assignments"] },
  documentos: { title: "Documentos", resources: ["documents", "assignments"] },
  "reportes-estudiante": { title: "Mis reportes", resources: ["logbooks", "documents", "assignments"] },
  docente: { title: "Panel del tutor", resources: ["assignments", "logbooks", "documents", "templates"] },
  revision: { title: "Revisión de bitácoras", resources: ["logbooks", "assignments"] },
  observaciones: { title: "Evaluaciones del tutor", resources: ["logbooks"] },
  asesor: { title: "Panel del asesor", resources: ["assignments", "logbooks"] },
  "seguimiento-estudiantes": { title: "Seguimiento de estudiantes", resources: ["assignments", "logbooks"] },
  "horas-reportes": { title: "Horas y reportes", resources: ["assignments", "logbooks"] },
  "gestion-practicas": { title: "Gestión de prácticas", resources: ["programs", "cycles", "institutions", "practices", "assignments", "users"] },
  formulario: { title: "Formularios de bitácora", resources: ["sessions", "programs", "cycles", "practices"] },
  seguimiento: { title: "Seguimiento", resources: ["assignments", "logbooks", "documents"] },
  reportes: { title: "Reportes", resources: ["reports/summary", "assignments", "logbooks", "documents"] },
  auditoria: { title: "Auditoría", resources: ["audit"] },
};

const semesterGuides = {
  1: {
    title: "Observación del ambiente pedagógico",
    description: "Reconoce cómo el espacio, el mobiliario y los materiales favorecen el aprendizaje y el bienestar de los niños.",
    focus: ["Organización de aulas, muebles y rincones de aprendizaje", "Materiales disponibles y adecuados para los niños", "Condiciones del espacio y oportunidades de mejora"],
  },
  2: {
    title: "Observación de la práctica docente",
    description: "Analiza el quehacer del maestro y sus interacciones en el aula.",
    focus: ["Actividades de aprendizaje y actividades rectoras", "Relación del docente con los niños y las familias", "Materiales y estrategias pedagógicas observadas"],
  },
  3: {
    title: "Investigación en gerencia educativa",
    description: "Comprende la gestión y organización de una institución educativa.",
    focus: ["Procesos de matrícula y gestión institucional", "Funciones de rectoría, coordinación y secretaría", "Registros y recursos para la administración educativa"],
  },
  4: {
    title: "Práctica en espacios no convencionales",
    description: "Planea, desarrolla y reflexiona sobre experiencias pedagógicas fuera del aula escolar convencional.",
    focus: ["Contexto: parques, bibliotecas, hospitales u otros espacios", "Planeación y desarrollo de una clase", "Evidencias y reflexión sobre la experiencia"],
  },
  5: {
    title: "Práctica con primera infancia (0–3 años)",
    description: "Observa y analiza los procesos pedagógicos con niños y niñas de cero a tres años.",
    focus: ["Contexto de jardines infantiles o CDI", "Experiencias y ambientes para primera infancia", "Acompañamiento y referentes institucionales pertinentes"],
  },
  6: {
    title: "Práctica con niños de 3–6 años y anteproyecto",
    description: "Delimita un tema de investigación y consolida el anteproyecto a partir de las experiencias de práctica.",
    focus: ["Experiencias pedagógicas con niños de 3–6 años", "Identificación y delimitación del tema de investigación", "Avance del anteproyecto"],
  },
  7: {
    title: "Implementación del proyecto de investigación",
    description: "Desarrolla en la institución educativa el proyecto de práctica e investigación acordado.",
    focus: ["Implementación del anteproyecto o vinculación a un proyecto docente", "Registro sistemático de las experiencias", "Análisis de avances y evidencias"],
  },
  8: {
    title: "Implementación del proyecto de investigación",
    description: "Continúa la implementación del proyecto de práctica e investigación en la institución educativa.",
    focus: ["Implementación del anteproyecto o vinculación a un proyecto docente", "Registro sistemático de las experiencias", "Análisis de avances y evidencias"],
  },
};

const names = {
  assignments: "Asignaciones de práctica",
  sessions: "Sesiones de bitácora",
  logbooks: "Bitácoras",
  documents: "Documentos",
  templates: "Plantillas",
  programs: "Programas académicos",
  cycles: "Ciclos académicos",
  institutions: "Instituciones",
  practices: "Prácticas",
  users: "Usuarios",
  audit: "Eventos de auditoría",
  "reports/summary": "Resumen desde Supabase",
};

const labels = {
  id_asignacion: "Asignación",
  id_estudiante: "Estudiante",
  id_practica: "Práctica",
  id_institucion: "Institución",
  id_tutor: "Tutor",
  id_asesor: "Asesor",
  horas_acumuladas: "Horas acumuladas",
  estado_arl: "Estado ARL",
  nombre_periodo: "Ciclo",
  fecha_inicio: "Fecha de inicio",
  fecha_fin: "Fecha de fin",
  id_programa: "Programa",
  nombre_programa: "Programa",
  nombre_institucion: "Institución",
  ciudad: "Ciudad",
  direccion: "Dirección",
  telefono: "Teléfono",
  estado_institucion: "Estado de la institución",
  fecha_fin: "Fecha de fin",
  horas_requeridas: "Horas requeridas",
  estado_horas: "Estado de horas",
  estado_practica: "Estado de la práctica",
  estado_seg: "Estado de seguro",
  semestre: "Semestre",
  tipo_practica: "Tipo de práctica",
  facultad: "Facultad",
  nombre_completo: "Nombre",
  correo: "Correo",
  rol: "Rol",
  estado: "Estado",
  fecha: "Fecha",
  horas_realizadas: "Horas",
  actividad: "Actividad",
  url_evidencias: "Evidencias",
  retroalimentacion_tutor: "Retroalimentación",
  tipo_documento: "Tipo de documento",
  url_archivo: "Archivo",
  contenido: "Contenido",
  nombre: "Nombre",
  descripcion: "Descripción",
  creado_en: "Creado",
  entidad: "Entidad",
  accion: "Acción",
};

function display(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map(display).join(", ");
  if (typeof value === "object") {
    const preferred = value.nombre_completo || value.nombre_programa ||
      value.nombre_institucion || value.nombre || value.texto;
    return preferred ? String(preferred) : Object.entries(value)
      .map(([key, item]) => `${labels[key] || key}: ${display(item)}`)
      .join(" · ");
  }
  return String(value);
}

function renderSemesterGuide(main) {
  const semester = Number(currentUser().semestre);
  const guide = semesterGuides[semester];
  const section = addSection(
    main,
    guide ? `Tu ruta del semestre ${semester}: ${guide.title}` : "Tu ruta de práctica",
  );
  if (!guide) {
    section.append(element(
      "p",
      "Tu perfil todavía no tiene un semestre válido asignado. Solicita al Director que actualice tu semestre para mostrar la ruta de práctica correspondiente.",
      "ayuda",
    ));
    return;
  }
  section.append(element("p", guide.description));
  const list = element("ul", undefined, "semester-focus-list");
  for (const item of guide.focus) list.append(element("li", item));
  section.append(list);
  section.append(element(
    "p",
    "Las preguntas y entregas de tus bitácoras son configuradas por el Director o tutor académico según tu práctica.",
    "ayuda",
  ));
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function currentUser() {
  return window.authenticatedUser;
}

function addSection(main, title) {
  const section = element("section", undefined, "table-container");
  section.append(element("h2", title));
  main.append(section);
  return section;
}

function renderTable(section, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    section.append(element("p", "No hay registros en Supabase.", "ayuda"));
    return;
  }
  const keys = [...new Set(rows.flatMap((row) =>
    row && typeof row === "object" ? Object.keys(row) : ["valor"]
  ))];
  const table = element("table");
  const head = element("thead");
  const header = element("tr");
  for (const key of keys) header.append(element("th", labels[key] || key));
  head.append(header);
  const body = element("tbody");
  for (const row of rows) {
    const tr = element("tr");
    for (const key of keys) {
      const cell = element("td");
      const value = row?.[key];
      if (typeof value === "string" && /^https?:\/\//i.test(value)) {
        const link = element("a", "Abrir enlace");
        link.href = value;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        cell.append(link);
      } else {
        cell.textContent = display(value);
      }
      tr.append(cell);
    }
    body.append(tr);
  }
  table.append(head, body);
  section.append(table);
}

function renderManagementTable(section, rows, resource, idField, editableFields) {
  if (!rows.length) {
    section.append(element("p", "No hay registros en Supabase.", "ayuda"));
    return;
  }

  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const table = element("table");
  const head = element("thead");
  const header = element("tr");
  for (const key of [...keys, "acciones"]) {
    header.append(element("th", key === "acciones" ? "Acciones" : labels[key] || key));
  }
  head.append(header);
  const body = element("tbody");

  for (const row of rows) {
    const tableRow = element("tr");
    for (const key of keys) {
      const cell = element("td");
      cell.textContent = display(row[key]);
      tableRow.append(cell);
    }
    const actions = element("td", undefined, "management-actions");
    const editButton = element("button", "Modificar", "btn-mini");
    editButton.type = "button";
    editButton.addEventListener("click", () => {
      const rowEditableFields = editableFields.filter((field) => !field.when || field.when(row));
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        const field = rowEditableFields.find((item) => item.key === key);
        if (!field) continue;
        const input = document.createElement("input");
        input.type = field.type || "text";
        input.name = key;
        input.value = row[key] ?? "";
        input.required = field.required === true;
        if (field.type === "number") {
          input.step = "1";
          if (field.min !== undefined) input.min = String(field.min);
          if (field.max !== undefined) input.max = String(field.max);
        }
        tableRow.children[index].replaceChildren(input);
      }
      actions.replaceChildren();
      const saveButton = element("button", "Guardar", "btn-mini");
      saveButton.type = "button";
      saveButton.addEventListener("click", async () => {
        const changes = {};
        for (const field of rowEditableFields) {
          const input = tableRow.querySelector(`[name="${field.key}"]`);
          if (!input) continue;
          const value = input.value.trim();
          changes[field.key] = field.type === "number"
            ? (value === "" ? null : Number(value))
            : (value === "" ? null : value);
        }
        try {
          await window.apiRequest(`/${resource}/${row[idField]}`, {
            method: "PUT",
            body: JSON.stringify(changes),
          });
          window.gpRefreshCurrentPage();
        } catch (error) {
          window.alert(error.message);
        }
      });
      const cancelButton = element("button", "Cancelar", "btn-mini");
      cancelButton.type = "button";
      cancelButton.addEventListener("click", () => window.gpRefreshCurrentPage());
      actions.append(saveButton, cancelButton);
    });

    const deleteButton = element("button", "Eliminar", "btn-mini rojo");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", async () => {
      if (!window.confirm("Esta acción es definitiva. Si el registro tiene datos relacionados, no podrá eliminarse. ¿Deseas continuar?")) {
        return;
      }
      try {
        await window.apiRequest(`/${resource}/${row[idField]}`, { method: "DELETE" });
        window.gpRefreshCurrentPage();
      } catch (error) {
        window.alert(error.message);
      }
    });
    actions.append(editButton, deleteButton);
    tableRow.append(actions);
    body.append(tableRow);
  }

  table.append(head, body);
  section.append(table);
}

const userEditableFields = [
  { key: "nombre_completo", required: true },
  { key: "correo", type: "email", required: true },
  {
    key: "semestre",
    type: "number",
    required: true,
    min: 1,
    max: 8,
    when: (user) => String(user.rol).toLowerCase() === "estudiante",
  },
];
const institutionEditableFields = [
  { key: "nombre_institucion", required: true },
  { key: "ciudad" },
  { key: "direccion" },
  { key: "telefono" },
  { key: "estado_institucion" },
];
const practiceEditableFields = [
  { key: "fecha_inicio", type: "date" },
  { key: "fecha_fin", type: "date" },
  { key: "horas_requeridas", type: "number", required: true },
  { key: "estado_horas" },
  { key: "estado_practica" },
  { key: "estado_seg" },
  { key: "id_programa", type: "number" },
  { key: "id_ciclo", type: "number" },
  { key: "semestre", type: "number" },
  { key: "tipo_practica" },
];

async function loadResource(resource) {
  return window.apiRequest(`/${resource}`);
}

async function renderPage(main, page) {
  const datasets = await Promise.all(page.resources.map(async (resource) => [
    resource,
    await loadResource(resource),
  ]));
  const data = Object.fromEntries(datasets);
  main.replaceChildren();
  main.append(element("div", page.title, "live-page-title"));
  main.append(element(
    "p",
    "Datos conectados a Supabase. Las modificaciones hechas desde la API se reflejan automáticamente.",
    "ayuda",
  ));

  if (!["director", "gestion-academica"].includes(pageKeyForForms)) {
    for (const resource of page.resources) {
      const section = addSection(main, names[resource] || resource);
      const value = data[resource];
      if (resource === "reports/summary" && value && typeof value === "object") {
        renderTable(section, Object.entries(value).map(([key, count]) => ({
          indicador: key,
          total: count,
        })));
      } else if (currentUser().rol === "director" && resource === "users") {
        renderManagementTable(section, Array.isArray(value) ? value : [], "users", "id_usuario", userEditableFields);
      } else if (currentUser().rol === "director" && resource === "practices") {
        renderManagementTable(section, Array.isArray(value) ? value : [], "practices", "id_practica", practiceEditableFields);
      } else if (currentUser().rol === "director" && resource === "institutions") {
        renderManagementTable(section, Array.isArray(value) ? value : [], "institutions", "id_institucion", institutionEditableFields);
      } else {
        renderTable(section, Array.isArray(value) ? value : []);
      }
    }
  }
  if (currentUser().rol === "estudiante") renderSemesterGuide(main);
  if (pageKeyForForms === "director") {
    const summary = data["reports/summary"] || {};
    const stats = addSection(main, "Resumen actual");
    renderTable(stats, Object.entries(summary).map(([indicador, total]) => ({ indicador, total })));
    if (currentUser().rol === "director") {
      renderManagementTable(addSection(main, "Usuarios"), data.users || [], "users", "id_usuario", userEditableFields);
      renderManagementTable(addSection(main, "Prácticas"), data.practices || [], "practices", "id_practica", practiceEditableFields);
    } else {
      renderTable(addSection(main, "Usuarios"), data.users || []);
      renderTable(addSection(main, "Prácticas"), data.practices || []);
    }
    renderTable(addSection(main, "Actividad reciente"), (data.audit || []).slice(0, 30));
  }
  if (pageKeyForForms === "gestion-academica") renderAcademicForms(main, data);
  if (pageKeyForForms === "documentos") renderDocumentForm(main, data);
  if (pageKeyForForms === "formulario") renderSessionForm(main, data);
  if (["docente"].includes(pageKeyForForms)) renderTemplateForm(main, data);
  return data;
}

let pageKeyForForms = "";

function renderAcademicForms(main, data) {
  const users = data.users || [];
  const programs = data.programs || [];
  const institutions = data.institutions || [];
  const stats = addSection(main, "Indicadores");
  renderTable(stats, [
    { indicador: "Usuarios activos", total: users.filter((user) => user.estado === "Activo").length },
    { indicador: "Programas", total: programs.length },
    { indicador: "Instituciones", total: institutions.length },
  ]);
  const userForm = addSection(main, "Crear usuario");
  userForm.insertAdjacentHTML("beforeend", `
    <form id="liveUserForm" class="form-grid">
      <input name="nombreCompleto" required minlength="3" placeholder="Nombre completo">
      <input name="correo" required type="email" placeholder="Correo">
      <input name="password" required type="password" minlength="8" autocomplete="new-password" placeholder="Contraseña inicial (mín. 8 caracteres)">
      <select name="rol" required>
        <option value="">Rol</option><option value="estudiante">Estudiante</option>
        <option value="tutor">Tutor</option><option value="asesor">Asesor</option>
      </select>
      <select name="idPrograma"><option value="">Programa del estudiante</option>${programs.map((item) =>
        `<option value="${escapeHtml(item.id_programa)}">${escapeHtml(item.nombre_programa)}</option>`
      ).join("")}</select>
      <select name="semestre"><option value="">Semestre del estudiante</option>${Array.from({ length: 8 }, (_, index) =>
        `<option value="${index + 1}">Semestre ${index + 1}</option>`
      ).join("")}</select>
      <button class="btn-form">Crear cuenta</button>
    </form>`);
  const roleSelect = $("liveUserForm").elements.rol;
  const programSelect = $("liveUserForm").elements.idPrograma;
  const semesterSelect = $("liveUserForm").elements.semestre;
  const updateStudentFields = () => {
    const isStudent = roleSelect.value === "estudiante";
    programSelect.required = isStudent;
    semesterSelect.required = isStudent;
    programSelect.hidden = !isStudent;
    semesterSelect.hidden = !isStudent;
  };
  roleSelect.addEventListener("change", updateStudentFields);
  updateStudentFields();
  $("liveUserForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await window.apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({
          nombreCompleto: form.get("nombreCompleto"),
          correo: form.get("correo"),
          password: form.get("password"),
          rol: form.get("rol"),
          ...(form.get("rol") === "estudiante"
            ? {
                idPrograma: Number(form.get("idPrograma")),
                semestre: Number(form.get("semestre")),
              }
            : {}),
        }),
      });
      window.gpRefreshCurrentPage();
    } catch (error) {
      window.alert(error.message);
    }
  });

  const programForm = addSection(main, "Crear programa");
  programForm.insertAdjacentHTML("beforeend", `
    <form id="liveProgramForm" class="form-grid">
      <input name="nombre_programa" required minlength="5" placeholder="Nombre del programa">
      <input name="facultad" placeholder="Facultad">
      <button class="btn-form">Guardar programa</button>
    </form>`);
  $("liveProgramForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await window.apiRequest("/programs", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
    } catch (error) {
      window.alert(error.message);
    }
  });

  const institutionForm = addSection(main, "Crear institución");
  institutionForm.insertAdjacentHTML("beforeend", `
    <form id="liveInstitutionForm" class="form-grid">
      <input name="nombre_institucion" required placeholder="Nombre">
      <input name="ciudad" placeholder="Ciudad">
      <input name="direccion" placeholder="Dirección">
      <input name="telefono" placeholder="Teléfono">
      <select name="estado_institucion"><option value="Activo">Activa</option><option value="Inactivo">Inactiva</option></select>
      <button class="btn-form">Guardar institución</button>
    </form>`);
  $("liveInstitutionForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await window.apiRequest("/institutions", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
    } catch (error) {
      window.alert(error.message);
    }
  });

  if (currentUser().rol === "director") {
    renderManagementTable(addSection(main, "Usuarios registrados"), users, "users", "id_usuario", userEditableFields);
  } else {
    renderTable(addSection(main, "Usuarios registrados"), users);
  }
  renderTable(addSection(main, "Programas académicos"), programs);
  if (currentUser().rol === "director") {
    renderManagementTable(addSection(main, "Instituciones"), institutions, "institutions", "id_institucion", institutionEditableFields);
  } else {
    renderTable(addSection(main, "Instituciones"), institutions);
  }
}

function renderDocumentForm(main, data) {
  const section = addSection(main, "Registrar documento por enlace");
  section.insertAdjacentHTML("beforeend", `
    <p class="ayuda">Sube el archivo a un almacenamiento autorizado y pega aquí el enlace. No se envía el archivo al servidor.</p>
    <form id="liveDocumentForm" class="form-grid">
      <select name="assignment" required><option value="">Mi asignación</option>${(data.assignments || []).map((item) =>
        `<option value="${escapeHtml(item.id_asignacion)}">${escapeHtml(display(item.practica))}</option>`
      ).join("")}</select>
      <select name="type" required>
        <option value="">Tipo de documento</option>
        <option>Hoja de Vida</option><option>Carta de Presentación</option>
        <option>Plan de Trabajo</option><option>Informe Parcial</option><option>Informe Final</option>
      </select>
      <input name="url" type="url" required placeholder="https:// enlace al documento">
      <button class="btn-form">Enviar a revisión</button>
    </form>`);
  $("liveDocumentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await window.apiRequest("/documents", {
        method: "POST",
        body: JSON.stringify({
          idAsignacion: Number(form.get("assignment")),
          tipoDocumento: form.get("type"),
          urlArchivo: form.get("url"),
        }),
      });
      window.gpRefreshCurrentPage();
    } catch (error) {
      window.alert(error.message);
    }
  });
}

function renderSessionForm(main, data) {
  const section = addSection(main, "Crear sesión de bitácora");
  const programs = data.programs || [];
  const cycles = data.cycles || [];
  const practices = data.practices || [];
  section.insertAdjacentHTML("beforeend", `
    <form id="liveSessionForm" class="form-grid">
      <input name="nombre" required maxlength="150" placeholder="Nombre">
      <textarea name="descripcion" placeholder="Descripción"></textarea>
      <input name="fecha_inicio" type="date" required aria-label="Fecha de inicio">
      <input name="fecha_fin" type="date" required aria-label="Fecha de fin">
      <select name="program"><option value="">Todos los programas</option>${programs.map((item) =>
        `<option value="${escapeHtml(item.id_programa)}">${escapeHtml(item.nombre_programa)}</option>`
      ).join("")}</select>
      <select name="cycle"><option value="">Sin ciclo</option>${cycles.map((item) =>
        `<option value="${escapeHtml(item.id_ciclo)}">${escapeHtml(item.nombre_periodo)}</option>`
      ).join("")}</select>
      <select name="practice"><option value="">Sin práctica</option>${practices.map((item) =>
        `<option value="${escapeHtml(item.id_practica)}">Práctica ${escapeHtml(item.id_practica)}</option>`
      ).join("")}</select>
      <textarea name="preguntas" placeholder='Preguntas en JSON (opcional): [{"texto":"Describe tu actividad","tipo":"texto","obligatoria":true}]'></textarea>
      <button class="btn-form">Crear sesión en Supabase</button>
    </form>`);
  $("liveSessionForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let questions = [];
    try {
      questions = form.get("preguntas") ? JSON.parse(form.get("preguntas")) : [];
      if (!Array.isArray(questions)) throw new Error("Las preguntas deben ser una lista JSON.");
    } catch (error) {
      window.alert(error.message || "El JSON de preguntas no es válido.");
      return;
    }
    try {
      await window.apiRequest("/sessions", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.get("nombre"),
          descripcion: form.get("descripcion"),
          fecha_inicio: form.get("fecha_inicio"),
          fecha_fin: form.get("fecha_fin"),
          id_programa: form.get("program") ? Number(form.get("program")) : null,
          id_ciclo: form.get("cycle") ? Number(form.get("cycle")) : null,
          id_practica: form.get("practice") ? Number(form.get("practice")) : null,
          preguntas: questions,
        }),
      });
      window.gpRefreshCurrentPage();
    } catch (error) {
      window.alert(error.message);
    }
  });
}

function renderSessionActions(main, data) {
  for (const session of data.sessions || []) {
    const section = addSection(main, `Configurar sesión: ${session.nombre}`);
    const questions = document.createElement("textarea");
    questions.name = "preguntas";
    questions.required = true;
    questions.className = "span-todo";
    questions.setAttribute("aria-label", `Preguntas de ${session.nombre} en JSON`);
    questions.value = JSON.stringify((session.pregunta_bitacora || []).map((question) => ({
      texto: question.texto,
      tipo: question.tipo,
      obligatoria: question.obligatoria,
      opciones: question.opciones || [],
      orden: question.orden,
      activa: question.activa,
    })), null, 2);
    const form = document.createElement("form");
    form.className = "form-grid";
    form.append(questions);
    const save = element("button", "Guardar preguntas", "btn-form");
    form.append(save);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      let parsedQuestions;
      try {
        parsedQuestions = JSON.parse(questions.value);
        if (!Array.isArray(parsedQuestions)) {
          throw new Error("Las preguntas deben ser una lista JSON.");
        }
      } catch (error) {
        window.alert(error.message || "El JSON de preguntas no es válido.");
        return;
      }
      try {
        await window.apiRequest(`/sessions/${session.id_sesion}/questions`, {
          method: "PUT",
          body: JSON.stringify({ preguntas: parsedQuestions }),
        });
        window.gpRefreshCurrentPage();
      } catch (error) {
        window.alert(error.message);
      }
    });
    section.append(form);

    const stateButton = element(
      "button",
      session.estado === "Abierta" ? "Cerrar sesión" : "Reabrir sesión",
      "btn-mini",
    );
    stateButton.type = "button";
    stateButton.addEventListener("click", async () => {
      const isOpen = session.estado === "Abierta";
      try {
        await window.apiRequest(`/sessions/${session.id_sesion}/state`, {
          method: "PATCH",
          body: JSON.stringify({
            estado: isOpen ? "Cerrada" : "Abierta",
            visible: !isOpen,
          }),
        });
        window.gpRefreshCurrentPage();
      } catch (error) {
        window.alert(error.message);
      }
    });
    section.append(stateButton);
  }
}

function renderTemplateForm(main, data) {
  const section = addSection(main, "Guardar plantilla de retroalimentación");
  section.insertAdjacentHTML("beforeend", `
    <form id="liveTemplateForm" class="form-grid">
      <textarea name="contenido" required placeholder="Contenido de la plantilla"></textarea>
      <button class="btn-form">Guardar plantilla</button>
    </form>`);
  $("liveTemplateForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await window.apiRequest("/templates", {
        method: "POST",
        body: JSON.stringify({ contenido: form.get("contenido") }),
      });
      window.gpRefreshCurrentPage();
    } catch (error) {
      window.alert(error.message);
    }
  });

  for (const template of data.templates || []) {
    const templateSection = addSection(main, `Editar plantilla ${template.id_plantilla}`);
    const form = document.createElement("form");
    form.className = "form-grid";
    const content = document.createElement("textarea");
    content.name = "contenido";
    content.required = true;
    content.value = template.contenido || "";
    content.setAttribute("aria-label", `Contenido de plantilla ${template.id_plantilla}`);
    form.append(content);
    const button = element("button", "Guardar cambios", "btn-form");
    form.append(button);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await window.apiRequest(`/templates/${template.id_plantilla}`, {
          method: "PUT",
          body: JSON.stringify({ contenido: content.value }),
        });
        window.gpRefreshCurrentPage();
      } catch (error) {
        window.alert(error.message);
      }
    });
    templateSection.append(form);
  }
}

function renderPracticeForms(main, data) {
  const actorId = Number(currentUser().id);
  const formCycles = addSection(main, "Crear ciclo académico");
  formCycles.insertAdjacentHTML("beforeend", `
    <form id="liveCycleForm" class="form-grid">
      <input name="nombre_periodo" placeholder="Nombre del ciclo (ej. 2027-1)" required maxlength="20">
      <select name="estado_ciclo"><option value="Abierto">Abierto</option><option value="Cerrado">Cerrado</option></select>
      <button class="btn-form">Crear ciclo</button>
    </form>`);
  const formPractice = addSection(main, "Crear práctica y asignarla");
  const options = (items, id, label) => `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
  const list = (items, id, label) => items.map((item) => options(item, item[id], item[label])).join("");
  const students = (data.users || []).filter((user) =>
    ["estudiante"].includes(String(user.rol).toLowerCase()) && user.estado === "Activo"
  );
  const tutors = (data.users || []).filter((user) => /tutor/i.test(user.rol));
  const advisors = (data.users || []).filter((user) => /asesor/i.test(user.rol));
  formPractice.insertAdjacentHTML("beforeend", `
    <form id="livePracticeForm" class="form-grid">
      <select name="student" required><option value="">Estudiante</option>${list(students, "id_usuario", "nombre_completo")}</select>
      <select name="program" required><option value="">Programa</option>${list(data.programs, "id_programa", "nombre_programa")}</select>
      <select name="institution" required><option value="">Institución</option>${list(data.institutions, "id_institucion", "nombre_institucion")}</select>
      <select name="cycle" required><option value="">Ciclo abierto</option>${list((data.cycles || []).filter((item) => item.estado_ciclo === "Abierto"), "id_ciclo", "nombre_periodo")}</select>
      <select name="tutor" required><option value="">Tutor</option>${list(tutors, "id_usuario", "nombre_completo")}</select>
      <select name="advisor" required><option value="">Asesor</option>${list(advisors, "id_usuario", "nombre_completo")}</select>
      <input name="fecha_inicio" type="date" required aria-label="Fecha de inicio">
      <input name="fecha_fin" type="date" required aria-label="Fecha de fin">
      <input name="arl" type="date" required aria-label="Vigencia ARL">
      <input name="horas_requeridas" type="number" min="1" value="200" required aria-label="Horas requeridas">
      <button class="btn-form">Guardar en Supabase</button>
    </form>`);

  $("liveCycleForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await window.apiRequest("/cycles", {
        method: "POST",
        body: JSON.stringify({
          nombre_periodo: form.get("nombre_periodo"),
          estado_ciclo: form.get("estado_ciclo"),
          id_director: actorId,
        }),
      });
      window.gpRefreshCurrentPage();
    } catch (error) {
      window.alert(error.message);
    }
  });

  $("livePracticeForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedStudent = students.find((student) =>
      Number(student.id_usuario) === Number(form.get("student"))
    );
    if (!selectedStudent?.semestre || Number(selectedStudent.semestre) < 1 || Number(selectedStudent.semestre) > 8) {
      window.alert("Asigna un semestre al estudiante antes de crear su práctica.");
      return;
    }
    if (Number(selectedStudent.id_programa) !== Number(form.get("program"))) {
      window.alert("El programa seleccionado debe coincidir con el programa del estudiante.");
      return;
    }
    try {
      const practice = await window.apiRequest("/practices", {
        method: "POST",
        body: JSON.stringify({
          fecha_inicio: form.get("fecha_inicio"),
          fecha_fin: form.get("fecha_fin"),
          horas_requeridas: Number(form.get("horas_requeridas")),
          estado_practica: "Activa",
          estado_horas: "Pendiente",
          estado_seg: "Pendiente",
          id_programa: Number(form.get("program")),
          id_ciclo: Number(form.get("cycle")),
          semestre: Number(selectedStudent.semestre),
        }),
      });
      await window.apiRequest("/assignments", {
        method: "POST",
        body: JSON.stringify({
          id_estudiante: Number(form.get("student")),
          id_practica: practice.id_practica,
          id_institucion: Number(form.get("institution")),
          id_tutor: Number(form.get("tutor")),
          id_asesor: Number(form.get("advisor")),
          estado_arl: String(form.get("arl")),
        }),
      });
      window.gpRefreshCurrentPage();
    } catch (error) {
      window.alert(error.message);
    }
  });
}

function renderLogbookForm(main, data) {
  const formSection = addSection(main, "Registrar bitácora");
  const semester = Number(currentUser().semestre);
  const assignments = (data.assignments || []).filter((assignment) =>
    !assignment.practica?.semestre || Number(assignment.practica.semestre) === semester
  );
  const assignmentPracticeIds = new Set(assignments.map((assignment) =>
    Number(assignment.id_practica)
  ));
  const sessions = (data.sessions || []).filter((session) =>
    !session.id_practica || assignmentPracticeIds.has(Number(session.id_practica))
  );
  formSection.insertAdjacentHTML("beforeend", `
    <form id="liveLogbookForm" class="form-grid">
      <select name="assignment" required><option value="">Mi asignación</option>${assignments.map((item) =>
        `<option value="${escapeHtml(item.id_asignacion)}">${escapeHtml(display(item.practica))}</option>`
      ).join("")}</select>
      <select name="session"><option value="">Sin sesión dinámica</option>${sessions.map((item) =>
        `<option value="${escapeHtml(item.id_sesion)}">${escapeHtml(item.nombre)}</option>`
      ).join("")}</select>
      <input name="fecha" type="date" required aria-label="Fecha">
      <input name="horaIngreso" type="time" required aria-label="Hora de ingreso">
      <input name="horaSalida" type="time" required aria-label="Hora de salida">
      <input name="numeroVisita" type="number" min="1" placeholder="Número de visita">
      <input name="urlEvidencias" type="url" placeholder="https:// enlace de evidencias">
      <textarea name="actividad" required minlength="10" maxlength="600" placeholder="Actividades realizadas"></textarea>
      <textarea name="reflexionPedagogica" placeholder="Reflexión pedagógica (opcional)"></textarea>
      <div id="liveAnswers" class="span-todo"></div>
      <button class="btn-form">Enviar bitácora</button>
    </form>`);
  $("liveLogbookForm").elements.session.addEventListener("change", (event) => {
    const selected = sessions.find((session) => String(session.id_sesion) === event.target.value);
    const container = $("liveAnswers");
    container.replaceChildren();
    for (const question of selected?.pregunta_bitacora || []) {
      if (question.activa === false) continue;
      const label = element("label", question.texto);
      let input;
      if (question.tipo === "opcion") {
        input = element("select");
        input.insertAdjacentHTML("beforeend", '<option value="">Selecciona</option>' +
          (question.opciones || []).map((option) =>
            `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`
          ).join(""));
      } else {
        input = element("input");
        input.type = question.tipo === "numero" ? "number" : "text";
      }
      input.name = `question-${question.id_pregunta}`;
      input.dataset.questionId = question.id_pregunta;
      input.required = question.obligatoria === true;
      label.append(input);
      container.append(label);
    }
  });
  $("liveLogbookForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await window.apiRequest("/logbooks", {
        method: "POST",
        body: JSON.stringify({
          idAsignacion: Number(form.get("assignment")),
          ...(form.get("session") ? { idSesion: Number(form.get("session")) } : {}),
          fecha: form.get("fecha"),
          horaIngreso: form.get("horaIngreso"),
          horaSalida: form.get("horaSalida"),
          numeroVisita: form.get("numeroVisita") || null,
          urlEvidencias: form.get("urlEvidencias") || null,
          actividad: form.get("actividad"),
          reflexionPedagogica: form.get("reflexionPedagogica") || null,
          respuestas: [...event.currentTarget.querySelectorAll("[data-question-id]")].map((input) => ({
            idPregunta: Number(input.dataset.questionId),
            valor: input.value,
          })),
        }),
      });
      window.gpRefreshCurrentPage();
    } catch (error) {
      window.alert(error.message);
    }
  });
}

function renderWorkflowActions(main, data) {
  if (currentUser().rol === "director" || currentUser().rol === "tutor") {
    const docs = (data.documents || []).filter((document) => document.estado === "Pendiente");
    if (docs.length) {
      const section = addSection(main, "Revisar documentos pendientes");
      for (const document of docs) {
        const row = element("div", `Documento ${document.id_documento}: ${document.tipo_documento}`);
        const button = element("button", "Marcar aprobado", "btn-mini");
        button.type = "button";
        button.addEventListener("click", async () => {
          try {
            await window.apiRequest(`/documents/${document.id_documento}/state`, {
              method: "PATCH",
              body: JSON.stringify({ estado: "Aprobado" }),
            });
          } catch (error) {
            window.alert(error.message);
          }
        });
        row.append(button);
        section.append(row);
      }
    }
  }

  if (currentUser().rol === "director" || currentUser().rol === "tutor") {
    const sessions = (data.sessions || []).filter((session) =>
      session.estado === "Abierta" && session.visible !== false
    );
    if (sessions.length) {
      const section = addSection(main, "Cerrar o esconder sesiones");
      for (const session of sessions) {
        const button = element("button", `Cerrar sesión ${session.nombre}`, "btn-mini");
        button.type = "button";
        button.addEventListener("click", async () => {
          try {
            await window.apiRequest(`/sessions/${session.id_sesion}/state`, {
              method: "PATCH",
              body: JSON.stringify({ estado: "Cerrada", visible: false }),
            });
          } catch (error) {
            window.alert(error.message);
          }
        });
        section.append(button);
      }
    }
  }
}

function renderReviewActions(main, data) {
  const userRole = currentUser().rol;
  for (const logbook of data.logbooks || []) {
    const reviewSection = addSection(main, `Acciones para bitácora ${logbook.id_bitacora}`);
    const form = document.createElement("form");
    form.className = "form-grid";
    if (userRole === "tutor" || userRole === "director") {
      form.insertAdjacentHTML("beforeend", `
        <select name="estado"><option value="Aprobada">Aprobar</option><option value="Corrección">Solicitar corrección</option></select>
        <textarea name="retroalimentacion" required placeholder="Retroalimentación obligatoria"></textarea>
        <button class="btn-form">Guardar revisión</button>`);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = new FormData(form);
        try {
          await window.apiRequest(`/logbooks/${logbook.id_bitacora}/review`, {
            method: "PATCH",
            body: JSON.stringify({
              estado: values.get("estado"),
              retroalimentacion: values.get("retroalimentacion"),
            }),
          });
          window.gpRefreshCurrentPage();
        } catch (error) {
          window.alert(error.message);
        }
      });
    } else {
      form.insertAdjacentHTML("beforeend", `
        <input name="calificacion" type="number" min="0" max="5" step="0.1" required placeholder="Calificación 0 a 5">
        <textarea name="observacion" required placeholder="Observaciones"></textarea>
        <button class="btn-form">Guardar evaluación</button>`);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const values = new FormData(form);
        const endpoint = userRole === "asesor"
          ? `/logbooks/${logbook.id_bitacora}/evaluations/advisor`
          : `/logbooks/${logbook.id_bitacora}/evaluations/tutor`;
        try {
          await window.apiRequest(endpoint, {
            method: "POST",
            body: JSON.stringify({
              calificacion: Number(values.get("calificacion")),
              observacion: values.get("observacion"),
            }),
          });
          window.gpRefreshCurrentPage();
        } catch (error) {
          window.alert(error.message);
        }
      });
    }
    reviewSection.append(form);
  }
}

async function start() {
  const user = await window.authSessionReady;
  if (!user) return;
  const pageKey = document.body.dataset.pagina;
  pageKeyForForms = pageKey;
  const page = pages[pageKey];
  if (!page) return;

  const menu = $("menuLateral");
  if (menu) {
    const entries = {
      estudiante: [[user.semestre ? `Panel · Semestre ${user.semestre}` : "Panel", "02-estudiante.html"], ["Mi práctica", "03-practicas_estudiante.html"], ["Bitácoras", "04-bitacora.html"], ["Documentos", "05-documento_estudiante.html"]],
      docente: [["Panel", "06-docente.html"], ["Revisión", "07-revision_bitacora.html"], ["Evaluaciones", "08-observaciones.html"], ["Formulario", "18-formulario_bitacora.html"]],
      asesor: [["Panel", "09-asesor.html"], ["Seguimiento", "10-seguimiento_estudiantes.html"], ["Horas", "11-horas_reportes.html"]],
      director: [["Panel", "12-director.html"], ["Gestión académica", "13-gestion_academica.html"], ["Prácticas", "14-gestion_practicas.html"], ["Formulario", "18-formulario_bitacora.html"], ["Reportes", "16-reportes.html"], ["Auditoría", "19-auditoria.html"]],
    }[user.rol] || [];
    menu.innerHTML = entries.map(([label, href]) =>
      `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`
    ).join("") + '<li><a href="#" id="liveLogout">Cerrar sesión</a></li>';
    $("liveLogout").addEventListener("click", (event) => {
      event.preventDefault();
      window.logoutFirebase();
    });
  }

  const main = document.querySelector("main");
  const heading = main.querySelector("h1");
  if (heading) heading.textContent = page.title;
  const roleHeader = main.querySelector(".dashboard-header");
  const userName = roleHeader?.querySelector("#nombreUsuario");
  if (userName) userName.textContent = user.nombre;

  async function refresh() {
    const data = await renderPage(main, page);
    if (pageKey === "gestion-practicas") renderPracticeForms(main, data);
    if (pageKey === "bitacora") renderLogbookForm(main, data);
    if (["documentos", "seguimiento", "docente"].includes(pageKey)) renderWorkflowActions(main, data);
    if (pageKey === "formulario") renderSessionActions(main, data);
    if (["revision", "observaciones", "asesor"].includes(pageKey)) renderReviewActions(main, data);
  }
  window.gpRefreshCurrentPage = () => refresh().catch((error) => {
    console.error("No se pudieron cargar los datos en vivo:", error);
    main.replaceChildren(element("p", error.message || "No se pudieron cargar los datos desde Supabase.", "mensaje error"));
  });
  window.addEventListener("gp:data-change", window.gpRefreshCurrentPage);
  await window.gpRefreshCurrentPage();
}

start().catch((error) => {
  console.error("No se pudo iniciar la página conectada a Supabase:", error);
  const main = document.querySelector("main");
  main?.replaceChildren(element("p", error.message || "No se pudo iniciar la aplicación.", "mensaje error"));
});
