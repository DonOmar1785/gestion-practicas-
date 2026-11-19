import { beforeEach, describe, expect, it } from "vitest";
import { resetMockDb } from "./db.js";
import { mockRequest } from "./handlers.js";
import { hoursProgress, studentNotifications } from "../utils/dashboard.js";
import { getCurrentAccount, signIn, signOutUser } from "../services/mockAuth.js";

const PASSWORD = "demo1234";

async function loginAs(email) {
  await signIn({ email, password: PASSWORD, remember: false });
}

async function expectError(promise, message) {
  let caught = null;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught === null).toBe(false);
  expect(caught.message).toBe(message);
}

const json = (payload) => ({ body: JSON.stringify(payload) });

describe("sesión simulada", () => {
  beforeEach(async () => {
    resetMockDb();
    await signOutUser();
  });

  it("crea prácticas en lote para estudiantes elegidos por programa y semestre", async () => {
    await loginAs("director@demo.com");
    const student = await mockRequest("users", {
      method: "POST",
      ...json({
        nombreCompleto: "Ana Estudiante",
        cedula: "1012345678",
        correo: "ana.estudiante@demo.com",
        password: "clave12345",
        rol: "estudiante",
        idPrograma: 1,
        semestre: 3,
      }),
    });
    const created = await mockRequest("practices/batch", {
      method: "POST",
      ...json({
        id_ciclo: 1,
        id_programa: 1,
        semestre: 3,
        tipo_practica: "Pedagógica",
        fecha_inicio: "2026-08-03",
        fecha_fin: "2026-11-27",
        horas_requeridas: 200,
        estudiantes: [{
          id_estudiante: student.id_usuario,
          id_institucion: 1,
          id_tutor: 2,
          id_asesor: 3,
          modalidad: "Virtual",
        }],
      }),
    });
    expect(created).toHaveLength(1);
    expect(created[0].id_estudiante).toBe(student.id_usuario);
    expect(created[0].estado_arl).toBe("No aplica");
  });

  it("rechaza credenciales incorrectas", async () => {
    await expectError(signIn({ email: "director@demo.com", password: "mal", remember: false }), "Correo o contraseña incorrectos.");
  });

  it("inicia y cierra sesión", async () => {
    await loginAs("director@demo.com");
    expect(getCurrentAccount().email).toBe("director@demo.com");
    await signOutUser();
    expect(getCurrentAccount()).toBeNull();
  });

  it("exige sesión para consultar la API", async () => {
    await expectError(mockRequest("me"), "Tu sesión expiró. Inicia sesión de nuevo.");
  });
});

