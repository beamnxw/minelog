import { test } from "node:test";
import assert from "node:assert/strict";
import { emptySnapshot, compactState } from "../src/observe/snapshot.mjs";

test("compact state is what Jev sees — nested JSON, no screenshots", () => {
  const snap = emptySnapshot({
    health: 17,
    hostiles: [{ type: "creeper", dist: 6 }],
    inventory: { oak_log: 3 },
    treeNearby: true,
  });
  const state = compactState(snap, { stage: 0, goal: "Wood", step: 0, steps: ["Punch a tree"], targets: ["oak_log"] });
  assert.equal(state.body.hp, 17);
  assert.equal(state.nearby.tree, true);
  assert.equal(state.plan.stage, 0);
  assert.equal(state.hostiles[0].type, "creeper");
  assert.equal(state.inventory.oak_log, 3);
});
