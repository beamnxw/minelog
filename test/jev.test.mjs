import { test } from "node:test";
import assert from "node:assert/strict";
import { readDecision, createJev } from "../src/controller/jev.mjs";
import { legalActions } from "../src/controller/actions.mjs";
import { emptySnapshot } from "../src/observe/snapshot.mjs";

test("readDecision maps System One answers onto a legal id", () => {
  const legal = legalActions(emptySnapshot({ treeNearby: true }), { stage: 0 });
  const d = readDecision({
    action: { choice: "punch_tree", confidence: 0.88, probabilities: { punch_tree: 0.88, wait: 0.12 } },
    safe: { noul: 0.96 },
    urgency: { score: 1 },
  }, legal);
  assert.equal(d.choice, "punch_tree");
  assert.equal(d.safe, true);
  assert.ok(d.confidence > 0.8);
});

test("unknown Jev choice falls back to the first legal action", () => {
  const legal = [{ id: "wait" }, { id: "look" }];
  const d = readDecision({ action: { choice: "fly", confidence: 1 }, safe: { noul: 1 } }, legal);
  assert.equal(d.choice, "wait");
});

test("createJev posts to TypeSafe System One with three questions", async () => {
  let posted;
  const jev = createJev({
    apiKey: "test-key",
    timeoutMs: 1000,
    fetchImpl: async (url, init) => {
      posted = { url, init };
      return {
        ok: true,
        json: async () => ({
          answers: {
            action: { choice: "wait", confidence: 0.7 },
            safe: { noul: 1 },
            urgency: { score: 0 },
          },
        }),
      };
    },
  });
  const legal = legalActions(emptySnapshot(), { stage: 0 });
  const d = await jev.decide(emptySnapshot(), { stage: 0, goal: "Wood" }, legal);
  assert.equal(d.choice, "wait");
  assert.equal(posted.url, "https://api.typesafe.ai/v1/systemone");
  const body = JSON.parse(posted.init.body);
  assert.equal(body.questions.action.type, "choice");
  assert.equal(body.questions.safe.type, "noul");
  assert.equal(body.questions.urgency.type, "score");
  assert.match(posted.init.headers.Authorization, /Bearer test-key/);
});