describe("API simulada", () => {
  beforeEach(async () => {
    resetMockDb();
    await signOutUser();
  });

  it("devuelve el perfil del usuario", async () => {
    await loginAs("estudiante@demo.com");
    const me = await mockRequest("me");
    expect(me.role).toBe("estudiante");
    expect(me.semester).toBe(3);
  });

  it("el estudiante solo ve sus prácticas y no puede listar usuarios", async () => {
    await loginAs("estudiante@demo.com");
    const practices = await mockRequest("practices");
    expect(practices.length).toBe(1);
    expect(practices[0].semestre).toBe(3);
    await expectError(mockRequest("users"), "No tienes permisos para realizar esta acción.");
  });

  it("las prácticas traen estudiante, institución y responsables para el panel", async () => {
    await loginAs("estudiante@demo.com");
    const practices = await mockRequest("practices");
    expect(practices[0].institucion.nombre_institucion).toBe("Jardín Infantil Los Pinos");
    expect(practices[0].tutor.usuario.nombre_completo).toBe("Carlos Ramírez");
    expect(practices[0].estudiante.usuario.cedula).toBe("1098765432");
    expect(hoursProgress(practices)).toEqual({ done: 8, required: 200, percent: 4 });
    const notes = studentNotifications(await mockRequest("logbooks"), await mockRequest("documents"));
    expect(notes.length).toBe(3);
  });

  it("el director crea un programa y valida el nombre", async () => {
    await loginAs("director@demo.com");
    await expectError(mockRequest("programs", { method: "POST", ...json({ nombre_programa: "abc" }) }), "El nombre del programa es obligatorio.");
    const created = await mockRequest("programs", { method: "POST", ...json({ nombre_programa: "Ciencias Naturales", facultad: "Educación" }) });
    expect(created.id_programa).toBe(3);
    expect((await mockRequest("programs")).length).toBe(3);
  });

  it("crea un usuario nuevo que luego puede iniciar sesión", async () => {
    await loginAs("director@demo.com");
    await mockRequest("users", {
      method: "POST",
      ...json({ nombreCompleto: "Ana Torres", correo: "ana@demo.com", password: "clave12345", rol: "asesor" }),
    });
    await signOutUser();
    await signIn({ email: "ana@demo.com", password: "clave12345", remember: false });
    expect((await mockRequest("me")).name).toBe("Ana Torres");
  });

  it("no permite correos repetidos", async () => {
    await loginAs("director@demo.com");
    await expectError(
      mockRequest("users", {
        method: "POST",
        ...json({ nombreCompleto: "Otro", correo: "tutor@demo.com", password: "clave12345", rol: "tutor" }),
      }),
      "Ya existe un usuario con ese correo.",
    );
  });

  it("el director modifica una institución y no puede eliminar una con asignaciones", async () => {
    await loginAs("director@demo.com");
    const updated = await mockRequest("institutions/1", { method: "PUT", ...json({ ciudad: "Girón" }) });
    expect(updated.ciudad).toBe("Girón");
    await expectError(mockRequest("institutions/1", { method: "DELETE" }), "No se puede eliminar: tiene datos relacionados.");
  });

  it("solo el director elimina", async () => {
    await loginAs("tutor@demo.com");
    await expectError(mockRequest("institutions/1", { method: "DELETE" }), "No tienes permisos para realizar esta acción.");
  });

  it("el estudiante registra una bitácora y calcula las horas", async () => {
    await loginAs("estudiante@demo.com");
    const created = await mockRequest("logbooks", {
      method: "POST",
      ...json({ idPractica: 1, fecha: "2026-09-01", horaIngreso: "08:00", horaSalida: "10:30", actividad: "Actividades de lectura con los niños." }),
    });
    expect(created.horas_realizadas).toBe(2.5);
    expect(created.estado).toBe("Pendiente");
    expect((await mockRequest("logbooks")).length).toBe(3);
  });

  it("rechaza una bitácora con horas inválidas", async () => {
    await loginAs("estudiante@demo.com");
    await expectError(
      mockRequest("logbooks", {
        method: "POST",
        ...json({ idPractica: 1, fecha: "2026-09-01", horaIngreso: "10:00", horaSalida: "09:00", actividad: "Actividad de prueba larga." }),
      }),
      "La hora de salida debe ser posterior a la de ingreso.",
    );
  });

  it("el tutor aprueba una bitácora y se suman las horas", async () => {
    await loginAs("tutor@demo.com");
    await mockRequest("logbooks/2/review", { method: "PATCH", ...json({ estado: "Aprobada", retroalimentacion: "Muy bien." }) });
    const [practice] = await mockRequest("practices");
    expect(practice.horas_acumuladas).toBe(8);
  });

  it("el asesor califica de 0 a 5", async () => {
    await loginAs("asesor@demo.com");
    await expectError(
      mockRequest("logbooks/1/evaluations/advisor", { method: "POST", ...json({ calificacion: 9, observacion: "x" }) }),
      "La calificación debe estar entre 0 y 5.",
    );
    const evaluated = await mockRequest("logbooks/1/evaluations/advisor", {
      method: "POST",
      ...json({ calificacion: 4.5, observacion: "Buen trabajo." }),
    });
    expect(evaluated.calificacion_asesor).toBe(4.5);
  });

  it("registra un documento pendiente y el tutor lo aprueba", async () => {
    await loginAs("estudiante@demo.com");
    const document = await mockRequest("documents", {
      method: "POST",
      ...json({ idPractica: 1, tipoDocumento: "Informe Parcial", urlArchivo: "https://ejemplo.com/i.pdf" }),
    });
    expect(document.estado).toBe("Pendiente");
    await signOutUser();
    await loginAs("tutor@demo.com");
    const approved = await mockRequest(`documents/${document.id_documento}/state`, { method: "PATCH", ...json({ estado: "Aprobado" }) });
    expect(approved.estado).toBe("Aprobado");
  });

  it("guarda las preguntas de una sesión asignándoles identificadores", async () => {
    await loginAs("director@demo.com");
    const session = await mockRequest("sessions/1/questions", {
      method: "PUT",
      ...json({ preguntas: [{ texto: "Nueva pregunta", tipo: "texto", obligatoria: true }] }),
    });
    expect(session.pregunta_bitacora.length).toBe(1);
    expect(session.pregunta_bitacora[0].id_pregunta).toBeDefined();
  });

  it("duplica una sesión a otro grupo copiando sus preguntas", async () => {
    await loginAs("director@demo.com");
    const created = await mockRequest("sessions/1/duplicate", {
      method: "POST",
      ...json({ id_ciclo: 1, id_programa: 1, semestre: 5 }),
    });
    expect(created.nombre).toBe("Observación del ambiente pedagógico (copia)");
    expect(created.semestre).toBe(5);
    expect(created.pregunta_bitacora).toHaveLength(3);
  });

  it("el resumen cuenta los registros", async () => {
    await loginAs("director@demo.com");
    const summary = await mockRequest("reports/summary");
    expect(summary.estudiantes).toBe(2);
    expect(summary.instituciones).toBe(2);
  });

  it("responde con error si la ruta no existe", async () => {
    await loginAs("director@demo.com");
    await expectError(mockRequest("no-existe"), "Ruta de API no encontrada.");
  });
});
