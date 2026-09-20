import { test } from "node:test";
import assert from "node:assert/strict";
import { SKILLS, pickSkill } from "../src/skills/catalog.mjs";
import { emptySnapshot } from "../src/observe/snapshot.mjs";

test("creeper_respect wins when a creeper is close", () => {
  const skill = pickSkill(
    { skills: ["punch_tree", "creeper_respect"] },
    emptySnapshot({ hostiles: [{ type: "creeper", dist: 3 }] }),
  );
  assert.equal(skill.id, "creeper_respect");
  assert.equal(skill.action, "flee");
});

test("dragon_bed is only offered in the End", () => {
  assert.equal(pickSkill({ skills: ["dragon_bed"] }, emptySnapshot({ inEnd: false })), null);
  assert.equal(pickSkill({ skills: ["dragon_bed"] }, emptySnapshot({ inEnd: true }))?.id, "dragon_bed");
});

test("catalog contains recover_death", () => {
  assert.ok(SKILLS.recover_death);
});
