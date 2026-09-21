# Harness

## Layout

```
src/
  index.mjs              CLI - live run or --dry-run
  loop.mjs               the tick
  config.mjs             stages, model ids, policy numbers
  observe/snapshot.mjs   Mineflayer → JSON
  planner/               Astra client, JSON schema, async wrapper
  controller/            action catalog, Jev client, code policy
  skills/                named recipes Astra can request
  protocol/              Mineflayer body + rate-limited camera
  bus/                   runtime.log writer (minelog.xyz format)
  verify/                dragon + exit portal
```

## Run

Vanilla Minecraft Java server on `MC_HOST:MC_PORT`. Offline mode is fine for a local recording.

```bash
cp .env.example .env
# fill TYPESAFE_API_KEY and OPENAI_API_KEY
npm install
npm test
node src/index.mjs --dry-run
node src/index.mjs
```

`runs/<RUN_ID>/runtime.log` is the file the site's terminal fetches. Drop a `stop` file in that directory to halt on the next tick.

`--dry-run` never touches a server or a model. It punches a fake tree for eight ticks so the log format can be inspected.

## Body

`src/protocol/bot.mjs` is the only place packets leave the process. Pathfinder moves. `dig` / `attack` / `consume` are vanilla. The camera in `src/protocol/camera.mjs` rate-limits look so a mirrored native client (used for the stream, not for control) does not snap.

## Skills

`src/skills/catalog.mjs` is the list Astra may name. A name that is not in the catalog is ignored. Adding a skill is a code review, not a prompt change. After a failure Astra is shown the miss and may add a name to `plan.skills` so Jev's next legal set is biased through policy/reflex, not through hidden prompt text.

## Verification

`verifyRun` requires:

- `dragon_dead` evidence (kill advancement or health 0 in the dying phase)
- `exit_portal` event

Deaths are counted, not failed. That matches the site: "Watch it fail, then recover."
