import { ENDPOINTS, MODELS, TICK } from "../config.mjs";
import { compactState } from "../observe/snapshot.mjs";
import { criteriaFor } from "./actions.mjs";

/**
 * Jev — TypeSafe System One.
 * One call, three questions in parallel: which action, is it safe, how urgent.
 * No prose. Typed answers the loop can branch on.
 *
 * Official API: POST https://api.typesafe.ai/v1/systemone
 * Docs: https://docs.typesafe.ai/introduction
 */
export function createJev({ fetchImpl = fetch, apiKey, model = MODELS.jev, timeoutMs = TICK.jevTimeoutMs } = {}) {
  return {
    async decide(snapshot, plan, legal) {
      if (!legal?.length) {
        return { choice: "wait", confidence: 1, safe: true, urgency: 0, source: "empty" };
      }
      if (legal.length === 1) {
        return { choice: legal[0].id, confidence: 1, safe: true, urgency: 1, source: "single" };
      }
      if (!apiKey) {
        throw new Error("TYPESAFE_API_KEY is missing");
      }
      const body = {
        model,
        state: compactState(snapshot, plan),
        questions: {
          action: {
            type: "choice",
            instructions: "Which single bounded action should the Minecraft player take this tick? Pick the option that best advances `plan.goal` without ignoring `hazard`.",
            criteria: criteriaFor(legal),
          },
          safe: {
            type: "noul",
            instructions: "Is the action you would pick safe right now given `hazard`, `body.hp`, lava, drowning and nearby hostiles?",
          },
          urgency: {
            type: "score",
            instructions: "How urgently must the player act this tick?",
            criteria: [
              "Can wait. Standing still loses nothing.",
              "Should act. Progress or a mild threat.",
              "Must act now. Hazard, combat, or a closing window.",
            ],
          },
        },
      };
      const answers = await postSystemOne(fetchImpl, apiKey, body, timeoutMs);
      return readDecision(answers, legal);
    },
  };
}

export function readDecision(answers, legal) {
  const ids = new Set((legal || []).map((a) => a.id));
  const action = answers?.action;
  let choice = action?.choice;
  if (!ids.has(choice)) choice = legal?.[0]?.id || "wait";
  const confidence = clamp01(action?.confidence ?? action?.probabilities?.[choice] ?? 0);
  const safe = (answers?.safe?.noul ?? 1) >= 0.5;
  const urgency = Number(answers?.urgency?.score ?? 1);
  return { choice, confidence, safe, urgency, source: "jev", raw: answers };
}

async function postSystemOne(fetchImpl, apiKey, body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(ENDPOINTS.typesafe, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Jev HTTP ${res.status} ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    return json.answers || json;
  } finally {
    clearTimeout(timer);
  }
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}
