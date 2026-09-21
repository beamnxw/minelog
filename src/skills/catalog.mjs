/**
 * Skills are named procedures Jev can lean on and Astra can request.
 * Each skill is a bounded recipe - not a full agent. Code still executes it.
 *
 * Astra may add a new skill after a failure by returning { skills: ["name"] }.
 * Unknown names are ignored until a module exists under src/skills/.
 */
export const SKILLS = {
  punch_tree: {
    id: "punch_tree",
    when: "Need wood and a log is in reach.",
    action: "punch_tree",
  },
  craft_starter: {
    id: "craft_starter",
    when: "Have logs, missing planks, sticks, table or wooden tools.",
    action: "craft",
  },
  stone_upgrade: {
    id: "stone_upgrade",
    when: "Have cobblestone and a table. Upgrade from wood.",
    action: "craft",
  },
  hunt_food: {
    id: "hunt_food",
    when: "Hunger falling or no cooked food in inventory.",
    action: "fight",
  },
  sleep_night: {
    id: "sleep_night",
    when: "Night, have a bed or wool, not already in a safe hole.",
    action: "sleep",
  },
  light_cave: {
    id: "light_cave",
    when: "Light level under 8 underground.",
    action: "place_torch",
  },
  iron_vein: {
    id: "iron_vein",
    when: "Iron ore is visible in loaded chunks.",
    action: "mine_block",
  },
  diamond_depth: {
    id: "diamond_depth",
    when: "Stage 3 and Y is still above diamond range.",
    action: "mine_block",
  },
  nether_bridge: {
    id: "nether_bridge",
    when: "In the Nether with lava seas between the body and the fortress.",
    action: "place_block",
  },
  blaze_farm: {
    id: "blaze_farm",
    when: "Inside a fortress, need blaze rods.",
    action: "fight",
  },
  pearl_hunt: {
    id: "pearl_hunt",
    when: "Need ender pearls, warped forest or endermen in view.",
    action: "fight",
  },
  eye_throw: {
    id: "eye_throw",
    when: "Have eyes of ender, still looking for the stronghold.",
    action: "throw_eye",
  },
  dragon_bed: {
    id: "dragon_bed",
    when: "Dragon perched or landing, bed in inventory, cover exists.",
    action: "bed_explode",
  },
  recover_death: {
    id: "recover_death",
    when: "justDied or loot pile at the last death point.",
    action: "recover",
  },
  creeper_respect: {
    id: "creeper_respect",
    when: "Creeper within 5 blocks. Never store critical items in an unguarded chest.",
    action: "flee",
  },
};

export function skillIds() {
  return Object.keys(SKILLS);
}

export function pickSkill(plan, snapshot) {
  const wanted = plan?.skills?.length ? plan.skills : skillIds();
  for (const id of wanted) {
    const skill = SKILLS[id];
    if (skill && applies(skill.id, snapshot, plan)) return skill;
  }
  return null;
}

function applies(id, snap = {}, plan = {}) {
  switch (id) {
    case "punch_tree":
      return snap.treeNearby && (plan.stage ?? 0) === 0;
    case "sleep_night":
      return Boolean(snap.isNight);
    case "light_cave":
      return snap.light != null && snap.light < 8;
    case "recover_death":
      return Boolean(snap.justDied) || Boolean(snap.lootAtDeath);
    case "creeper_respect":
      return (snap.hostiles || []).some((h) => h.type === "creeper" && h.dist <= 5);
    case "dragon_bed":
      return Boolean(snap.inEnd);
    case "eye_throw":
      return (plan.stage ?? 0) === 6;
    default:
      return false;
  }
}
