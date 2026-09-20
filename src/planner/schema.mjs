import { PLAN } from "../config.mjs";

export const emptyPlan = () => ({
  stage: 0,
  goal: PLAN[0],
  steps: ["Punch a tree", "Craft a crafting table", "Make wooden tools", "Find stone"],
  step: 0,
  waypoint: null,
  targets: ["oak_log", "birch_log", "crafting_table"],
  note: "New world loading. Establish surroundings and locate basic resources.",
  skills: [],
});

export function validatePlan(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, error: "plan is not an object" };
  const stage = clampInt(raw.stage, 0, PLAN.length - 1, 0);
  const steps = Array.isArray(raw.steps)
    ? raw.steps.map((s) => String(s).slice(0, 120)).filter(Boolean).slice(0, 12)
    : emptyPlan().steps;
  const step = clampInt(raw.step, 0, Math.max(0, steps.length - 1), 0);
  const waypoint = parseWaypoint(raw.waypoint);
  const targets = Array.isArray(raw.targets)
    ? raw.targets.map((t) => String(t).slice(0, 64)).filter(Boolean).slice(0, 16)
    : [];
  const skills = Array.isArray(raw.skills)
    ? raw.skills.map((s) => String(s).slice(0, 64)).filter(Boolean).slice(0, 24)
    : [];
  return {
    ok: true,
    plan: {
      stage,
      goal: String(raw.goal || PLAN[stage]).slice(0, 160),
      steps,
      step,
      waypoint,
      targets,
      note: String(raw.note || raw.goal || PLAN[stage]).slice(0, 280),
      skills,
    },
  };
}

export function parsePlannerJson(text) {
  if (!text || typeof text !== "string") return { ok: false, error: "empty planner text" };
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return { ok: false, error: "no JSON object in planner output" };
  try {
    return validatePlan(JSON.parse(body.slice(start, end + 1)));
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function clampInt(v, lo, hi, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function parseWaypoint(w) {
  if (!w || typeof w !== "object") return null;
  const x = Number(w.x);
  const y = Number(w.y);
  const z = Number(w.z);
  if (![x, y, z].every(Number.isFinite)) return null;
  const dim = String(w.dim || w.dimension || "overworld").toLowerCase();
  return { x, y, z, dim };
}
