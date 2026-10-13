---
type: cycle
project: Dota Coach
stage: verify
status: done
verdict: pass
merged: 'https://github.com/liammpek16/dota-projects/pull/17'
scope: A
task: >-
  Grade the neutral item choice - was it the best neutral for its tier/role
  (follow-up to PR #14)
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/grade-the-neutral-item-choice-was-it-the-best-neutral-for-it
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-04-grade-the-neutral-item-choice-was-it-the-best-neutral-for-it
---

## Task (from SELECT)
Grade the neutral item choice - was it the best neutral for its tier/role (follow-up to PR #14)

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
Follow-up to PR #14 (which only *distinguished* the neutral; this would *grade* it). **This is the biggest of the four — a real feature, not a fix.**

- **First-Principles Thinker** — "Best neutral for tier/role" needs two things: (1) the neutral's TIER — available: OpenDota item constants carry a `tier` field (~49 tiered items). (2) a curated "which neutrals are good for which hero role/situation" knowledge base — **does not exist** (`dota_knowledge*.py` has hero matchups, no neutral-item knowledge). So true best-in-tier grading requires authoring and maintaining new curated data that shifts every patch.
- **Contrarian** — A hand-rolled "best neutral" table will be stale within a patch or two and give confidently-wrong advice — the exact trust problem the first four cycles fixed. Grading the CHOICE is high-maintenance and low-reliability unless sourced from real pick/winrate data.
- **First-Principles (v1 alternative)** — A reliable, low-maintenance v1: surface the neutral's **tier** (from constants) and a light role-fit note, and let the coaching LLM reason about fit (it already knows neutrals), rather than a brittle hardcoded "best" verdict. That stays honest and needs no curated table.
- **Executor** — Two viable scopes: **(A) minimal/branch-sized** — add the neutral's tier to the data + a prompt line telling the coach to judge the neutral against tier-appropriate alternatives (LLM reasons, no new knowledge base). **(B) full/large** — author a curated tier→role neutral knowledge base + deterministic grading; multi-branch, ongoing upkeep. Recommend A now, B only if the user wants deterministic grading.
- **Outsider** — Players do want "was Pirate Hat the right neutral?" — but wrong confident grading is worse than the LLM reasoning from the tier. A tier label + LLM judgment is trustworthy day one.

## Refined task spec
**Recommend scope (A) — needs a gate decision.** Enable neutral-choice coaching without a brittle curated table:

1. **Data (`Dota_Game_Summary`)** — when tagging the neutral in `_player_final_items` (or player_builds), include its **tier** from item constants, e.g. `"Pirate Hat (neutral, tier 4)"`.
2. **Prompt (`coaching_agent`)** — extend the neutral rule: the coach may assess whether the neutral was a good choice *for its tier and the hero's role/needs*, comparing only against other neutrals of the same tier — still never against purchased items.
3. Deterministic best-in-tier grading + a curated neutral knowledge base = **scope (B), deferred** unless the user explicitly wants it (large, patch-sensitive upkeep).

Out of scope for (A): a curated neutral tier→role table; deterministic "optimal neutral" verdicts; winrate-sourced neutral data.

## Definition of done (scope A)
- The neutral item carries its tier in the data the coach sees (from item constants; graceful when tier is missing).
- The prompt lets the coach judge the neutral's choice within its tier/role, never against purchased items.
- No regression to PR #14's neutral/purchased distinction; heroes with no neutral unaffected.
- Adversarial verify: neutral with/without a known tier, unknown item id, no-neutral hero, and confirm purchased items still untagged and un-tiered.

> **GATE DECISION NEEDED:** implement scope A (LLM-judged, reliable, branch-sized) now, or defer for scope B (curated deterministic grading, large)?

## Implementation
- branch: `auto/grade-the-neutral-item-choice-was-it-the-best-neutral-for-it` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-04T18:52

### Checkpoint log
- 2026-09-04T18:52 — branch created; supervised implementation started.
