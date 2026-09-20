/**
 * Bounded action catalog. Jev picks one id. Code executes it.
 * Actions are small on purpose: System One is a judgment, not a planner.
 */
export const ACTIONS = {
  wait: { id: "wait", label: "Stand still for this tick", stages: "all" },
  look: { id: "look", label: "Turn to scan nearby blocks and entities", stages: "all" },
  walk_to: { id: "walk_to", label: "Pathfind toward the current waypoint or nearest target", stages: "all" },
  punch_tree: { id: "punch_tree", label: "Punch the nearest log until it breaks", stages: [0, 1] },
  mine_block: { id: "mine_block", label: "Mine one targeted block with the held tool", stages: "all" },
  collect_drop: { id: "collect_drop", label: "Walk to and pick up the nearest dropped item", stages: "all" },
  craft: { id: "craft", label: "Craft the next missing recipe from the plan targets", stages: "all" },
  place_block: { id: "place_block", label: "Place one held block at the planned spot", stages: "all" },
  open_container: { id: "open_container", label: "Open a chest, barrel or furnace in reach", stages: "all" },
  eat: { id: "eat", label: "Eat the best food in the hotbar", stages: "all" },
  sleep: { id: "sleep", label: "Place or use a bed to skip night", stages: "all" },
  fight: { id: "fight", label: "Melee the nearest hostile with sword or axe", stages: "all" },
  flee: { id: "flee", label: "Back off from lava, void, creeper or low health", stages: "all" },
  place_torch: { id: "place_torch", label: "Place a torch to light the current tile", stages: [2, 3, 4, 5, 6, 7] },
  smelt: { id: "smelt", label: "Load ore and fuel into a furnace", stages: [1, 2, 3] },
  boat: { id: "boat", label: "Place and ride a boat across water", stages: [1, 2] },
  use_portal: { id: "use_portal", label: "Stand in a Nether or End portal until the dimension changes", stages: [3, 4, 5, 6, 7] },
  throw_eye: { id: "throw_eye", label: "Throw an Eye of Ender and walk toward where it flies", stages: [6] },
  bed_explode: { id: "bed_explode", label: "Place and detonate one bed while the dragon perches", stages: [7] },
  recover: { id: "recover", label: "After death: walk back, pick up gear, resume the plan", stages: "all" },
};

export function allActionIds() {
  return Object.keys(ACTIONS);
}

export function legalActions(snapshot, plan) {
  const stage = plan?.stage ?? 0;
  const out = [];
  for (const action of Object.values(ACTIONS)) {
    if (action.stages !== "all" && !action.stages.includes(stage)) continue;
    if (!isAvailable(action.id, snapshot, plan)) continue;
    out.push(action);
  }
  if (!out.some((a) => a.id === "wait")) out.push(ACTIONS.wait);
  return out;
}

export function criteriaFor(actions) {
  const criteria = {};
  for (const a of actions) criteria[a.id] = a.label;
  return criteria;
}

function isAvailable(id, snap = {}, plan = {}) {
  const inv = snap.inventory || {};
  const count = (name) => Number(inv[name] || 0);
  const hostiles = snap.hostiles || [];
  const drops = snap.drops || [];
  switch (id) {
    case "eat":
      return snap.food != null && snap.food <= 16 && Boolean(snap.hasFood);
    case "sleep":
      return Boolean(snap.isNight) && (count("bed") > 0 || snap.bedNearby);
    case "fight":
      return hostiles.length > 0;
    case "flee":
      return Boolean(snap.hazard);
    case "collect_drop":
      return drops.length > 0;
    case "punch_tree":
      return Boolean(snap.treeNearby) && count("oak_log") + count("birch_log") + count("spruce_log") < 16;
    case "craft":
      return Boolean(snap.canCraft);
    case "smelt":
      return Boolean(snap.furnaceNearby) && (count("raw_iron") > 0 || count("raw_gold") > 0 || count("raw_porkchop") > 0);
    case "place_torch":
      return count("torch") > 0 && snap.light != null && snap.light < 8;
    case "boat":
      return count("oak_boat") > 0 || count("birch_boat") > 0 || Boolean(snap.waterAhead);
    case "use_portal":
      return Boolean(snap.portalNearby);
    case "throw_eye":
      return count("ender_eye") > 0;
    case "bed_explode":
      return Boolean(snap.inEnd) && count("bed") > 0;
    case "recover":
      return Boolean(snap.justDied) || Boolean(snap.lootAtDeath);
    case "walk_to":
      return Boolean(plan.waypoint) || Boolean(snap.poi);
    default:
      return true;
  }
}
