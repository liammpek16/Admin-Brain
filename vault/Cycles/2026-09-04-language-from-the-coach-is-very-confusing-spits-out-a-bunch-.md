---
type: cycle
project: Dota Coach
stage: verify
status: done
verdict: pass
merged: 'https://github.com/liammpek16/dota-projects/pull/12'
task: >-
  language from the coach is very confusing. spits out a bunch of hero names and
  damage, but is not clear about who that damage is coming from or who it is
  hitting.
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/language-from-the-coach-is-very-confusing-spits-out-a-bunch-
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-04-language-from-the-coach-is-very-confusing-spits-out-a-bunch-
---

## Task (from SELECT)
language from the coach is very confusing. spits out a bunch of hero names and damage, but is not clear about who that damage is coming from or who it is hitting.

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
5-persona council on the gap between "confusing language" and the goal ("trustworthy, clear coaching").

- **First-Principles Thinker** — The complaint decomposes into (a) a DATA-format bug and (b) a missing PROMPT rule. (a) In `coaching_agent._fmt_key_fights` the participant line renders `"12,345 hero dmg dealt, 3,456 taken (to Lion, Axe)"` — the `(to ...)` is the damage-*dealt* target breakdown, but it sits immediately after "taken", so it reads as who the damage was taken from. Direction is genuinely ambiguous in the data we hand the model. (b) Nothing in `_SYSTEM` tells the coach to phrase damage/kills as attacker → target; so it echoes "a bunch of hero names and damage" (the DAMAGE OUTPUT list + fight totals) as bare numbers without saying who hit whom.
- **Contrarian** — The reviews aren't *always* unclear (a sampled real review reads "Lifestealer netted +772g", "Dark Seer banked +3896 XP" — fine). So don't gut the data; the fix is (i) remove the one ambiguous construct and (ii) add a language rule, not rewrite every section.
- **Executor** — Branch-sized: one focused edit to `_fmt_key_fights`'s damage line (make direction explicit, attach the target breakdown to "dealt"), a header tweak on DAMAGE OUTPUT ("dealt"), and a new "how to talk about damage/kills" block in `_SYSTEM`. No data-pipeline change, no new fields.
- **Outsider** — A player wants "Lifestealer bursted your Zeus for 1.8k in 2 seconds", not "Lifestealer 18,000, Zeus 0". The coach should translate numbers into who-did-what-to-whom; raw hero+number lists are what feels like a data dump.
- **Expansionist (deferred)** — Auto-generating natural-language fight narration in the data layer, or a glossary — out of scope; a prompt rule + unambiguous data is enough.

## Refined task spec
**Make the coach attribute damage/kills clearly (who → whom), in the Dota repo (`C:/Users/liamm/Scripts`).**

1. **Fix the ambiguous data line (`coaching_agent._fmt_key_fights`)** — rewrite the participant damage string so direction is never conflated: the target breakdown attaches to damage *dealt*, e.g. `dealt 12,345 hero dmg (to Lion 5,000, Axe 3,000), took 3,456` — not `... taken (to Lion, Axe)`. Keep the OpenDota-only fallback (`damage_total`) working.
2. **Clarify the DAMAGE OUTPUT header (`_build_prompt`)** — say "hero damage DEALT" so a total with no target isn't mistaken for damage received.
3. **Add a language rule to `_SYSTEM`** — a short "TALKING ABOUT DAMAGE & KILLS" block: always name who dealt the damage and who took it (attacker → target); when citing a fight, say who killed/bursted whom rather than reciting totals; do NOT dump a list of hero names with raw damage numbers — turn the numbers into readable cause and effect.

Out of scope (logged follow-ups): data-layer natural-language fight narration; the stray `�` mojibake seen in one stored review (an encoding issue, not an attribution one).

## Definition of done
- The KEY FIGHTS participant line states damage **direction unambiguously** — the `(to …)` target list attaches to damage *dealt*, never sitting after "took"/"taken".
- The DAMAGE OUTPUT section header reads "…DEALT…".
- `_SYSTEM` carries an explicit attacker→target attribution rule that bans bare hero-name+number dumps.
- No regression: spells, disables, wasted casts, and the OpenDota-only `damage_total` fallback still render; older cached analyses (no `hero_damage`/`damage_taken`) still format cleanly.
- Adversarial verify covers: participant with only `damage_to`, only `hero_damage`, both, neither; `damage_taken` present/absent; confirm the target breakdown is never adjacent to "took" in any branch.

## Implementation
- branch: `auto/language-from-the-coach-is-very-confusing-spits-out-a-bunch-` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-04T18:22

### Checkpoint log
- 2026-09-04T18:22 — branch created; supervised implementation started.
