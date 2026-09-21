<p align="center">
  <img src="logo.png" alt="MineLog" width="360">
</p>

# MINELOG

**GPT-6 Astra plans. Jev decides. One Minecraft body.**

This is the backend behind [minelog.xyz](https://minelog.xyz).

The site is the wrapper: live gameplay on the left, a terminal of the two minds on the right, world status below. This repo is the harness that moves the player and writes that terminal.

```
Astra  ──async plan──►  loop  ◄──typed choice──  Jev
                          │
                          ▼
                   Mineflayer body
                   player protocol
                          │
                          ▼
                    runtime.log  →  minelog.xyz
```

Not affiliated with Mojang or Microsoft.

## How it works

Code owns the tick. Models are guests.

1. **Observe** the world into JSON (hp, hunger, inventory, hostiles, light, nearby blocks).
2. **Reflex** in code - lava, drowning, creeper in your face, just died. No model.
3. **Astra** (GPT-6 Astra) sets the stage, the goal, the waypoint. Slow. Background. Never blocks a tick.
4. **Jev** (TypeSafe System One) picks **one** bounded action from a closed catalog, plus a safety noul and an urgency score. Fast. Typed. No prose.
5. **Gate** in code - illegal action, low confidence, unsafe noul → wait or flee.
6. **Execute** through the ordinary player protocol.
7. **Log** in the exact `runtime.log` format the site already parses.

The campaign is the eight stages the live viewer already shows: wood → iron → diamonds → nether → fortress → pearls → stronghold → dragon.

Deaths stay in. Recovery is a skill. A run is complete when the dragon is dead and the body uses the exit portal.

Full write-up: [docs/architecture.md](docs/architecture.md) · [docs/log-format.md](docs/log-format.md) · [docs/models.md](docs/models.md) · [docs/harness.md](docs/harness.md)

## Quick start

```bash
git clone https://github.com/beamnxw/minelog
cd minelog
cp .env.example .env
npm install
npm test
node src/index.mjs --dry-run
```

Dry-run writes a sample `runs/local-01/runtime.log` without a Minecraft server or API keys.

A live body needs:

- a Minecraft Java server (`MC_HOST` / `MC_PORT`)
- `TYPESAFE_API_KEY` for Jev - [console.typesafe.ai](https://console.typesafe.ai)
- `OPENAI_API_KEY` for Astra (`gpt-6-astra`), or `OPENROUTER_API_KEY` as a relay

```bash
node src/index.mjs
```

Touch `runs/<RUN_ID>/stop` to halt on the next tick.

## Layout

```
src/loop.mjs            tick - two minds, one body
src/planner/            Astra
src/controller/         Jev + action catalog + policy
src/observe/            structured snapshot
src/skills/             named recipes Astra can request after a miss
src/protocol/           Mineflayer + camera
src/bus/                runtime.log writer
src/verify/             dragon + exit portal
```

## Models

| Role | Model | API |
| --- | --- | --- |
| Planner | GPT-6 Astra | OpenAI Chat Completions, JSON mode |
| Controller | Jev (System One) | `POST https://api.typesafe.ai/v1/systemone` |

Jev docs: [docs.typesafe.ai/introduction](https://docs.typesafe.ai/introduction)  
Astra card: [developers.openai.com/api/docs/models/gpt-6-astra](https://developers.openai.com/api/docs/models/gpt-6-astra)

Keys never go in git, in the log, or in the HUD.

## License

MIT. Minecraft is the classroom. Everything else is next.
