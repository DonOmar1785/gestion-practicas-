import assert from "node:assert/strict";
import test from "node:test";
import { TextReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";
import { createCatalogService } from "../src/services/catalog.service.js";
import { createUserService } from "../src/services/user.service.js";
import { importDocxQuestions } from "../src/services/question-import.service.js";

test("user creation rejects invalid roles before calling Firebase or Supabase", async () => {
  const service = createUserService({
    supabase: {},
    firebaseAuth: {},
  });

  test("student creation requires a valid semester", async () => {
    let firebaseCalled = false;
    const service = createUserService({
      supabase: {},
      firebaseAuth: {
        async createUser() {
          firebaseCalled = true;
        },
      },
    });

    await assert.rejects(service.create({
      correo: "estudiante@example.test",
      password: "password123",
      nombreCompleto: "Estudiante",
      rol: "estudiante",
      idPrograma: 1,
      semestre: 9,
    }), { status: 400, message: "Selecciona un semestre válido entre 1 y 8." });
    assert.equal(firebaseCalled, false);
  });

  test("student creation persists the selected semester in the student profile", async () => {
    const inserts = [];
    const service = createUserService({
      supabase: {
        from(table) {
          const query = {
            insert(value) {
              inserts.push({ table, value });
              return this;
            },
            select() {
              return this;
            },
            single() {
              return Promise.resolve({
                data: {
                  id_usuario: 50,
                  nombre_completo: "Estudiante de prueba",
                  rol: "estudiante",
                  correo: "estudiante@example.test",
                  estado: "Activo",
                },
                error: null,
              });
            },
            then(resolve, reject) {
              return Promise.resolve({ error: null }).then(resolve, reject);
            },
          };
          return query;
        },
      },
      firebaseAuth: {
        async createUser() {
          return { uid: "firebase-student" };
        },
      },
    });

    await service.create({
      correo: "estudiante@example.test",
      password: "password123",
      nombreCompleto: "Estudiante de prueba",
      rol: "estudiante",
      idPrograma: 4,
      semestre: 5,
    });
    assert.deepEqual(inserts, [
      {
        table: "usuario",
        value: {
          uid_firebase: "firebase-student",
          nombre_completo: "Estudiante de prueba",
          rol: "estudiante",
          correo: "estudiante@example.test",
          estado: "Activo",
        },
      },
      {
        table: "estudiante",
        value: { id_estudiante: 50, id_programa: 4, semestre: 5 },
      },
    ]);
  });

  await assert.rejects(
    service.create({
      correo: "user@example.test",
      password: "password123",
      nombreCompleto: "Test",
      rol: "administrador",
    }),
    { status: 400 },
  );
});

test("catalog service ignores unapproved fields when inserting", async () => {
  let inserted;
  const query = {
    insert(value) {
      inserted = value;
      return this;
    },
    select() {
      return this;
    },
    single() {
      return Promise.resolve({ data: inserted, error: null });
    },
  };
  const service = createCatalogService({
    from() {
      return query;
    },
  });

  const result = await service.create("programs", {
    nombre_programa: "Educación Infantil",
    rol: "director",
  });
  assert.deepEqual(inserted, { nombre_programa: "Educación Infantil" });
  assert.equal(result.nombre_programa, "Educación Infantil");
});

test("catalog deletion reports a conflict when related rows prevent deletion", async () => {
  const query = {
    delete() {
      return this;
    },
    eq() {
      return this;
    },
    select() {
      return this;
    },
    maybeSingle() {
      return Promise.resolve({
        data: null,
        error: { code: "23503", message: "foreign key violation" },
      });
    },
  };
  const service = createCatalogService({ from: () => query });

  await assert.rejects(service.remove("institutions", 3), {
    status: 409,
    message: "No se puede eliminar porque el registro tiene datos relacionados.",
  });
});

test("user deletion preserves Firebase access if Supabase rejects related data", async () => {
  const firebaseUpdates = [];
  const query = {
    deleting: false,
    select() {
      return this;
    },
    eq() {
      return this;
    },
    delete() {
      this.deleting = true;
      return this;
    },
    maybeSingle() {
      return Promise.resolve(this.deleting
        ? { data: null, error: { code: "23503", message: "foreign key violation" } }
        : { data: { id_usuario: 22, uid_firebase: "firebase-22" }, error: null });
    },
  };
  const service = createUserService({
    supabase: { from: () => query },
    firebaseAuth: {
      async updateUser(uid, changes) {
        firebaseUpdates.push({ uid, changes });
      },
    },
  });

  await assert.rejects(service.remove(22, { id_usuario: 17 }), {
    status: 409,
    message: "No se puede eliminar porque el usuario tiene asignaciones, bitácoras u otros datos relacionados.",
  });
  assert.deepEqual(firebaseUpdates, [
    { uid: "firebase-22", changes: { disabled: true } },
    { uid: "firebase-22", changes: { disabled: false } },
  ]);
});

test("user updates synchronize the normalized name and email with Firebase", async () => {
  const storedUser = {
    id_usuario: 22,
    uid_firebase: "firebase-22",
    nombre_completo: "Nombre anterior",
    correo: "old@example.test",
    rol: "Tutor",
    estado: "Activo",
  };
  const firebaseUpdates = [];
  const service = createUserService({
    supabase: {
      from() {
        const query = {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({ data: { ...storedUser }, error: null });
          },
          update(changes) {
            this.changes = changes;
            return this;
          },
          single() {
            Object.assign(storedUser, this.changes);
            return Promise.resolve({ data: { ...storedUser }, error: null });
          },
        };
        return query;
      },
    },
    firebaseAuth: {
      async getUser(uid) {
        assert.equal(uid, "firebase-22");
        return { emailVerified: true };
      },
      async updateUser(uid, changes) {
        firebaseUpdates.push({ uid, changes });
      },
    },
  });

  const result = await service.update(22, {
    nombre_completo: "Nombre nuevo",
    correo: "NEW@example.test",
  });
  assert.equal(result.nombre_completo, "Nombre nuevo");
  assert.equal(result.correo, "new@example.test");
  assert.deepEqual(firebaseUpdates, [{
    uid: "firebase-22",
    changes: { displayName: "Nombre nuevo", email: "new@example.test", emailVerified: false },
  }]);
});

