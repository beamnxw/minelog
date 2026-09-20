import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyRun } from "../src/verify/run.mjs";

test("victory requires dragon death and the exit portal", () => {
  const no = verifyRun([{ kind: "run_start" }, { kind: "death" }]);
  assert.equal(no.ok, false);
  assert.deepEqual(no.errors, ["no dragon_dead evidence", "no exit_portal evidence"]);
  const yes = verifyRun([
    { kind: "run_start" },
    { kind: "death" },
    { kind: "dragon_dead" },
    { kind: "exit_portal" },
  ]);
  assert.equal(yes.ok, true);
  assert.equal(yes.deaths, 1);
});
