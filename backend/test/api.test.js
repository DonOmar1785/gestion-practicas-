import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createApp } from "../src/app.js";
import { createRealtimeHub } from "../src/utils/realtime.js";

const profile = {
  id_usuario: 17,
  uid_firebase: "firebase-user",
  nombre_completo: "Estudiante de prueba",
  rol: "Estudiante",
  correo: "estudiante@example.test",
  estado: "Activo",
};

const supabase = {
  from(table) {
    const query = {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      maybeSingle() {
        return Promise.resolve({ data: table === "usuario" ? profile : null, error: null });
      },
      limit() {
        return Promise.resolve({ data: [], error: null });
      },
    };
    return query;
  },
};

const firebaseAuth = {
  async verifyIdToken(token) {
    if (token !== "valid-token") throw new Error("invalid token");
    return { uid: profile.uid_firebase };
  },
};

const realtime = createRealtimeHub();
const server = createApp({ supabase, firebaseAuth, realtime }).listen(0);
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function url(path) {
  return `http://127.0.0.1:${server.address().port}${path}`;
}

test("health check verifies Supabase and root serves the Firebase login page", async () => {
  const health = await fetch(url("/api/health"));
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    status: "ok",
    services: { supabase: "connected" },
  });

  const page = await fetch(url("/"));
  assert.equal(page.status, 200);
  assert.match(await page.text(), /type="email"/);
});

test("profile endpoint verifies Firebase and returns the database role", async () => {
  const response = await fetch(url("/api/me"), {
    headers: { Authorization: "Bearer valid-token" },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    id: 17,
    name: "Estudiante de prueba",
    email: "estudiante@example.test",
    role: "estudiante",
  });
});

test("authenticated clients can open the live update stream", async () => {
  const response = await fetch(url("/api/events"), {
    headers: { Authorization: "Bearer valid-token" },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/event-stream/);

  const reader = response.body.getReader();
  const { value } = await reader.read();
  assert.match(new TextDecoder().decode(value), /event: connected/);
  const nextMessage = reader.read();
  realtime.publish({ resource: "programs", method: "POST", changedAt: "2026-10-11T00:00:00.000Z" });
  const { value: change } = await nextMessage;
  assert.match(new TextDecoder().decode(change), /event: data-change/);
  assert.match(new TextDecoder().decode(change), /"resource":"programs"/);
  await reader.cancel();
});

test("protected routes reject missing tokens and enforce role permissions", async () => {
  const missingToken = await fetch(url("/api/me"));
  assert.equal(missingToken.status, 401);

  const forbidden = await fetch(url("/api/users"), {
    headers: { Authorization: "Bearer valid-token" },
  });
  assert.equal(forbidden.status, 403);

  const forbiddenDelete = await fetch(url("/api/practices/1"), {
    method: "DELETE",
    headers: { Authorization: "Bearer valid-token" },
  });
  assert.equal(forbiddenDelete.status, 403);
});
