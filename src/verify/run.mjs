/**
 * A MineLog run is done when the dragon is dead and the body used the exit portal.
 * Deaths during the campaign do not fail the run - they are on the stream on purpose.
 */
export function verifyRun(events) {
  const kinds = events.map((e) => e.kind || e.event || e.type);
  const dragonDead = kinds.includes("dragon_dead") || events.some((e) => e.kind === "dragon_dead" || e.dragonHealth === 0);
  const exit = kinds.includes("exit_portal") || events.some((e) => e.kind === "exit_portal");
  const started = kinds.includes("run_start") || events.length > 0;
  const errors = [];
  if (!started) errors.push("no events");
  if (!dragonDead) errors.push("no dragon_dead evidence");
  if (!exit) errors.push("no exit_portal evidence");
  return {
    ok: errors.length === 0,
    dragonDead,
    exit,
    deaths: events.filter((e) => e.kind === "death").length,
    errors,
  };
}

export function summarize(events, plan) {
  const jev = events.filter((e) => e.kind === "JEV" || e.source === "jev").length;
  return {
    stage: plan?.stage ?? 0,
    goal: plan?.goal,
    jevDecisions: jev,
    deaths: events.filter((e) => e.kind === "death").length,
  };
}
