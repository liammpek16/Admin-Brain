---
type: cycle
project: Admin Brain
stage: implement
status: active
task: add descriptions to feature goals
started: '2026-10-11'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
orchestrated: true
branch: auto/add-descriptions-to-feature-goals
target_path: 'C:/Users/liamm/Admin-Brain'
---

## Task (from SELECT)
add descriptions to feature goals

## Project goal — source: https://github.com/liammpek16/Admin-Brain
```
# Admin Brain

A personal **second brain + command center** for running my projects — a deterministic,
$0-core system layered over an [Obsidian](https://obsidian.md) vault, with a dark terminal
HUD and an autonomous feature-development loop.

The vault is the single source of truth. Everything else — the HUD, the brief, the skills —
reads from it and derives what it can, so the only things I hand-maintain per project are
`health`, `priority`, and `next`.

---

## Why it exists

I run several projects at once (Dota Coach, a Job Hunt helper, a betting analyzer, a stock
analyzer — and now Admin Brain itself). I wanted one place to:

- see every project's state at a glance,
- decide *what to work on next* without guessing,
- and actually **ship features autonomously** on a branch, with human gates, without ever
  touching `main`.

Admin Brain is now tracked *inside Admin Brain* — so its own roadmap, progress, and feature
work run through the same loop as every other project.

---

## Architecture

```
Admin-Brain/
├── vault/                    # Obsidian vault — the source of truth
│   ├── Projects/             # one note per project (health · priority · next)
│   ├── Plans/                # per-project roadmaps (milestone checkboxes → progress %)
│   ├── Sessions/             # coaching/work session logs
│   ├── Cycles/               # feature-loop state machine notes (one per task)
│   └── Reports/              # independent verification reports
├── adapters/obsidian/        # thin owned wrapper over the vault + git recency
├── skills/                   # the deterministic skills
│   ├── vault/                #   accessor: normalized projects, milestones, sessions
│   ├── metrics/  inbox/  trends/
│   └── select/  refine/  implement/  verify/   # the feature loop (Plan 2)
├── hud/                      # dark terminal HUD (Node http on 127.0.0.1:4173)
├── brief.js                  # `brief` — the daily standup command
├── plan.md                   # design plan (the brain)
└── plan_2.md                 # design plan (the autonomous feature loop)
```

### Principles
- **Adopt over invent.** The Obsidian layer uses reputable third-party skills
  ([kepano/obsidian-skills](https://github.com/kepano/obsidian-skills): bases, markdown,
  json-canvas, defuddle) rather than a hand-rolled brain.
- **Deterministic $0 core.** `metrics`, `trends`, `brief`, `select` use no LLM — just
  Node stdlib + `gray-matter` + `simple-git`. LLM usage is spent deliberately, only in the
  loop's *refine/implement/verify* stages.
- **Derived cache, not a hand-kept ledger.** I own three fields; the system derives the rest.
- **`main` is sacred.** All feature work happens on `auto/<task-slug>` branches via draft PRs.

---

## The two systems

### 1) The brain (Plan 1)
A read-only view over the vault:

| Command | What it does |
|---|---|
| `npm run brief` | Daily standup: what's active, stale, blocked, needing attention |
| `npm run metrics` | Per-project health/recency/progress rollup |
| `npm run trends` | Movement over time |
| `npm run inbox` | Things needing a decision |
| `npm run hud` | Launches the HUD at `http://127.0.0.1:4173` |

### 2) The feature loop (Plan 2)
A resumable 5-stage state machine that takes a project from "what's next" to a reviewed PR:

```
① SELECT   → deterministic ranking of the most important next step (I approve)
② REFINE   → an LLM council pressure-tests the task against the project README
③ IMPLEMENT→ autonomous build on auto/<task-slug>, checkpoint/resume, draft PR
④ VERIFY   → independent adversarial testing — try to break the feature, report honestly
⑤ REVIEW   → I review & merge; findings feed the next SELECT
```

Each cycle is a note in `vault/Cycles/`, keyed by task slug (multiple cycles per project/day
are fine). Reports land in `vault/Reports/`. Proven end-to-end on Dota Coach — the loop has
already caught real defects the implementer missed (e.g. two heroes whose coaching data was
being silently dropped due to stale hero names).

---

## The HUD

A dark, Jarvis-styled terminal dashboard: system vitals, a command deck (run `select`,
`metrics`, `inbox`, `brief`), schedule, and **live vault data**. Project `health` and
`priority` are editable inline and write straight back to the vault notes.

```bash
npm run hud    # then open http://127.0.0.1:4173
```

---

## Setup

