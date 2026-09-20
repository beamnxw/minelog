import { env } from "../config.mjs";
import { snapshotFromBot } from "../observe/snapshot.mjs";
import { createCamera } from "./camera.mjs";

/**
 * Vanilla body. Mineflayer talks the ordinary player protocol.
 * No operator packets. No inventory grants. No game-rule edits.
 */
export async function connectBot(options = {}) {
  const cfg = { ...env().mc, ...options };
  const { default: mineflayer } = await import("mineflayer");
  const bot = mineflayer.createBot({
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    auth: cfg.auth === "microsoft" ? "microsoft" : "offline",
    version: cfg.version,
    hideErrors: false,
  });
  await once(bot, "spawn");
  try {
    const { pathfinder, Movements, goals } = await import("mineflayer-pathfinder");
    bot.loadPlugin(pathfinder);
    bot.pathfinder.setMovements(new Movements(bot));
    bot._minelogGoals = goals;
  } catch (err) {
    bot.emit("minelog:warn", `pathfinder unavailable: ${err.message}`);
  }
  const camera = createCamera();
  return { bot, camera, observe: () => snapshotFromBot(bot), execute: (action, snap, plan) => execute(bot, action, snap, plan) };
}

export async function execute(bot, action, snap, plan) {
  try {
    switch (action) {
      case "wait":
        await sleep(200);
        return { ok: true };
      case "look":
        await bot.look(bot.entity.yaw + 0.4, bot.entity.pitch, true);
        return { ok: true };
      case "walk_to":
        return walkTo(bot, plan?.waypoint || snap?.poi);
      case "punch_tree":
      case "mine_block":
        return mineNearest(bot, action === "punch_tree" ? (b) => b.name.endsWith("_log") : null);
      case "collect_drop":
        return walkTo(bot, nearestDrop(bot));
      case "eat":
        return eat(bot);
      case "flee":
        bot.setControlState("sprint", true);
        bot.setControlState("jump", true);
        bot.setControlState("back", true);
        await sleep(400);
        bot.clearControlStates();
        return { ok: true };
      case "fight":
        return fight(bot);
      case "use_portal":
        await sleep(1200);
        return { ok: true, reason: "standing" };
      default:
        await sleep(150);
        return { ok: true, reason: "stub" };
    }
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

async function walkTo(bot, dest) {
  if (!dest) return { ok: false, reason: "no_waypoint" };
  const goals = bot._minelogGoals;
  if (!bot.pathfinder || !goals) return { ok: false, reason: "no_pathfinder" };
  await bot.pathfinder.goto(new goals.GoalNear(dest.x, dest.y, dest.z, 2));
  return { ok: true };
}

async function mineNearest(bot, pred) {
  const block = bot.findBlock({
    matching: pred || ((b) => Boolean(b && b.digTime && b.digTime(bot.heldItem) < Infinity)),
    maxDistance: 5,
  });
  if (!block) return { ok: false, reason: "no_block" };
  await bot.dig(block);
  return { ok: true };
}

async function eat(bot) {
  const food = bot.inventory.items().find((it) => it.name.includes("cooked") || it.name === "bread" || it.name === "apple");
  if (!food) return { ok: false, reason: "no_food" };
  await bot.equip(food, "hand");
  await bot.consume();
  return { ok: true };
}

async function fight(bot) {
  const mob = Object.values(bot.entities).find((e) => e !== bot.entity && e.kind !== "player" && e.position && bot.entity.position.distanceTo(e.position) < 5);
  if (!mob) return { ok: false, reason: "no_target" };
  await bot.attack(mob);
  return { ok: true };
}

function nearestDrop(bot) {
  const origin = bot.entity?.position;
  let best = null;
  let bestD = Infinity;
  for (const e of Object.values(bot.entities || {})) {
    if (!e?.position || (e.name !== "item" && e.type !== "object")) continue;
    const d = origin.distanceTo(e.position);
    if (d < bestD) {
      bestD = d;
      best = e.position;
    }
  }
  return best;
}

function once(ee, event) {
  return new Promise((resolve, reject) => {
    const ok = (v) => { cleanup(); resolve(v); };
    const err = (e) => { cleanup(); reject(e); };
    const cleanup = () => {
      ee.off(event, ok);
      ee.off("error", err);
      ee.off("end", onEnd);
    };
    const onEnd = () => err(new Error("bot ended before spawn"));
    ee.on(event, ok);
    ee.on("error", err);
    ee.on("end", onEnd);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