test("user updates persist semester only on the student profile", async () => {
  let semesterChange;
  const current = {
    id_usuario: 22,
    uid_firebase: "firebase-22",
    nombre_completo: "Estudiante",
    correo: "student@example.test",
    rol: "Estudiante",
    estado: "Activo",
    estudiante: { id_estudiante: 22, semestre: 2 },
  };
  const service = createUserService({
    supabase: {
      from(table) {
        const query = {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({ data: current, error: null });
          },
          update(changes) {
            assert.equal(table, "estudiante");
            semesterChange = changes;
            return this;
          },
          then(resolve, reject) {
            return Promise.resolve({ error: null }).then(resolve, reject);
          },
        };
        return query;
      },
    },
    firebaseAuth: {},
  });

  const result = await service.update(22, { semestre: 6 });
  assert.equal(result.semestre, 6);
  assert.deepEqual(semesterChange, { semestre: 6 });
});

test("DOCX question importer requires a file and reports a useful validation error", async () => {
  await assert.rejects(importDocxQuestions(null), {
    status: 400,
    message: "Debes adjuntar el archivo en el campo «archivo».",
  });
});

test("DOCX import turns each Word paragraph into an editable text question", async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:r><w:t>1. ¿Cómo fue la jornada?</w:t></w:r></w:p>
        <w:p><w:r><w:t>Reflexión pedagógica</w:t></w:r></w:p>
        <w:p><w:r><w:t>   </w:t></w:r></w:p>
      </w:body>
    </w:document>`;
  const writer = new ZipWriter(new Uint8ArrayWriter());
  await writer.add("word/document.xml", new TextReader(xml));
  const buffer = await writer.close();

  const questions = await importDocxQuestions({
    buffer,
    originalname: "plantilla.docx",
  });
  assert.deepEqual(
    questions.map((question) => question.texto),
    ["¿Cómo fue la jornada?", "Reflexión pedagógica"],
  );
  assert.ok(questions.every((question) => question.tipo === "texto" && question.obligatoria));
});
