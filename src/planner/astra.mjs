import { ENDPOINTS, MODELS, PLAN, TICK } from "../config.mjs";
import { compactState } from "../observe/snapshot.mjs";
import { parsePlannerJson } from "./schema.mjs";

/**
 * GPT-6 Astra - the slow mind.
 * Returns a structured plan. Never moves the player.
 * Skills it names must already exist in src/skills or be proposed as new modules.
 */
export const SYSTEM_PROMPT = `You are Astra, the planner inside MineLog (https://minelog.xyz).
Jev is a separate System One model that picks one bounded Minecraft action per tick.
You do not press keys. You set the current stage, goal, steps, waypoint and item targets.

Campaign stages (index them from 0):
${PLAN.map((p, i) => `${i}. ${p}`).join("\n")}

Reply with a single JSON object, no markdown:
{
  "stage": 0,
  "goal": "short goal matching the stage",
  "steps": ["atomic step", "..."],
  "step": 0,
  "waypoint": {"x": 0, "y": 64, "z": 0, "dim": "overworld"} | null,
  "targets": ["oak_log"],
  "note": "one sentence for the on-stream HUD",
  "skills": ["punch_tree"]
}

Rules:
- Keep stage monotonic unless the body died and lost the items that stage needed.
- Waypoints must be reachable with vanilla movement.
- After a failure, name a skill the harness should lean on. Do not invent game cheats.
- Deaths are part of the run. Plan the recovery, then resume.`;

export function createAstra({
  fetchImpl = fetch,
  apiKey,
  openRouterKey,
  model = MODELS.planner,
  timeoutMs = TICK.plannerTimeoutMs,
} = {}) {
  return {
    async plan(snapshot, current, failures = []) {
      const key = apiKey || openRouterKey;
      if (!key) throw new Error("OPENAI_API_KEY or OPENROUTER_API_KEY is missing");
      const useOpenRouter = !apiKey && Boolean(openRouterKey);
      const url = useOpenRouter ? ENDPOINTS.openRouterChat : ENDPOINTS.openaiChat;
      const modelId = useOpenRouter ? MODELS.plannerOpenRouter : model;
      const payload = {
        model: modelId,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              snapshot: compactState(snapshot, current),
              current_plan: current,
              recent_failures: failures.slice(-8),
            }),
          },
        ],
      };
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetchImpl(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://minelog.xyz",
            "X-Title": "MineLog",
          },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Astra HTTP ${res.status} ${text.slice(0, 200)}`);
        }
        const json = await res.json();
        const text = json.choices?.[0]?.message?.content || "";
        const parsed = parsePlannerJson(text);
        if (!parsed.ok) throw new Error(`Astra plan invalid: ${parsed.error}`);
        return parsed.plan;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
