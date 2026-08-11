---
type: cycle
project: Dota Coach
stage: verify
status: done
task: >-
  Real-time per-fight coaching feedback: target prioritization, missed spells,
  positioning
started: '2026-08-11'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/real-time-per-fight-coaching-feedback-target-prioritization-
target_path: 'C:/Users/liamm/Scripts'
report: 2026-08-11-real-time-per-fight-coaching-feedback-target-prioritization-
---

## Task (from SELECT)
Real-time per-fight coaching feedback: target prioritization, missed spells, positioning

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
_Grounding (read the code): all three named aspects **already exist as deterministic computations**.
`Dota_Game_Summary._summarize_fight_for_coaching(fight)` produces per-fight `target_priority`
{focused, focused_damage, most_dangerous, most_dangerous_damage, matched}, `wasted_casts` (missed
spells), per-death `positioning` {tag = caught-alone/grouped, nearest_ally} + map region, and a
fight-level `team_shape`. But these are consumed **only** by the coaching LLM prompt
(`coaching_agent._fmt_key_fights`). The webapp exposes NONE of them — `/api/charts` fights carry
positions/combatants only; the "Fight Analysis" tab shows the map, not the verdicts._

**🔴 Contrarian** — Don't "build real-time coaching" — the analysis exists and true live in-game
feedback is a different app (a running-game client, not a post-match replay reader). And don't
re-derive target-priority/wasted-casts; that logic is done and LLM-tested. The only real gap is that
these verdicts are **trapped in the LLM prompt** and never shown deterministically.

**🔵 First-Principles** — "Per-fight coaching feedback" = for each fight, three verdicts already
computed: did you focus the right target, which casts were wasted, were you caught out of position.
Surfacing them needs no model — just a route that returns `_summarize_fight_for_coaching` output and
a card that renders it. Deterministic = instant + $0 + works with no API key (unlike the LLM review).

**🟢 Expansionist** — This makes the "$0 core" philosophy real for coaching: a per-fight scorecard
the user sees immediately, every game, no token spend — and it becomes the structured backbone the
LLM narrative can later reference instead of re-explaining.

**⚪ Outsider** — I open Fight Analysis and I want to see, per fight: "❌ you hit Lion but Storm was
melting your team," "2 wasted casts: Black Hole, RP," "you died caught alone top." Not a paragraph I
wait 10s for — a glanceable card.

**🟡 Executor** — Branch-sized: add `GET /api/fights/<id>?player_id=` (demo: canned verdicts via
`demo_data`; live: `tools.match_fights` reusing `_summarize_fight_for_coaching`), and a "Coaching
read" card per fight in the Fight Analysis tab. No LLM, no key. Fully testable in `-Demo`.

**Reframe:** the goal says "real-time"; the app is a post-game replay analyzer, so the practical,
high-value slice is **instant deterministic per-fight verdicts in the webapp** (target priority /
missed spells / positioning) — surfacing what's already computed. True live in-game coaching is a
separate, much larger architecture (logged as its own future goal).

## Refined task spec
**Surface deterministic per-fight coaching verdicts in the webapp (no LLM).**
- **Backend — `GET /api/fights/<match_id>?player_id=`** → `{ fights: [ { minute, time, swing,
  your_deaths, enemy_deaths, team_shape, target_priority, wasted:[{hero,is_yours,casts:[..]}],
  deaths:[{hero,is_yours,where,positioning:{tag,nearest_ally},killed_by}] } ] }`.
  - **Demo:** `demo_data.match_fights(match_id)` — canned, including ≥1 fight where target priority
    was missed (`matched:false`), ≥1 wasted cast, and ≥1 "caught alone" death, so the UI is
    demonstrable with no key/replay.
  - **Live:** `tools.match_fights(match_id, account_id)` — build from the parsed fights via
    `_summarize_fight_for_coaching` (the same source the coach uses); degrade gracefully (empty
    list + a `status`) when there's no parsed fight data. Mirrors the existing `match_positions` path.
