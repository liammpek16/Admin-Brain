---
type: report
project: Dota Coach
task: Research all available outputs from the dota download
date: 2026-09-08
cycle: 2026-09-08-research-all-available-outputs-from-the-dota-download
kind: research
verdict: complete
---

# Output inventory — the Dota download pipeline

**Task:** research all available outputs from the dota download (what the pipeline
fetches and every artifact it writes), so downstream features know what raw material
already exists.

Research-only cycle (SELECT → REFINE → inventory). No code change.

## 1. What "the download" actually is — four upstream sources

| # | Source | Reached by | Gives |
|---|--------|-----------|-------|
| 1 | **OpenDota API** `https://api.opendota.com/api` | `Dota_Game_Summary.py` (all traffic funnels here) | match detail, player rows, bracket benchmarks, teamfights, ward logs (`obs_log`/`sen_log`), purchase logs, per-minute gold/xp, win-probability |
| 2 | **Valve replay servers** `replayN.valve.net/570/<id>_<salt>.dem.bz2` | `dota_coach/replay.py` `download_replay()` | the raw `.dem` replay (30–120 MB), bunzip2'd + cached |
| 3 | **manta Go helper** over the `.dem` | `tools/manta_positions/main.go` via `replay.parse_positions()` | hero **position snapshots** (x,y tile coords) + **combat-log events** (dmg/heal/mod/cast/dispel/death) |
| 4 | **OpenDota /constants** + **Steam CDN** | `fetch_hero_constants` / `fetch_item_constants` / `_download_hero_image` | `heroes.json`, `items.json`, hero icons |

Replay parsing is **heavy and opt-in** (`tools.py`); the OpenDota path works without it,
just with less (no real hero positions → vision falls back to map-wide counts).

## 2. Every output file (all under `dota_coach/data/`)

| File | Written by | Downloaded / Derived | Contents |
|------|-----------|----------------------|----------|
| `matches/<match>_<acct>.json` | `analyze_match` | mixed | Master summary: `own` stats, `bracket` benchmarks, `key_moments{fights,items}`, `item_analysis{enemy_threats,recommendations,watchouts,your_items,focus_role,role_alternatives}`, `draft_findings`, `coaching{enemy_identity,enemy_weaknesses,matchup,gameplan}` (LLM), `player_builds`, `warding`, `fights_vision`, `key_fights` |
| `matches/<match>_<acct>_coach.json` | `analyze_match_for_coaching` | derived (replay-enriched) | Same shape **plus** `key_fights[].team_shape`, `key_fights[].target_priority`, per-death `where` + `positioning{tag,nearest_ally}`, participant `top_spells`/`wasted_casts`/`disables_dealt`/`disables_taken`/`hero_damage`/`damage_taken` |
| `matches/<match>_<acct>_charts.json` | `build_charts` | mixed | Time-series: `win_prob[~43]`, per-player `gpm_series`/`xpm_series`/`purchases`, and **`fights[]`** with `deaths_detail`, `swing`, `your/enemy_wards_active`, **`wards[]{x,y,is_yours,type}`**, and `combatants[]{damage_total,healing,gold/xp_delta,abilities,items,killed,killed_by}` |
| `matches/<match>_<acct>_players.json` | `match_players` | downloaded | Lightweight scoreboard: per-player slot/hero/K/D/A/gpm/xpm/net_worth/level/items/neutral |
| `coaching/<acct>/<match>.json` | coaching agent | derived (LLM) | The coaching conversation: `header`, `hero`, `is_win`, `messages[]` (role/content) |
| `coaching/<acct>/profile.json` | coaching agent | derived | Cross-game memory: `games_reviewed[]{match_id,hero,is_win,verdict,at}`, `lessons[]` |
| `replays/<id>.dem` | `download_replay` | downloaded | Raw Valve Source-2 replay binary |
| `constants/heroes.json` | `fetch_hero_constants` | downloaded | 127 heroes: attrs, roles, base stats, `day_vision`/`night_vision`, `localized_name` |
| `constants/items.json` | `fetch_item_constants` | downloaded | 501 items: cost, behavior, components, attribs, cd |

## 3. Fight / vision data in detail (the richest, least-surfaced material)

- **`charts.fights[]`** is the most detailed per-fight object: it already carries **ward
  positions** (`wards[]{x,y,is_yours,type}`), full `combatants[]`, and `deaths_detail`.
- **`summary.key_fights[]`** (and the `_coach` variant) carry `deaths[]{killed_by,where,
  positioning}`, `participants[]` (damage, spells, disables), `team_shape`,
  `target_priority`. The `where`/`positioning`/`team_shape`/`target_priority` fields are
  **null in the plain summary and populated only in `_coach.json`** (after replay
  enrichment).
- **`summary.fights_vision[]`** = per-fight vision, built by `_project_fights_vision`:
  whole-map `your/enemy_wards_active` **plus** fight-local vision
  (`_fight_local_vision`): `your_wards_local`, `enemy_wards_local`, `vision_advantage`,
  `located`. Local vision needs replay hero positions (`fight['heroes']`) — `located` is
  False on OpenDota-only data and the coach then honestly labels the number "map-wide".
- **`warding`** (per player): observers/sentries placed, `by_zone`
  (aggressive/defensive/river-contested via `_ward_zone`, the map anti-diagonal), per-ward
  `{time,x,y,lifespan,killed}`, `killed_early` counts.

## 4. Key findings for downstream work

1. **Positions are (x,y) tile coords only — no elevation (Z).** `manta_positions/main.go`
   reads `m_cellX/m_cellY/m_vecX/m_vecY`; it does **not** read `m_cellZ/m_vecZ`, which the
   replay entity also exposes. So today nothing knows high ground from low ground.
2. **Fight-local vision is a flat Euclidean radius** (`_WARD_VISION_RADIUS_TILES = 14`),
   with no line-of-sight or high-ground rule — a ward is credited if it's within 14 tiles
   of the fight centroid even if a cliff or trees block it, or it sits below high ground it
   can't see up onto. → **This is exactly the target of the "high-ground / LOS-aware fight
   vision" task.** Two feasible elevation sources: (a) extend the manta helper to emit
   per-entity Z, or (b) bake a static map-elevation grid keyed by (x,y).
3. **No terrain/elevation asset exists anywhere in the repo** — a LOS feature must
   introduce one (grid asset) or a replay Z channel.
4. **`charts.json` already ships ward x,y to the webapp** — the map view and any LOS
   overlay have the geometry they need without new downloads.
5. Rich, already-downloaded but **under-surfaced** signals available to future features:
   per-fight `combatants` (ability targets, wasted casts, disables), `target_priority`,
   `team_shape`, per-death `positioning`, ward `lifespan`/`killed_early`, win-prob swing.

## Verdict
**Complete.** Full provenance + schema of every download output catalogued above. Directly
enables the next two tasks: fight-vision LOS (uses `fights[].wards`, `fights_vision`,
`_fight_local_vision`, and the missing Z channel) and the parse/coaching UI bug.
