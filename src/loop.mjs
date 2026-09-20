import { TICK } from "./config.mjs";
import { legalActions } from "./controller/actions.mjs";
import { gate, reflex, describeAction } from "./controller/policy.mjs";
import { asyncPlanner } from "./planner/async.mjs";
import { emptyPlan } from "./planner/schema.mjs";

/**
 * One body, two minds.
 *
 * 1. Observe
 * 2. Reflex in code (lava, drown, creeper, death) — no model
 * 3. Kick Astra if the plan is stale — never wait for it
 * 4. Jev picks one legal action
 * 5. Gate on confidence / legality / safety
 * 6. Execute through the vanilla protocol
 * 7. Write the minelog.xyz runtime.log
 */
export function createLoop(ctx) {
  let plan = ctx.plan || emptyPlan();
  const failures = [];
  const planner = asyncPlanner({
    intervalMs: ctx.plannerIntervalMs ?? TICK.plannerIntervalMs,
    now: () => (ctx.clock ? ctx.clock.now() : Date.now()),
    getState: () => ({ stage: plan.stage, step: plan.step, plan, snapshot: ctx.lastSnap, failures }),
    plan: (snap, current, fail) => ctx.astra.plan(snap, current, fail),
    onPlan: (next) => {
      plan = next;
      ctx.log.setAstra(next.note);
      ctx.log.setPhase(phaseName(next));
      ctx.log.state(next);
    },
    log: (kind, extra) => ctx.log.event(kind, extra),
  });

  async function tick() {
    const t0 = ctx.clock ? ctx.clock.now() : Date.now();
    const snap = await ctx.observe();
    ctx.lastSnap = snap;
    ctx.log.obs(snap);

    if (snap.justDied) {
      ctx.log.event("death", { hp: 0 });
      ctx.log.recovery("Walk back. Pick up gear. Do not store critical items in an unguarded chest.");
    }

    const forced = reflex(snap);
    if (forced) {
      ctx.log.setJev(describeAction(forced));
      ctx.log.setDispatch(forced);
      ctx.log.headerIfNeeded();
      const result = await ctx.execute(forced, snap, plan);
      ctx.log.result(forced, result);
      remember(forced, result, snap);
      ctx.log.perf((ctx.clock ? ctx.clock.now() : Date.now()) - t0, { path: "reflex" });
      return { kind: "reflex", action: forced, result, snap, plan };
    }

    planner.refresh(false);

    const legal = legalActions(snap, plan);
    let decision;
    try {
      decision = await ctx.jev.decide(snap, plan, legal);
    } catch (err) {
      decision = { choice: "wait", confidence: 0, safe: true, urgency: 0, source: "error", error: err.message };
      ctx.log.event("jev_error", { error: err.message });
    }
    const gated = gate(decision, legal, snap);
    ctx.log.setJev(describeAction(gated.action));
    ctx.log.setDispatch(gated.action);
    ctx.log.headerIfNeeded();
    ctx.log.jev(decision, gated);

    const result = await ctx.execute(gated.action, snap, plan);
    ctx.log.result(gated.action, result);
    remember(gated.action, result, snap);
    ctx.log.perf((ctx.clock ? ctx.clock.now() : Date.now()) - t0, { path: "jev", conf: gated.confidence });
    return { kind: "jev", action: gated.action, decision, gated, result, snap, plan };
  }

  function remember(action, result, snap) {
    if (result?.ok) return;
    failures.push({
      action,
      reason: result?.reason || "failed",
      hp: snap.health,
      stage: plan.stage,
    });
    if (failures.length > 32) failures.splice(0, failures.length - 32);
  }

  return {
    tick,
    get plan() {
      return plan;
    },
    setPlan(next) {
      plan = next;
    },
    close() {
      planner.close();
    },
  };
}

function phaseName(plan) {
  const step = plan.steps?.[plan.step];
  if (step) return String(step).toUpperCase();
  return String(plan.goal || "WORLD INIT").toUpperCase();
}
