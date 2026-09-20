/** Run clock. All log timestamps are elapsed time from run start, not wall clock. */
export function createClock(start = Date.now()) {
  return {
    start,
    now() {
      return Date.now() - start;
    },
    seconds() {
      return (Date.now() - start) / 1000;
    },
  };
}

/** Format elapsed ms as HH:MM:SS.mmm — first 12 chars of a minelog.xyz log line. */
export function formatStamp(ms) {
  const t = Math.max(0, ms) / 1000;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const whole = Math.floor(s);
  const milli = Math.floor((s - whole) * 1000);
  const pad = (n, w) => String(n).padStart(w, "0");
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(whole, 2)}.${pad(milli, 3)}`;
}

export function parseStamp(stamp) {
  const m = /^(\d\d):(\d\d):(\d\d)\.(\d{3})$/.exec(stamp);
  if (!m) return null;
  return ((+m[1] * 3600 + +m[2] * 60 + +m[3]) * 1000) + +m[4];
}
