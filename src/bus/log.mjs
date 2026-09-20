import { formatStamp } from "./clock.mjs";

/**
 * Writer for the exact runtime.log the minelog.xyz terminal parses.
 *
 * Every second of a live run starts with:
 *   ASTRA + JEV | HH:MM:SS.mmm | PHASE
 *   ASTRA_PLAN  <sentence>
 *   JEV_INTENT  <sentence>
 *   DISPATCH    action=...
 * then timestamped lines:
 *   HH:MM:SS.mmm  KIND  k=v k=v
 *
 * Parser in app.js:
 *   - lines starting with a digit are timestamped (first 12 chars = stamp)
 *   - lines starting with "ASTRA + JEV" are per-second headers
 *   - lines starting with A / J / D are ASTRA_PLAN / JEV_INTENT / DISPATCH
 */
export const KINDS = {
  OBS: "OBS",
  JEV: "JEV",
  RESULT: "RESULT",
  PERF: "PERF",
  EVENT: "EVENT",
  RECOVERY: "RECOVERY",
  STATE: "STATE",
};

export function createLog({ write, clock, phase = "WORLD INIT" } = {}) {
  const lines = [];
  const sink = typeof write === "function" ? write : (s) => lines.push(s);
  let currentPhase = phase;
  let lastHeaderSecond = -1;
  let astraSentence = "New world loading.";
  let jevSentence = "Waiting for the first observation.";
  let lastDispatch = "action=wait";

  function stamp() {
    return formatStamp(clock ? clock.now() : 0);
  }

  function secondOf(ms) {
    return Math.floor(Math.max(0, ms) / 1000);
  }

  function headerIfNeeded() {
    const ms = clock ? clock.now() : 0;
    const sec = secondOf(ms);
    if (sec === lastHeaderSecond) return;
    lastHeaderSecond = sec;
    const s = stamp();
    sink(`ASTRA + JEV | ${s} | ${currentPhase}`);
    sink(`ASTRA_PLAN  ${astraSentence}`);
    sink(`JEV_INTENT  ${jevSentence}`);
    sink(`DISPATCH    ${lastDispatch}`);
  }

  function kv(obj) {
    return Object.entries(obj)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${k}=${stringify(v)}`)
      .join(" ");
  }

  function stringify(v) {
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
    if (typeof v === "boolean") return v ? "true" : "false";
    return String(v).replace(/\s+/g, "_");
  }

  function timed(kind, fields) {
    headerIfNeeded();
    sink(`${stamp()}  ${kind.padEnd(11)} ${kv(fields)}`.trimEnd());
  }

  return {
    lines,
    setPhase(name) {
      currentPhase = name;
    },
    setAstra(text) {
      if (text) astraSentence = text;
    },
    setJev(text) {
      if (text) jevSentence = text;
    },
    setDispatch(action) {
      lastDispatch = `action=${stringify(action)}`;
    },
    headerIfNeeded,
    obs(snap) {
      timed(KINDS.OBS, {
        dim: snap.dimension,
        x: Math.round(snap.pos?.x ?? 0),
        y: Math.round(snap.pos?.y ?? 0),
        z: Math.round(snap.pos?.z ?? 0),
        hp: snap.health,
        hunger: snap.food,
        biome: snap.biome,
      });
    },
    jev(decision, gated) {
      timed(KINDS.JEV, {
        choice: gated?.action || decision?.choice,
        conf: decision?.confidence,
        safe: decision?.safe,
        urgency: decision?.urgency,
      });
    },
    result(action, result) {
      timed(KINDS.RESULT, {
        action,
        ok: Boolean(result?.ok),
        reason: result?.reason,
      });
    },
    perf(tickMs, extra = {}) {
      timed(KINDS.PERF, { tick_ms: tickMs, ...extra });
    },
    event(kind, extra = {}) {
      timed(KINDS.EVENT, { kind, ...extra });
    },
    recovery(text, extra = {}) {
      timed(KINDS.RECOVERY, { note: text, ...extra });
    },
    state(plan) {
      timed(KINDS.STATE, {
        stage: plan?.stage,
        goal: plan?.goal,
        step: plan?.step,
      });
    },
  };
}

export function parseRuntimeLog(text) {
  const HEAD = /^ASTRA \+ JEV\s+\|\s+(\d\d):(\d\d):(\d\d\.\d{3})\s+\|\s+(.*?)\s*$/;
  const out = [];
  let ht = 0;
  let hts = "00:00:00.000";
  for (let l of text.split("\n")) {
    if (l.endsWith("\r")) l = l.slice(0, -1);
    if (!l) continue;
    const c = l.charCodeAt(0);
    if (c >= 48 && c <= 57) {
      const t = +l.slice(0, 2) * 3600 + +l.slice(3, 5) * 60 + +l.slice(6, 12);
      out.push({ t, raw: l, kind: l.slice(14).split(/\s+/, 1)[0] });
    } else if (l.startsWith("ASTRA + JEV")) {
      const m = HEAD.exec(l);
      if (!m) continue;
      hts = `${m[1]}:${m[2]}:${m[3]}`;
      ht = +m[1] * 3600 + +m[2] * 60 + +m[3];
      out.push({ t: ht, raw: `${hts}  STATE       ${m[4]}`, kind: "STATE" });
    } else if (c === 65 || c === 74 || c === 68) {
      out.push({ t: ht + 0.001, raw: `${hts}  ${l}`, kind: l.split(/\s+/, 1)[0] });
    }
  }
  return out;
}
