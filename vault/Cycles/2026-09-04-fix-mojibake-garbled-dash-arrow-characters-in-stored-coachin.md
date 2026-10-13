---
type: cycle
project: Dota Coach
stage: refine
status: abandoned
verdict: not-a-bug
task: >-
  Fix mojibake (garbled dash/arrow characters) in stored coaching reviews -
  UTF-8 on the conversation store (follow-up to PR #12)
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/dota-projects'
---

## Task (from SELECT)
Fix mojibake (garbled dash/arrow characters) in stored coaching reviews - UTF-8 on the conversation store (follow-up to PR #12)

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
Follow-up to PR #12. **The council recommends CLOSING this as not-a-bug.**

- **First-Principles Thinker** — Investigated the actual bytes. `conversation_store` already reads and writes with `encoding="utf-8"` (and `ensure_ascii=False` on write). The stored review file `data/coaching/114182902/8909154754.json` contains **zero U+FFFD bytes** (`EF BF BD` absent) and the em-dash is present as correct UTF-8 (`E2 80 94`). The `�` was a Git Bash terminal-rendering artifact when the text was printed to a console that couldn't display the em-dash — not corruption in the data.
- **Contrarian** — "Fixing" a non-bug risks introducing one (e.g. forcing ASCII would strip legitimate em-dashes). Do nothing to the store.
- **Executor** — No code change warranted. If display in a specific surface (a Windows console tool) is ever a concern, that's a rendering/locale issue at that surface, not the store.
- **Outsider** — The player-facing webapp renders these reviews as UTF-8 HTML, where the em-dash shows correctly; there's no user-visible defect.
- **Expansionist (deferred)** — If a future non-web CLI surface must print reviews on a legacy codepage console, wrap that surface's stdout in UTF-8 — a per-surface concern, not the store.

## Refined task spec
**Close as not-a-defect.** Verified the conversation store is UTF-8-clean on read and write and the stored reviews contain no corrupted characters; the observed `�` was terminal rendering, not stored data. No implementation.

Out of scope / deferred: UTF-8-wrapping stdout for any legacy-console CLI surface, IF one is ever added.

## Definition of done
- Documented evidence that the store round-trips UTF-8 correctly and the reported `�` is not in the data (done above).
- No code change; cycle closed as `abandoned` (not-a-bug), roadmap goal removed or marked not-applicable.