```bash
npm install
npm run brief   # confirm it reads the vault
npm run hud     # open the dashboard
```

Requires Node.js (v24+) and the [GitHub CLI](https://cli.github.com/) (`gh`) for git recency
and the feature loop's PR steps.

---

## Status

Admin Brain is self-hosted — its own roadmap lives at
`vault/Plans/admin-brain-roadmap.md` and its project note at `vault/Projects/Admin Brain.md`.
See the roadmap for current goals and progress.
```

## Council refinement
Goal as written: "add descriptions to feature goals". Today a goal is one checkbox line — the only
place to say *what it means* is an ad-hoc `_Goal: …_` sub-line hand-written into the roadmap
(see "Feature Loop model optimization"), which the HUD never shows and the loop never reads.

- **Contrarian** — Don't invent a second storage format. A description must live in the same
  roadmap goal-block as the `_Delivered…_` lines, so reorder/delete/kind/edit keep carrying it for
  free. It must never be parsed as a goal itself, and it must not change milestone %.
- **First-Principles** — The point of a description is context for the loop: SELECT picks a
  one-line goal, and REFINE's council currently guesses the intent. The description should flow
  into the cycle note's task section so the council refines against it.
- **Expansionist** — Later: show descriptions in the voice agenda, let SELECT weigh them, add a
  description field on the add-goal row. **Out of scope** for this branch.
- **Outsider** — "Feature goals" = the roadmap goals on the PROJECT GOALS board (both kinds).
  Honour the existing precedent: read `_Goal: …_` as a description too, write `_Description: …_`.
- **Executor** — One branch: vault accessor + parse, one HUD route, a board UI affordance, and the
  refine brief. No deps, $0, front+back with unit tests.

**Gaps closed:** one storage format inside the goal-block · loop actually consumes it · legacy
`_Goal:` lines recognised · scope fenced.

## Refined task spec
1. **Vault (`skills/vault/vault.js`)** — a goal's description is its first sub-line matching
   `  - _Description: …_` (or legacy `_Goal: …_`). `projectGoals` returns `description` ('' if none).
   New `setProjectGoalDescription(project, goal, description)`: trims; empty → removes the line;
   otherwise inserts directly under the checkbox (or replaces the existing one, normalising a legacy
   `_Goal:` line to `_Description:`). Rejects unknown goal / multi-line text. Leaves every other
   line, done state, kind, meta, and Delivered lines untouched.
2. **HUD server** — `POST /api/project/goal-description` `{ project, goal, description }` → 200/400.
3. **HUD board** — each goal shows its description as a muted line under the text, plus a ≡ button
   that opens an inline wrapped textarea (Enter/blur saves, Esc cancels, empty clears). The 20s poll
   must not destroy an open description editor.
4. **Loop** — `refine.js` puts the matching goal's description under `## Task (from SELECT)` as
   `**Description:** …` so the council sees it.

## Definition of done
- [ ] `projectGoals` exposes `description`; `_Goal:` and `_Description:` both parse; a description
      line never counts as a goal (milestone % unchanged).
- [ ] set / replace / clear round-trip in a temp vault; other blocks byte-identical; reorder/delete
      carry the description with its goal.
- [ ] Rejects multi-line and unknown goals with no write.
- [ ] Route + HUD editor work live in the browser; poll doesn't wipe an open editor.
- [ ] REFINE brief includes the description; `npm test` green.

## Feasibility
**Verdict: go** (9/10) — advisory; the human gates decide.
- scores: clarity 2 · size 2 · cost 2 · risk 1 · testability 2
- total 9/10, no blockers

## Orchestration plan
| # | task | attributes | tier [score] | model | status | note |
|---|---|---|---|---|---|---|
| vault-description | Parse + set goal descriptions in the vault accessor (+ unit tests) | feature, 2f, known, amb low, risk med | standard [3] | `sonnet` | pending |  |
| hud-description | HUD route + inline description editor on the goals board | feature, 3f, known, amb low, risk low | standard [2] | `sonnet` | pending |  |
| refine-description | Feed the goal description into the REFINE brief | mechanical, 1f, known, amb low, risk low | light [0] | `haiku` | pending |  |
| verify-description | Independent adversarial verify of descriptions | verify, 3f, known, amb low, risk med | standard [3] | `sonnet` | pending |  |

## Implementation
- branch: `auto/add-descriptions-to-feature-goals` in `C:/Users/liamm/Admin-Brain` (off `main`) — never touches main
- started: 2026-10-11T23:04

### Checkpoint log
- 2026-10-11T23:04 — branch created; supervised implementation started.

