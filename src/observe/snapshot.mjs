/** Turn a Mineflayer bot (or a dry-run stub) into the JSON Jev and Astra both read. */

const FOOD = new Set([
  "cooked_beef", "cooked_porkchop", "cooked_chicken", "cooked_mutton",
  "bread", "apple", "golden_apple", "carrot", "potato", "baked_potato",
]);

export function snapshotFromBot(bot) {
  if (!bot) return emptySnapshot();
  const pos = bot.entity?.position;
  const inv = inventoryCounts(bot);
  const hostiles = nearbyEntities(bot, isHostile, 16);
  const drops = nearbyEntities(bot, (e) => e.name === "item" || e.type === "object", 8);
  const hazard = detectHazard(bot, hostiles);
  return {
    t: Date.now(),
    dimension: bot.game?.dimension || "overworld",
    pos: pos ? { x: pos.x, y: pos.y, z: pos.z } : { x: 0, y: 0, z: 0 },
    yaw: bot.entity?.yaw ?? 0,
    pitch: bot.entity?.pitch ?? 0,
    health: bot.health ?? 20,
    food: bot.food ?? 20,
    air: bot.oxygenLevel ?? 300,
    xp: bot.experience?.level ?? 0,
    biome: bot.blockAt(pos)?.biome?.name || "unknown",
    light: bot.blockAt(pos)?.skyLight ?? bot.blockAt(pos)?.light ?? 15,
    time: bot.time?.timeOfDay ?? 0,
    isNight: isNight(bot.time?.timeOfDay),
    inventory: inv,
    hasFood: Object.keys(inv).some((k) => FOOD.has(k) && inv[k] > 0),
    held: bot.heldItem?.name || null,
    hostiles,
    drops,
    hazard,
    onFire: Boolean(bot.entity?.onFire),
    lavaAdjacent: isLavaAdjacent(bot),
    voidBelow: Boolean(pos && pos.y < 2 && bot.game?.dimension === "the_end"),
    treeNearby: Boolean(nearestBlock(bot, isLog, 8)),
    furnaceNearby: Boolean(nearestBlock(bot, (b) => b.name === "furnace", 4)),
    bedNearby: Boolean(nearestBlock(bot, (b) => b.name.endsWith("bed"), 4)),
    portalNearby: Boolean(nearestBlock(bot, (b) => b.name.includes("portal"), 4)),
    waterAhead: Boolean(nearestBlock(bot, (b) => b.name === "water", 3)),
    canCraft: Boolean(inv.crafting_table || nearestBlock(bot, (b) => b.name === "crafting_table", 4)),
    inEnd: (bot.game?.dimension || "").includes("end"),
    inNether: (bot.game?.dimension || "").includes("nether"),
    justDied: false,
    poi: null,
  };
}

export function emptySnapshot(overrides = {}) {
  return {
    t: 0,
    dimension: "overworld",
    pos: { x: 0, y: 64, z: 0 },
    yaw: 0,
    pitch: 0,
    health: 20,
    food: 20,
    air: 300,
    xp: 0,
    biome: "plains",
    light: 15,
    time: 1000,
    isNight: false,
    inventory: {},
    hasFood: false,
    held: null,
    hostiles: [],
    drops: [],
    hazard: null,
    onFire: false,
    lavaAdjacent: false,
    voidBelow: false,
    treeNearby: false,
    furnaceNearby: false,
    bedNearby: false,
    portalNearby: false,
    waterAhead: false,
    canCraft: false,
    inEnd: false,
    inNether: false,
    justDied: false,
    poi: null,
    ...overrides,
  };
}

export function compactState(snapshot, plan) {
  return {
    body: {
      dim: snapshot.dimension,
      pos: snapshot.pos,
      hp: snapshot.health,
      hunger: snapshot.food,
      air: snapshot.air,
      light: snapshot.light,
      night: snapshot.isNight,
      held: snapshot.held,
    },
    inventory: snapshot.inventory,
    hostiles: snapshot.hostiles,
    drops: snapshot.drops,
    hazard: snapshot.hazard,
    nearby: {
      tree: snapshot.treeNearby,
      furnace: snapshot.furnaceNearby,
      bed: snapshot.bedNearby,
      portal: snapshot.portalNearby,
      water: snapshot.waterAhead,
    },
    plan: plan
      ? {
          stage: plan.stage,
          goal: plan.goal,
          step: plan.step,
          steps: plan.steps,
          waypoint: plan.waypoint,
          targets: plan.targets,
        }
      : null,
  };
}

function inventoryCounts(bot) {
  const items = bot.inventory?.items?.() || [];
  const out = {};
  for (const it of items) {
    const name = it.name || it.type;
    if (!name) continue;
    out[name] = (out[name] || 0) + (it.count || 1);
  }
  return out;
}

function nearbyEntities(bot, pred, range) {
  const origin = bot.entity?.position;
  if (!origin || !bot.entities) return [];
  const out = [];
  for (const e of Object.values(bot.entities)) {
    if (!e || e === bot.entity || !pred(e)) continue;
    const d = origin.distanceTo(e.position);
    if (d > range) continue;
    out.push({ type: e.name || e.displayName || e.kind || "entity", dist: Math.round(d * 10) / 10 });
  }
  out.sort((a, b) => a.dist - b.dist);
  return out.slice(0, 8);
}

function isHostile(e) {
  const n = (e.name || e.mobType || "").toLowerCase();
  return [
    "zombie", "skeleton", "creeper", "spider", "enderman", "blaze",
    "witch", "phantom", "drowned", "piglin", "ghast", "wither_skeleton",
    "ender_dragon", "endermite",
  ].some((h) => n.includes(h));
}

function detectHazard(bot, hostiles) {
  if (bot.entity?.onFire) return "fire";
  if (isLavaAdjacent(bot)) return "lava";
  if ((bot.oxygenLevel ?? 300) < 60) return "drown";
  const close = hostiles.find((h) => h.dist <= 5);
  if (close) return close.type;
  return null;
}

function isLavaAdjacent(bot) {
  const pos = bot.entity?.position;
  if (!pos || !bot.blockAt) return false;
  for (const d of [[0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
    const b = bot.blockAt(pos.offset?.(d[0], d[1], d[2]) ?? { x: pos.x + d[0], y: pos.y + d[1], z: pos.z + d[2] });
    if (b && (b.name === "lava" || b.name === "flowing_lava")) return true;
  }
  return false;
}

function nearestBlock(bot, pred, range) {
  if (!bot.findBlock) return null;
  try {
    return bot.findBlock({ matching: pred, maxDistance: range });
  } catch {
    return null;
  }
}

function isLog(b) {
  return Boolean(b?.name && b.name.endsWith("_log"));
}

function isNight(timeOfDay) {
  if (timeOfDay == null) return false;
  return timeOfDay > 13000 && timeOfDay < 23000;
}
