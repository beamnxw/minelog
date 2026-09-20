import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlannerJson, validatePlan, emptyPlan } from "../src/planner/schema.mjs";
import { PLAN } from "../src/config.mjs";

test("campaign has eight MineLog stages", () => {
  assert.equal(PLAN.length, 8);
  assert.equal(PLAN[7], "Defeat the Ender Dragon");
});

test("empty plan starts at wood", () => {
  const p = emptyPlan();
  assert.equal(p.stage, 0);
  assert.equal(p.goal, PLAN[0]);
});

test("parses fenced JSON from Astra", () => {
  const raw = "Sure.\n```json\n{\"stage\":3,\"goal\":\"Diamonds\",\"steps\":[\"Y=-59\"],\"step\":0,\"targets\":[\"diamond_ore\"]}\n```";
  const r = parsePlannerJson(raw);
  assert.equal(r.ok, true);
  assert.equal(r.plan.stage, 3);
  assert.deepEqual(r.plan.targets, ["diamond_ore"]);
});

test("clamps garbage stages and drops bad waypoints", () => {
  const r = validatePlan({ stage: 99, waypoint: { x: "nope" }, steps: ["a", "b"], step: 8 });
  assert.equal(r.ok, true);
  assert.equal(r.plan.stage, 7);
  assert.equal(r.plan.waypoint, null);
  assert.equal(r.plan.step, 1);
});
