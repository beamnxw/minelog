import { test } from "node:test";
import assert from "node:assert/strict";
import { createLoop } from "../src/loop.mjs";
import { createLog } from "../src/bus/log.mjs";
import { emptySnapshot } from "../src/observe/snapshot.mjs";
import { emptyPlan } from "../src/planner/schema.mjs";

function harness({ snap, decide, execute, plan } = {}) {
  let ms = 0;
  const clock = { now: () => ms };
  const lines = [];
  const log = createLog({ clock, write: (l) => lines.push(l) });
  const executed = [];
  const loop = createLoop({
    clock,
    log,
    plan: plan || emptyPlan(),
    observe: async () => snap || emptySnapshot({ treeNearby: true }),
    jev: {
      decide: decide || (async (_s, _p, legal) => ({
        choice: legal.find((a) => a.id === "punch_tree")?.id || "wait",
        confidence: 0.9,
        safe: true,
        urgency: 1,
      })),
    },
    astra: { plan: async () => emptyPlan() },
    execute: execute || (async (action) => {
      executed.push(action);
      return { ok: true };
    }),
  });
  return { loop, lines, executed, advance: (n) => { ms += n; } };
}

test("Jev path executes a legal action and writes OBS + JEV + RESULT", async () => {
  const { loop, lines, executed } = harness();
  const out = await loop.tick();
  loop.close();
  assert.equal(out.kind, "jev");
  assert.equal(out.action, "punch_tree");
  assert.deepEqual(executed, ["punch_tree"]);
  const text = lines.join("\n");
  assert.match(text, /OBS /);
  assert.match(text, /JEV /);
  assert.match(text, /RESULT /);
  assert.match(text, /ASTRA \+ JEV/);
});

test("reflex short-circuits Jev on lava", async () => {
  let jevCalls = 0;
  const { loop, executed } = harness({
    snap: emptySnapshot({ lavaAdjacent: true }),
    decide: async () => {
      jevCalls += 1;
      return { choice: "mine_block", confidence: 0.99, safe: true };
    },
  });
  const out = await loop.tick();
  loop.close();
  assert.equal(out.kind, "reflex");
  assert.equal(out.action, "flee");
  assert.equal(jevCalls, 0);
  assert.deepEqual(executed, ["flee"]);
});

test("death emits EVENT and RECOVERY, then recover reflex", async () => {
  const { loop, lines } = harness({
    snap: emptySnapshot({ justDied: true, lootAtDeath: true }),
  });
  const out = await loop.tick();
  loop.close();
  assert.equal(out.kind, "reflex");
  assert.equal(out.action, "recover");
  const text = lines.join("\n");
  assert.match(text, /EVENT .*kind=death/);
  assert.match(text, /RECOVERY /);
});
