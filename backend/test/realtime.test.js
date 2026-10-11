import assert from "node:assert/strict";
import test from "node:test";
import { createRealtimeHub } from "../src/utils/realtime.js";

test("realtime hub publishes changes and stops after unsubscribe", () => {
  const hub = createRealtimeHub();
  const changes = [];
  const unsubscribe = hub.subscribe((change) => changes.push(change));

  hub.publish({ resource: "users" });
  unsubscribe();
  hub.publish({ resource: "programs" });

  assert.deepEqual(changes, [{ resource: "users" }]);
});
