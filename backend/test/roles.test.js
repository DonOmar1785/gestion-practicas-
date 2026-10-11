import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRole } from "../src/utils/roles.js";

test("normalizeRole accepts the Spanish role labels used by the schema", () => {
  assert.equal(normalizeRole("Director de Programa"), "director");
  assert.equal(normalizeRole("Tutor Académico"), "tutor");
  assert.equal(normalizeRole("Asesor Pedagógico"), "asesor");
  assert.equal(normalizeRole("Estudiante"), "estudiante");
  assert.equal(normalizeRole("administrador"), null);
});