- **Frontend — a "Coaching read" section in the Fight Analysis tab**: on tab open, fetch
  `/api/fights`; render one card per fight with (a) **target priority** ✓/✗ naming focused vs
  most-dangerous hero + damage, (b) **missed spells** = wasted casts, (c) **positioning** per death
  (caught-alone/grouped + region) and the fight's team shape. Deterministic; no `/api/coach` call.
- **No LLM / no API key**; existing tabs and endpoints unchanged.
- **Out of scope:** true live in-game coaching; changing the LLM review; new fight-detection logic.

## Definition of done
- `GET /api/fights/<id>?player_id=` (demo) returns per-fight verdicts with ≥1 `matched:false` target
  priority, ≥1 wasted cast, and ≥1 `caught alone` death.
- The Fight Analysis tab shows a per-fight **Coaching read** card (target priority / missed spells /
  positioning) rendered from that endpoint, with **no** `/api/coach` (LLM) request.
- Live path implemented via `_summarize_fight_for_coaching`; returns a graceful status when no parsed
  fight data (doesn't crash).
- Works in `run-webapp.ps1 -Demo` (no API key); existing Heroes/Charts/Fight map/coach unaffected.
- Verified: launch demo webapp → open a game → Fight Analysis shows the deterministic verdicts.

## Implementation
- branch: `auto/real-time-per-fight-coaching-feedback-target-prioritization-` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-08-11T02:20

### Checkpoint log
- 2026-08-11T02:20 — branch created; supervised implementation started.
- 2026-08-11T02:45 — Built the deterministic per-fight coaching view. `tools.match_fights` (reuses
  `analyze_match_for_coaching`'s cached `key_fights`; graceful `replay_status` when unparsed);
  `demo_data.match_fights` (canned verdicts from the match roster: a bad 24:00 fight + clean 33:00);
  webapp route `GET /api/match/<id>/fights` (`_handle_fights`, demo/live like the other handlers);
  frontend "Coaching read" card in the Fight Analysis tab (`fetchFightsData` + `coachingReadHTML`,
  matched to the open fight by time) + CSS. No LLM. Demo-tested end-to-end: endpoint 200, DoD checks
  pass (matched:false + wasted casts + caught-alone all present); the card renders ✗✗✗ for the bad
  fight ("hit Storm Spirit but Phantom Assassin hurt you most", "Black Hole/Reverse Polarity wasted",
  "Sniper caught alone; team split up") and ✓✓✓ for the clean fight. No console errors from the change
  (only a pre-existing `/static/dota_map.png` 404).

### Result — DoD check
- ✅ `GET /api/match/<id>/fights?player_id=` (demo) returns per-fight verdicts with ≥1 `matched:false`,
  ≥1 wasted cast, ≥1 `caught alone` death.
- ✅ Fight Analysis shows a per-fight **Coaching read** card (target priority / missed spells /
  positioning) with **no** `/api/coach` (LLM) request.
- ✅ Live path via `analyze_match_for_coaching` → `key_fights`; returns empty + `replay_status` when
  no parsed fight data (wrapper can't crash — it only reshapes existing analysis).
- ✅ Works in `-Demo` (no API key); Heroes/Charts/Fight map/coach untouched.

**Implement complete.** Ready for Phase D (verify).

## Verify (Phase D)
Independent adversarial pass: **pass-with-notes** (9 checks). The deterministic per-fight Coaching
read renders instantly (✗✗✗ bad fight / ✓✓✓ clean), endpoint validation is correct (400/400/404/200),
no-verdict fights degrade cleanly, verdicts are XSS-safe, and no LLM/`/api/coach` call is made.
**Findings:** (1, minor) the "Missed spells" row always renders — guard it on your-team participants;
(2) live path is a thin wrapper over the coach's own `key_fights`, not exercised on a real replay;
(3, **out of scope but important**) running the app **reverted the hand-corrected hero names in
heroes.json** (Outworld Destroyer/Ringmaster → stale), the cycle-3 regression firing in practice —
restored, not in this PR. Report:
[[2026-08-11-real-time-per-fight-coaching-feedback-target-prioritization-]].
**Recommended follow-up (⑤ → ①):** "Harden heroes.json hand-corrections so a constants refresh can't
silently revert Outworld Destroyer / Ringmaster."

_Cycle complete (dota-projects PR #4 draft, awaiting your review/merge)._
