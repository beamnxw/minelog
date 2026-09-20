#!/usr/bin/env node
import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { env, PLAN } from "./config.mjs";
import { createClock } from "./bus/clock.mjs";
import { createLog } from "./bus/log.mjs";
import { createLoop } from "./loop.mjs";
import { createJev } from "./controller/jev.mjs";
import { createAstra } from "./planner/astra.mjs";
import { emptyPlan } from "./planner/schema.mjs";
import { emptySnapshot } from "./observe/snapshot.mjs";

const dry = process.argv.includes("--dry-run");

async function main() {
  const cfg = env();
  const dir = join(cfg.runDir, cfg.runId);
  await mkdir(dir, { recursive: true });
  const logPath = join(dir, "runtime.log");

  const clock = createClock();
  const buffered = [];
  const log = createLog({
    clock,
    phase: "WORLD INIT",
    write: (line) => {
      buffered.push(line);
      process.stdout.write(line + "\n");
    },
  });
  log.event("run_start", { run: cfg.runId, dry: dry ? "true" : "false" });

  const astra = dry
    ? stubAstra()
    : createAstra({ apiKey: cfg.openaiKey, openRouterKey: cfg.openRouterKey });
  const jev = dry ? stubJev() : createJev({ apiKey: cfg.typesafeKey });

  let observe;
  let execute;
  let closeBody = async () => {};

  if (dry) {
    const world = createDryWorld();
    observe = async () => world.snap();
    execute = async (action) => world.apply(action);
  } else {
    const { connectBot } = await import("./protocol/bot.mjs");
    const body = await connectBot();
    observe = body.observe;
    execute = body.execute;
    closeBody = async () => body.bot.end();
  }

  const loop = createLoop({ clock, log, astra, jev, observe, execute, plan: emptyPlan() });

  const stop = join(dir, "stop");
  const ticks = dry ? 8 : Number.POSITIVE_INFINITY;
  for (let i = 0; i < ticks; i++) {
    if (await fileExists(stop)) {
      log.event("stop", { at: i });
      break;
    }
    await loop.tick();
    if (!dry) await sleep(250);
  }

  loop.close();
  await closeBody();
  log.event("run_end", { stages: PLAN.length });
  await writeFile(logPath, buffered.join("\n") + "\n", "utf8");
}

function stubJev() {
  return {
    async decide(_snap, _plan, legal) {
      const pick = legal.find((a) => a.id === "punch_tree") || legal.find((a) => a.id === "craft") || legal[0];
      return { choice: pick.id, confidence: 0.8, safe: true, urgency: 1, source: "dry" };
    },
  };
}

function stubAstra() {
  return {
    async plan() {
      return emptyPlan();
    },
  };
}

function createDryWorld() {
  let snap = emptySnapshot({ treeNearby: true, canCraft: true });
  return {
    snap: () => ({ ...snap, inventory: { ...snap.inventory } }),
    apply(action) {
      if (action === "punch_tree") {
        const logs = (snap.inventory.oak_log || 0) + 1;
        snap = {
          ...snap,
          inventory: { ...snap.inventory, oak_log: logs },
          treeNearby: logs < 4,
        };
        return { ok: true };
      }
      if (action === "craft") {
        const logs = snap.inventory.oak_log || 0;
        if (logs < 1) return { ok: false, reason: "no_logs" };
        snap = {
          ...snap,
          inventory: { ...snap.inventory, oak_log: logs - 1, oak_planks: (snap.inventory.oak_planks || 0) + 4 },
        };
        return { ok: true };
      }
      return { ok: true, reason: "dry" };
    },
  };
}

function fileExists(path) {
  return access(path).then(() => true, () => false);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
