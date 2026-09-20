import { POLICY } from "../config.mjs";
import { ACTIONS } from "./actions.mjs";

/**
 * Code owns control flow. Jev is a judgment, not the driver.
 * Reflexes fire before any model call. Gates fire after Jev answers.
 */
export function reflex(snapshot, policy = POLICY) {
  if (!snapshot) return null;
  if (snapshot.dimension === "the_end" && snapshot.voidBelow) return ACTIONS.flee.id;
  if (snapshot.onFire || snapshot.lavaAdjacent) return ACTIONS.flee.id;
  if (snapshot.air != null && snapshot.air < 60) return ACTIONS.flee.id;
  if (snapshot.health != null && snapshot.health <= policy.healthFlee) {
    if (snapshot.hasFood) return ACTIONS.eat.id;
    return ACTIONS.flee.id;
  }
  const creeper = (snapshot.hostiles || []).find((h) => h.type === "creeper" && h.dist <= policy.creeperFleeBlocks);
  if (creeper) return ACTIONS.flee.id;
  if (snapshot.justDied) return ACTIONS.recover.id;
  if (snapshot.food != null && snapshot.food <= policy.hungerEat && snapshot.hasFood) return ACTIONS.eat.id;
  return null;
}

export function gate(decision, legal, snapshot, policy = POLICY) {
  const ids = new Set((legal || []).map((a) => a.id || a));
  const fallback = ids.has("wait") ? "wait" : [...ids][0] || "wait";
  if (!decision || !decision.choice) {
    return { action: fallback, reason: "no_choice", confidence: 0 };
  }
  if (!ids.has(decision.choice)) {
    return { action: fallback, reason: "illegal_action", confidence: decision.confidence ?? 0 };
  }
  if (decision.safe === false) {
    return { action: ids.has("flee") && snapshot?.hazard ? "flee" : fallback, reason: "jev_unsafe", confidence: decision.confidence ?? 0 };
  }
  if ((decision.confidence ?? 0) < policy.minConfidence) {
    return { action: fallback, reason: "low_confidence", confidence: decision.confidence ?? 0 };
  }
  return { action: decision.choice, reason: "ok", confidence: decision.confidence };
}

export function describeAction(id) {
  return ACTIONS[id]?.label || id;
}
