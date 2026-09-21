# runtime.log

The terminal on [minelog.xyz](https://minelog.xyz) is a parser, not a pretty-printer. If this format drifts, the site goes silent.

## Per-second header

Every new whole second starts with four lines. The last three have **no** timestamp of their own; the viewer pins them to the header's time.

```
ASTRA + JEV | HH:MM:SS.mmm | PHASE
ASTRA_PLAN  <one sentence from Astra>
JEV_INTENT  <one sentence describing Jev's pick>
DISPATCH    action=<id>
```

`PHASE` is the current campaign step in caps (`WOOD`, `NETHER FORTRESS`, `DRAGON FIGHT`, …). It is the HUD world label.

## Timestamped lines

```
HH:MM:SS.mmm  KIND        k=v k=v
```

- Timestamp is **exactly 12 characters** (`00:00:00.000`).
- Two spaces, then `KIND` (the viewer reads `raw.slice(14)`).
- Payload is space-separated `key=value` tokens. Values must not contain spaces - the writer replaces them with `_`.

Kinds the site groups:

| KIND | Chip |
| --- | --- |
| `OBS` `STATE` `ASTRA_PLAN` `DISPATCH` `RECOVERY` | Astra / Obs |
| `JEV_INTENT` `JEV` `RESULT` | Jev |
| `PERF` | Perf |
| `EVENT` | Events |

## Examples

```
ASTRA + JEV | 00:00:18.000 | WOOD
ASTRA_PLAN  Secure wood first to unlock the basic crafting chain.
JEV_INTENT  Punching logs and collecting wood.
DISPATCH    action=punch_tree
00:00:18.020  OBS         dim=overworld x=12 y=64 z=-4 hp=20 hunger=20 biome=plains
00:00:18.140  JEV         choice=punch_tree conf=0.91 safe=true urgency=1
00:00:18.410  RESULT      action=punch_tree ok=true
00:00:18.412  PERF        tick_ms=392 path=jev
```

Death:

```
00:26:12.008  EVENT       kind=death
00:26:12.009  RECOVERY    note=Walk_back._Pick_up_gear._Do_not_store_critical_items_in_an_unguarded_chest.
```

## Parser notes (from the site)

- Lines starting with a digit are timestamped.
- Lines starting with `ASTRA + JEV` are headers.
- Lines starting with `A`, `J`, or `D` are `ASTRA_PLAN` / `JEV_INTENT` / `DISPATCH`.
- A 475k-line trace is expected. Keep lines one row, never HTML.
