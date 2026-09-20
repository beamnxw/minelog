import { test } from "node:test";
import assert from "node:assert/strict";
import { formatStamp, parseStamp } from "../src/bus/clock.mjs";
import { createLog, parseRuntimeLog } from "../src/bus/log.mjs";

test("stamps are 12 characters HH:MM:SS.mmm", () => {
  assert.equal(formatStamp(0), "00:00:00.000");
  assert.equal(formatStamp(3661101), "01:01:01.101");
  assert.equal(parseStamp("01:01:01.101"), 3661101);
});

test("runtime.log is parseable by the minelog.xyz terminal rules", () => {
  let ms = 0;
  const clock = { now: () => ms };
  const lines = [];
  const log = createLog({ clock, write: (l) => lines.push(l), phase: "WOOD" });
  log.setAstra("Secure wood first to unlock the basic crafting chain.");
  log.setJev("Punching logs and collecting wood.");
  log.setDispatch("punch_tree");
  log.obs({ dimension: "overworld", pos: { x: 12, y: 64, z: -4 }, health: 20, food: 20, biome: "plains" });
  ms = 20;
  log.jev({ choice: "punch_tree", confidence: 0.91, safe: true, urgency: 1 }, { action: "punch_tree" });
  log.result("punch_tree", { ok: true });
  log.perf(18);

  const text = lines.join("\n");
  assert.match(text, /^ASTRA \+ JEV \| 00:00:00\.000 \| WOOD$/m);
  assert.match(text, /^ASTRA_PLAN  Secure wood first/m);
  assert.match(text, /^JEV_INTENT  Punching logs/m);
  assert.match(text, /^DISPATCH    action=punch_tree$/m);
  assert.match(text, /^00:00:00\.000  OBS /m);

  const parsed = parseRuntimeLog(text);
  const kinds = parsed.map((p) => p.kind);
  assert.ok(kinds.includes("STATE"));
  assert.ok(kinds.includes("ASTRA_PLAN"));
  assert.ok(kinds.includes("JEV_INTENT"));
  assert.ok(kinds.includes("DISPATCH"));
  assert.ok(kinds.includes("OBS"));
  assert.ok(kinds.includes("JEV"));
  assert.ok(parsed.every((p) => typeof p.t === "number"));
});
