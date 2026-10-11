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
