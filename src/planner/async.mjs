/**
 * Astra is slower than a game tick. Planning must not stall Jev.
 * Refresh in the background; discard a result if the stage moved while it was in flight.
 */
export function asyncPlanner({ getState, plan, onPlan, log = () => {}, intervalMs = 12_000, now = Date.now }) {
  let pending = null;
  let lastStage = null;
  let lastStarted = -Infinity;
  let closed = false;

  function refresh(force = false) {
    if (closed || pending) return pending;
    const state = getState();
    const at = now();
    if (!force && state.stage === lastStage && at - lastStarted < intervalMs) return null;
    lastStarted = at;
    lastStage = state.stage;
    log("planner_request", { stage: state.stage, step: state.step });
    pending = Promise.resolve()
      .then(() => plan(state.snapshot, state.plan, state.failures))
      .then((result) => {
        if (closed) return;
        const live = getState();
        if (live.stage !== state.stage) {
          log("plan_discarded", { reason: "stage_changed", from: state.stage, to: live.stage });
          lastStarted = -Infinity;
          return;
        }
        onPlan(result);
        log("planner_ready", { stage: result.stage, wallMs: now() - at });
        return result;
      })
      .catch((error) => {
        log("plan_error", { error: error.message });
        lastStarted = now() - intervalMs + 3000;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  }

  return {
    refresh,
    close() {
      closed = true;
    },
    get pending() {
      return pending;
    },
  };
}
