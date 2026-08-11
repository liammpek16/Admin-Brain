---
type: cycle
project: Dota Coach
stage: verify
status: done
task: >-
  Harden heroes.json hand-corrections so a constants refresh can't silently
  revert them
started: '2026-08-11'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/harden-heroes-json-hand-corrections-so-a-constants-refresh-c
target_path: 'C:/Users/liamm/Scripts'
report: 2026-08-11-harden-heroes-json-hand-corrections-so-a-constants-refresh-c
---

## Task (from SELECT)
Harden heroes.json hand-corrections so a constants refresh can't silently revert them

## Project goal — source: https://github.com/liammpek16/dota-projects
```
# dota-projects

A collection of personal Dota 2 analysis and coaching projects.

## Contents

| Path | Description |
|------|-------------|
| `dota_coach/` | Dota 2 coaching app — replay parsing, coaching/research agents, telemetry, dashboard, and a web app. |
| `Dota_Game_Summary.py` | Generates a summary report for a Dota match. |
| `dota_knowledge.py`, `dota_knowledge_ext.py` | Static Dota knowledge bases (heroes, items, mechanics). |
| `report_html.py` | Builds HTML match reports. |
| `run-webapp.ps1` | Launches the coaching web app. |
| `tools/manta_positions/` | Go tool for extracting positional data from replays. |

## Notes

Large or regenerable files are intentionally **not** tracked in git (see `.gitignore`):
Dota replay files (`*.dem`), per-match data dumps, the local `coach.db`, compiled
binaries, and Python caches. Reference data (`dota_coach/data/constants/`) is kept.

## Setup

```bash
# Python projects
cd dota_coach
pip install -r requirements.txt

# Go tool
cd tools/manta_positions
go build ./...
```

## Validation

`dota_coach/validate_constants.py` guards the knowledge layer the coaching interface relies
on, with two checks:

1. **Constants vs upstream** — diffs `data/constants/heroes.json` & `items.json` against the
   live OpenDota `/constants` (same upstream: `odota/dotaconstants`) over a bounded subset
   (hero name/roles/attack_type/primary_attr, item name/cost).
2. **Knowledge referential integrity** (local, no network) — every hero name used as a key in
   `dota_knowledge.py` / `dota_knowledge_ext.py` must exist in `heroes.json`. A stale or
   misspelled key is *silently skipped* by the coaching analysis, so this catches heroes whose
   coaching data quietly drops out (e.g. a rename mismatch).

Exit 0 = clean, 1 = discrepancies.

```bash
cd dota_coach
python validate_constants.py                 # both checks (constants needs network)
python validate_constants.py --knowledge     # only the local knowledge check (no network)
python validate_constants.py --offline       # skip upstream; knowledge only
python validate_constants.py --json          # machine-readable report
python validate_constants.py --upstream-dir DIR   # compare constants vs a pinned copy
python validate_constants.py --insecure      # workaround for broken local TLS chains
```

### Constants note

Two hero `localized_name`s in `data/constants/heroes.json` are **hand-corrected** to their
current in-game names — `Outworld Destroyer` (was the stale `Outworld Devourer`) and
`Ringmaster` (was `Ring Master`). The upstream `odota/dotaconstants` snapshot still carried the
old names, which silently dropped both heroes' coaching data (their knowledge keys use the
current names). If `heroes.json` is ever regenerated from a stale upstream, these can revert —
`python validate_constants.py --knowledge` is the regression net that catches it (exit 1 on any
dangling hero reference).
```

## Council refinement
_Root cause (found in the code): `Dota_Game_Summary._cached_constants(name, url)` fetches
`/constants/heroes` and, on success, does `path.write_text(json.dumps(data))` — **overwriting
`data/constants/heroes.json` with the raw upstream table**. Upstream `odota/dotaconstants` still
carries the stale `Outworld Devourer` (id 76) / `Ring Master` (id 131), so every refresh silently
reverts our hand-corrections → those heroes' coaching data drops (validate_constants.py --knowledge
→ exit 1). Observed firing in the last cycle just by running the app._

**🔴 Contrarian** — A join-time alias map (normalize knowledge↔heroes names) only patches the
coaching lookup; it leaves the on-disk `heroes.json` **wrong** for every other reader (the webapp
roster, reports, the validator itself). Fix the clobbering write, not just one consumer.

**🔵 First-Principles** — The corrections are a tiny, known, id-keyed set. The only place they get
lost is the one `write_text` in `_cached_constants`. So: **re-apply the canonical names right before
that write (and to the returned data)** — then no refresh path can revert them, and the file stays
correct for everyone. Keyed by hero **id** (stable), not name (which is the thing that drifts).

