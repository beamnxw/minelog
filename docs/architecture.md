# Architecture

MineLog is two minds in one vanilla Minecraft body.

The live site at [minelog.xyz](https://minelog.xyz) is the wrapper: gameplay on the left, `runtime.log` on the right, world status below. This repository is the backend that produces that log and moves the player.

```
                    minelog.xyz
           video | runtime.log | world
                          ▲
                          │  runtime.log  (this format is load-bearing)
                          │
 ┌────────────────────────┴─────────────────────────┐
 │                     LOOP                         │
 │  observe → reflex → (Astra async) → Jev → gate   │
 │                    → execute → log               │
 └──────┬──────────────────┬─────────────────┬──────┘
        │                  │                 │
   GPT-6 Astra            Jev              CODE
   slow planner      System One         Mineflayer
   json plan         ~100ms typed       vanilla protocol
```

Nothing in this harness edits the world except through the ordinary player protocol. No `/give`. No game-rule patches. No operator repair mid-run.

## Two minds

| Mind | Model | Job | Cadence |
| --- | --- | --- | --- |
| **Astra** | `gpt-6-astra` | Stage, goal, steps, waypoint, item targets, skill names | ~12s, never on the hot path |
| **Jev** | TypeSafe System One (`jev-latest`) | One bounded action, a safety noul, an urgency score | Every tick, ~100ms |

Astra does not press keys. Jev does not plan the campaign. Code owns every side effect.

This is the TypeSafe System One split ([docs](https://docs.typesafe.ai/concepts/how-to-build-with-system-one)): control flow stays in software; the model is a typed judgment over unstructured game state.

## The campaign

The eight stages are the ones the site already renders:

1. Wood & stone tools
2. Food, bed & first iron
3. Base & deep mining
4. Diamonds & Nether portal
5. Nether Fortress
6. Blaze rods & Ender pearls
7. Find the Stronghold
8. Defeat the Ender Dragon

Deaths are part of the run. The stream is supposed to show the recovery. A death does not fail verification — only a missing dragon kill or a missing exit-portal event does.

## Tick

`src/loop.mjs`

1. **Observe.** Mineflayer state becomes a JSON snapshot: position, hp, hunger, inventory, hostiles, drops, light, nearby POIs, hazards.
2. **Reflex.** Lava, fire, drowning, void, creeper ≤ 5 blocks, hp ≤ 4, just-died. These fire in code. Jev is not asked.
3. **Plan (async).** If the plan is older than `PLANNER_INTERVAL_MS` or the stage changed, kick Astra. Do not await it. If the stage moves while Astra is in flight, drop the answer.
4. **Decide.** Send snapshot + plan + the *legal* action list to Jev as three questions in one System One call:
   - `Choice` — which action
   - `Noul` — is that action safe
   - `Score` — how urgent is this tick
5. **Gate.** Illegal id → wait. `safe === false` → flee or wait. Confidence < 0.45 → wait. Code, not the model.
6. **Execute.** Mineflayer pathfinder / dig / attack / consume. One action, then yield.
7. **Log.** Write the header + `OBS` / `JEV` / `RESULT` / `PERF` / `EVENT` lines the site already parses.

## Why Jev is Choice, not keys

A WASD stream is an unbounded control problem. MineLog gives Jev a closed set of verbs (`src/controller/actions.mjs`). Adding a verb is a code change. Astra can ask for a *skill* (a named recipe that maps onto an existing verb) after a failure; it cannot invent a new packet.

The creeper lesson is encoded as a skill and a reflex: never wait for a model when the green thing is already in range, and never park critical items in an unguarded chest.

## Data that leaves the process

- `runs/<id>/runtime.log` — public, this is the product.
- `runs/<id>/events.jsonl` — optional evidence (deaths, dragon, portal).
- Model calls send a *compact* snapshot (no screenshots, no secrets). Keys stay in the environment.

Recordings and worlds stay local. They are gitignored.

## What this is not

Not a fork of someone else's speedrun harness. Not a screenshot agent. Not a cheat client. The body is a player. The wrapper is MineLog.
