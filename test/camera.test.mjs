import { test } from "node:test";
import assert from "node:assert/strict";
import { createCamera } from "../src/protocol/camera.mjs";

test("camera approaches the target without jumping", () => {
  const cam = createCamera({ maxDegPerSec: 90, accelDegPerSec2: 360 });
  let pose = { yaw: 0, pitch: 0 };
  const target = { yaw: Math.PI / 2, pitch: 0 };
  for (let i = 0; i < 40; i++) pose = cam.step(pose, target, 0.05);
  assert.ok(Math.abs(pose.yaw - Math.PI / 2) < 0.15);
});

test("pitch is clamped", () => {
  const cam = createCamera();
  let pose = { yaw: 0, pitch: 0 };
  pose = cam.step(pose, { yaw: 0, pitch: 4 }, 1);
  assert.ok(pose.pitch < Math.PI / 2);
  assert.ok(pose.pitch > 0);
});
