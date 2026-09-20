import { test } from "node:test";
import assert from "node:assert/strict";
import { createAstra, SYSTEM_PROMPT } from "../src/planner/astra.mjs";
import { emptySnapshot } from "../src/observe/snapshot.mjs";
import { emptyPlan } from "../src/planner/schema.mjs";

test("system prompt names MineLog and the eight stages", () => {
  assert.match(SYSTEM_PROMPT, /minelog\.xyz/);
  assert.match(SYSTEM_PROMPT, /Defeat the Ender Dragon/);
  assert.match(SYSTEM_PROMPT, /You do not press keys/);
});

test("Astra client posts JSON-mode chat completions", async () => {
  let posted;
  const astra = createAstra({
    apiKey: "sk-test",
    timeoutMs: 1000,
    fetchImpl: async (url, init) => {
      posted = { url, init };
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ stage: 1, goal: "Food, bed & first iron", steps: ["Hunt"], step: 0 }) } }],
        }),
      };
    },
  });
  const plan = await astra.plan(emptySnapshot(), emptyPlan(), []);
  assert.equal(plan.stage, 1);
  assert.equal(posted.url, "https://api.openai.com/v1/chat/completions");
  const body = JSON.parse(posted.init.body);
  assert.equal(body.model, "gpt-6-astra");
  assert.equal(body.response_format.type, "json_object");
});
