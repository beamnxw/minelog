import { test } from "node:test";
import assert from "node:assert/strict";
import { legalActions, allActionIds, ACTIONS } from "../src/controller/actions.mjs";
import { emptySnapshot } from "../src/observe/snapshot.mjs";

test("catalog covers the campaign verbs", () => {
  for (const id of ["wait", "punch_tree", "mine_block", "fight", "flee", "throw_eye", "bed_explode", "recover"]) {
    assert.ok(ACTIONS[id], id);
  }
  assert.ok(allActionIds().length >= 16);
});

test("throw_eye is only legal in the stronghold stage", () => {
  const snap = emptySnapshot({ inventory: { ender_eye: 2 } });
  const ids = (stage) => legalActions(snap, { stage }).map((a) => a.id);
  assert.ok(!ids(0).includes("throw_eye"));
  assert.ok(ids(6).includes("throw_eye"));
});

test("creeper and low health do not by themselves add illegal actions", () => {
  const snap = emptySnapshot({
    hostiles: [{ type: "creeper", dist: 3 }],
    hazard: "creeper",
    health: 6,
    hasFood: true,
    food: 12,
  });
  const ids = legalActions(snap, { stage: 2 }).map((a) => a.id);
  assert.ok(ids.includes("flee"));
  assert.ok(ids.includes("fight"));
  assert.ok(ids.includes("wait"));
});

test("eat stays illegal without food", () => {
  const ids = legalActions(emptySnapshot({ food: 4, hasFood: false }), { stage: 1 }).map((a) => a.id);
  assert.ok(!ids.includes("eat"));
});
