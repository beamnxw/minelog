import { test } from "node:test";
import assert from "node:assert/strict";
import { reflex, gate } from "../src/controller/policy.mjs";
import { emptySnapshot } from "../src/observe/snapshot.mjs";
import { legalActions } from "../src/controller/actions.mjs";

test("lava and drowning are reflexes - Jev is not consulted", () => {
  assert.equal(reflex(emptySnapshot({ lavaAdjacent: true })), "flee");
  assert.equal(reflex(emptySnapshot({ air: 20 })), "flee");
  assert.equal(reflex(emptySnapshot({ onFire: true })), "flee");
});

test("a creeper inside 5 blocks forces flee", () => {
  const snap = emptySnapshot({ hostiles: [{ type: "creeper", dist: 4 }] });
  assert.equal(reflex(snap), "flee");
});

test("critical health eats if food exists, otherwise flees", () => {
  assert.equal(reflex(emptySnapshot({ health: 3, hasFood: true })), "eat");
  assert.equal(reflex(emptySnapshot({ health: 3, hasFood: false })), "flee");
});

test("low-confidence Jev answers wait", () => {
  const snap = emptySnapshot({ treeNearby: true });
  const legal = legalActions(snap, { stage: 0 });
  const g = gate({ choice: "punch_tree", confidence: 0.2, safe: true }, legal, snap);
  assert.equal(g.action, "wait");
  assert.equal(g.reason, "low_confidence");
});

test("illegal Jev choice is discarded", () => {
  const legal = legalActions(emptySnapshot(), { stage: 0 });
  const g = gate({ choice: "bed_explode", confidence: 0.99, safe: true }, legal, emptySnapshot());
  assert.equal(g.reason, "illegal_action");
  assert.equal(g.action, "wait");
});

test("unsafe noul routes to flee when a hazard is present", () => {
  const snap = emptySnapshot({ hazard: "lava", lavaAdjacent: false, hostiles: [] });
  const legal = legalActions(snap, { stage: 2 });
  const g = gate({ choice: "mine_block", confidence: 0.9, safe: false }, legal, snap);
  assert.equal(g.reason, "jev_unsafe");
});
