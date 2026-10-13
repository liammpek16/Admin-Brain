---
type: cycle
project: Dota Coach
stage: done
status: done
task: should be able to call coaching analysis on each specific fight analysis.
started: '2026-09-11'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/should-be-able-to-call-coaching-analysis-on-each-specific-fi
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-11-should-be-able-to-call-coaching-analysis-on-each-specific-fi
---

## Task (from SELECT)
should be able to call coaching analysis on each specific fight analysis.

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
_5-persona council: gaps between the task ("call coaching analysis on each specific fight") and the goal of a trustworthy, actionable coaching platform._

- **First-Principles** — the natural unit of coaching feedback is a single fight ("why did I lose *this* fight, what should I have done"). Today the LLM coach is match-level only: `coaching_agent.web_start(match_id, account_id)` builds one review over the whole match's `key_fights`. A deterministic per-fight read already exists (`_handle_fights` → `tools.match_fights`, target priority / missed spells / positioning, PR #4) — this goal adds the *LLM* layer on top of one fight.
- **Contrarian** — a per-fight button that silently re-runs a full-match review would burn tokens for little new signal. The value only appears if the first user message is genuinely *scoped to one fight* (its heroes, casts, positioning, vision) and says so.
- **Expansionist (bounded)** — this could grow into a chat thread per fight; keep v1 to a single scoped analysis plus follow-ups reusing the existing conversation UI and `web_reply`.
- **Outsider** — the click belongs where the user is already looking at the fight: on each Fight Analysis card and/or the playback panel.
- **Executor** — reuse the existing plumbing: a fight-scoped context builder + a `fight_index` param on `POST /api/coach`, and a per-fight `conversation_id` namespace so fight convos resume independently of the match convo. Keep the parsed-replay gate and the `llm` (claude-code/API) seam.

## Refined task spec
_Branch-sized. Touches `agents/coaching_agent.py`, `webapp/server.py`, `webapp/index.html`; reuses `tools.match_fights` / `analyze_match_for_coaching`._

1. **Fight-scoped start** — add `coaching_agent.web_start_fight(match_id, account_id, fight_index)` (or a `fight_index=None` kwarg on `web_start`) that builds the first user message from a **single** `key_fights[fight_index]` (+ that fight's deterministic read, and positions if present), not the whole-match summary. Header names the fight (time / label).
2. **Independent conversation id** — namespace per-fight convos as `"{account}_{match}_f{index}"` so they persist and resume via `conversation_store` without colliding with the match-level `"{account}_{match}`.
3. **API** — `POST /api/coach` accepts optional `fight_index`; when present, route to the fight-scoped start. Follow-ups go through the existing `web_reply` on that conversation. Unparsed replay still returns 409 with no spend; `DEMO` returns a canned per-fight reply.
4. **UI** — a "Coach this fight" button on each Fight Analysis card (and/or the playback panel) that opens the coaching panel scoped to that fight and shows which fight it is.

Out of scope: real-time in-game coaching, multi-fight compare, changing the match-level review.

## Definition of done
- `POST /api/coach {match_id, player_id, fight_index}` returns a reply that references **only** that fight (its heroes/spells/positioning/vision) and is materially distinct from the match-level review.
- Per-fight conversation persists and resumes on reopen via the deterministic `_f{index}` id, independent of the match-level conversation (no cross-contamination).
- A per-fight coaching entry point is present in the UI; clicking it scopes the panel to that fight; follow-up messages work through `web_reply`.
- Unparsed replay → 409, **no tokens spent** (assert no model call). `DEMO` mode returns a canned fight-scoped reply.
- Existing whole-match coaching path is unchanged (regression).
- Works under both `DOTA_COACH_LLM=claude_code` and the API backend (no key assumptions beyond today's).

## Implementation
- branch: `auto/should-be-able-to-call-coaching-analysis-on-each-specific-fi` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-11T19:01

### Checkpoint log
- 2026-09-11T19:01 — branch created; supervised implementation started.
- 2026-09-11 — implemented: `web_start_fight` + `_build_fight_prompt` (single-fight brief, fight-local vision by timestamp), composite store key `<match>_f<idx>` (independent resume, kept out of durable profile); `/api/coach` `fight_index` routing + `_recover_convo` store-key parse + `ValueError→400`; DEMO canned fight reply; UI "Coach this fight" button per Fight Analysis card. Verified: py_compile clean, unit test (only selected fight + its vision, no leak), DEMO end-to-end (fight-scoped start + follow-up, match path unchanged), browser parse (no console errors). Committed, pushed, draft PR #27.
- 2026-09-11 — stage ④ VERIFY: adversarial pass (prompt scoping with no cross-fight leak, composite-key persistence + no collision, `_recover_convo` for both id shapes, index clamping, DEMO start+follow-up, unparsed 409/no-spend). Verdict **pass-with-notes**: all DoD met; latent note that per-fight sessions show in `list_conversations` as pseudo-matches (nothing surfaces it today; kept out of the durable profile). Report: [[2026-09-11-should-be-able-to-call-coaching-analysis-on-each-specific-fi]].
- 2026-09-11 — stage ⑤ REVIEW: PR #27 squash-merged to `main` (`d84cb47`); branch deleted; roadmap goal ticked. Cycle complete.
