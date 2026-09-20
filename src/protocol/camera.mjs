/**
 * Continuous look. The body never teleports the camera.
 * Turns are rate-limited so the native view (and the stream) look like a player.
 */
export const CAMERA = {
  maxDegPerSec: 180,
  accelDegPerSec2: 720,
};

export function createCamera(opts = {}) {
  const max = opts.maxDegPerSec ?? CAMERA.maxDegPerSec;
  const accel = opts.accelDegPerSec2 ?? CAMERA.accelDegPerSec2;
  let yawVel = 0;
  let pitchVel = 0;

  function step(current, target, dt) {
    const yaw = approach(current.yaw, target.yaw, yawVel, dt, max, accel);
    const pitch = approach(current.pitch, clampPitch(target.pitch), pitchVel, dt, max, accel, true);
    yawVel = yaw.vel;
    pitchVel = pitch.vel;
    return { yaw: wrapPi(yaw.pos), pitch: pitch.pos };
  }

  return {
    step,
    reset() {
      yawVel = 0;
      pitchVel = 0;
    },
  };
}

function approach(pos, target, vel, dt, maxDeg, accelDeg, pitched = false) {
  const dest = pitched ? clampPitch(target) : wrapPi(target);
  const err = pitched ? dest - pos : wrapPi(dest - pos);
  const max = (maxDeg * Math.PI) / 180;
  const acc = (accelDeg * Math.PI) / 180;
  if (Math.abs(err) < 1e-4 && Math.abs(vel) < 1e-4) {
    return { pos: dest, vel: 0 };
  }
  const stepReach = Math.abs(vel) * dt + 0.5 * acc * dt * dt;
  if (Math.abs(err) <= stepReach) {
    return { pos: dest, vel: 0 };
  }
  const stopDist = (vel * vel) / (2 * acc);
  const sameWay = vel === 0 ? true : Math.sign(vel) === Math.sign(err);
  let a;
  if (sameWay && stopDist >= Math.abs(err)) a = -Math.sign(vel || err) * acc;
  else a = Math.sign(err) * acc;
  let v = vel + a * dt;
  if (Math.abs(v) > max) v = Math.sign(v) * max;
  const next = pos + v * dt;
  return { pos: pitched ? clampPitch(next) : wrapPi(next), vel: v };
}

function wrapPi(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function clampPitch(p) {
  const lim = (89 * Math.PI) / 180;
  return Math.min(lim, Math.max(-lim, p));
}