**🟢 Expansionist** — Make it a small declared overlay (`id → canonical localized_name`) so future
stale-upstream names are a one-line add, and it becomes the single home for "we know better than
dotaconstants here." The validator stays the regression net that tells you when to add one.

**⚪ Outsider** — I don't want to remember to re-run a fix every time I open the app. Once pinned,
Outworld Destroyer and Ringmaster should just stay correct.

**🟡 Executor** — Branch-sized: add `_HERO_NAME_OVERRIDES = {"76": "Outworld Destroyer", "131":
"Ringmaster"}` + an `_apply_hero_overrides(data)` that sets each id's `localized_name`; thread an
`overrides` hook through `_cached_constants` and pass it from `fetch_hero_constants`. Applies on
fetch-success (before write) so the cache and the return value are both corrected; the failure
fallback already reads the (now-correct) disk copy.

**Resolution:** Fix the root — an **id-keyed canonical overlay re-applied on every hero-constants
refresh**, before the write. Durable for all readers, tiny, and the validator remains the net.
(Join-time alias map = the rejected weaker alternative.)

## Refined task spec
**Make the hand-corrected hero names survive a constants refresh (fix the clobbering write).**
- In `Dota_Game_Summary.py`: add `_HERO_NAME_OVERRIDES = {"76": "Outworld Destroyer",
  "131": "Ringmaster"}` (id-keyed; ids confirmed: 76 = `npc_dota_hero_obsidian_destroyer`,
  131 = `npc_dota_hero_ringmaster`) and `_apply_hero_overrides(data)` that, for each id present,
  sets `data[id]["localized_name"]` to the canonical value (defensive: skip missing ids / non-dicts).
- Thread an optional `overrides` callable through `_cached_constants(name, url, overrides=None)`;
  when a fetch succeeds, call `overrides(data)` **before** `path.write_text(...)` and before
  returning. `fetch_hero_constants()` passes `_apply_hero_overrides`; item constants unchanged.
- Net effect: a live fetch writes the corrected names to disk and returns corrected data; the
  offline fallback already reads the corrected disk copy. No other behavior changes.
- **Out of scope:** join-time alias map; changing item constants; touching the knowledge files.

## Definition of done
- After simulating a hero-constants fetch that returns the **stale** upstream names (id 76
  "Outworld Devourer", id 131 "Ring Master"), both the returned data **and** the written
  `heroes.json` show `Outworld Destroyer` / `Ringmaster`.
- `python validate_constants.py --knowledge` → exit 0 after such a refresh (was exit 1).
- `_apply_hero_overrides` is defensive (missing ids / unexpected shapes don't crash); item
  constants and the offline-fallback path are unaffected.
- Verified without network by monkeypatching the fetch to return a stale table.

## Implementation
- branch: `auto/harden-heroes-json-hand-corrections-so-a-constants-refresh-c` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-08-11T02:40

### Checkpoint log
- 2026-08-11T02:40 — branch created; supervised implementation started.
- 2026-08-11T02:55 — Added `_HERO_NAME_OVERRIDES` (id 76→Outworld Destroyer, 131→Ringmaster) +
  `_apply_hero_overrides(data)`; threaded an `overrides` hook through `_cached_constants` (applied
  before the disk write + return); `fetch_hero_constants` passes it. Tested with no network by
  monkeypatching the fetch to return a STALE full table: returned data AND written heroes.json come
  back corrected, all 127 heroes preserved, `validate_constants.py --knowledge` exit 0 (was 1).
  Defensive checks pass (None/empty/non-dict/missing-id/list; idempotent). heroes.json round-trips
  identical to committed.

### Result — DoD check
- ✅ Simulated stale fetch (id 76 "Outworld Devourer", 131 "Ring Master") → return + on-disk both
  show `Outworld Destroyer` / `Ringmaster`.
- ✅ `validate_constants.py --knowledge` exit 0 after such a refresh (was exit 1).
- ✅ `_apply_hero_overrides` defensive (missing ids / odd shapes don't crash); items + offline
  fallback path untouched.
- ✅ Verified without network via monkeypatch; only `Dota_Game_Summary.py` changed.

**Implement complete.** Ready for Phase D (verify).

## Verify (Phase D)
Independent adversarial pass: **pass**. Core protection confirmed (stale refresh -> corrected in
return + on disk; validator exit 1 -> 0; 127 heroes preserved; items unaffected; defensive +
idempotent). Verify FOUND one gap and it was CLOSED in-cycle: the overlay only applied on a
successful fetch, so the offline cache-fallback could still serve a stale disk copy during an
OpenDota outage — now the fallback read applies the overlay too (re-verified corrected). Report:
[[2026-08-11-harden-heroes-json-hand-corrections-so-a-constants-refresh-c]].

_Cycle complete (dota-projects PR #5 draft, awaiting your review/merge)._
