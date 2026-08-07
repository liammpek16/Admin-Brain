---
type: cycle
project: Admin Brain
stage: verify
status: done
task: >-
  Goals board: browse every project's goals and manually run one through the
  loop (alternative to auto-select)
started: '2026-08-07'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/goals-board-browse-every-project-s-goals-and-manually-run-on
target_path: 'C:/Users/liamm/Admin-Brain'
report: 2026-08-07-goals-board-browse-every-project-s-goals-and-manually-run-on
---

## Task (from SELECT)
Goals board: browse every project's goals and manually run one through the loop (alternative to auto-select)

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
_Grounding: a project's "goals" already exist — they're the checkbox steps in its roadmap
(`vault/Plans/*-roadmap.md`), the same lines that drive the milestone progress %. Today the HUD
only surfaces the single derived `next`, and only the auto-ranker (`select`) chooses what enters
the loop. The ask is a manual entry point: see the whole roadmap, pick any incomplete goal, run it._

**🔴 Contrarian** — Don't invent a second goals store or a new per-goal "priority" field, and don't
reimplement cycle creation. The goals are the roadmap checkboxes; "run this goal" is just *set
`next` = the goal* then the `select --project` you already built. The only real risks: (a) letting
the board write an arbitrary `next` (injection) — so validate the goal exists in the roadmap; and
(b) opening a 2nd cycle for a project mid-flight — the existing one-open-cycle guard already covers
that, just reflect it in the UI.

**🔵 First-Principles** — Decompose: (1) *read* goals = parse roadmap checkbox lines → {text, done};
(2) *choose* = set `project.next` to the picked goal; (3) *run* = open a cycle bypassing the ranker.
(2)+(3) are `setProjectNext` + `select --project`. Nothing downstream changes — refine/implement/
verify already key off `next`. So this is a thin new *entry point*, not a new pipeline.

**🟢 Expansionist** — This generalizes how work enters the loop: **auto** (ranker picks the top
`next`) vs **manual** (you pick a specific roadmap goal). It also makes the roadmap *actionable*
instead of a passive tally — every goal becomes a launch button.

**⚪ Outsider** — I want to look at Dota's six goals and run "per-fight video playback" even though
the ranker would never surface it yet. Show me all of them; give me a button per goal.

**🟡 Executor** — Branch-sized: `vault.js` gains `projectGoals(name)` (parse roadmap checkboxes →
{text, done, meta}) + `setProjectNext(project, text)`; `server.js` gains `GET /api/goals` and
`POST /api/loop/select-goal {project, goal}` (validate goal ∈ roadmap & not done & no open cycle →
setNext + run `select --project`); front-end gains a GOALS panel with a "▸ Run" button per
incomplete goal, disabled when that project has a cycle in flight. Server stays $0/no-LLM.

**Gap closed:** auto-select exposes one `next` per project and ranks; the goals board exposes the
**whole roadmap** and lets you override the ranker to run any incomplete goal.

## Refined task spec
**Add a manual "Goals board" to the HUD as an alternative loop entry point.**
- `vault.js` → `projectGoals(name)`: from the project's Plans notes, parse top-level checkbox lines
  (`- [ ] text — horizon · priority`) into `{ text, done, meta }` (strip the trailing ` — meta`).
  Done goals are shown but not runnable.
- `vault.js` → `setProjectNext(project, text)`: set the human-owned `next` (bump `updated`); return
  false if the project note isn't found.
- `server.js` → `GET /api/goals`: `[{ name, status, hasOpenCycle, goals: [...] }]` for every project
  (`hasOpenCycle` = a cycle for it is in flight, past select & not done/abandoned).
- `server.js` → `POST /api/loop/select-goal { project, goal }`: reject (ok:false + reason) if the
  goal isn't an incomplete roadmap goal of that project, or the project already has an open cycle;
  otherwise `setProjectNext` then run `select --project "<project>"` and return its output. All
  127.0.0.1, no shell.
- Front-end: a **PROJECT GOALS** panel — each project grouped, its goals listed (✓ + dim for done),
  each incomplete goal with a **▸ Run** button (disabled + "in flight" note when `hasOpenCycle`).
  Clicking runs select-goal, then refreshes overview + cycles so the new cycle appears in the loop.
- Server stays **$0 / no-LLM** (parsing + spawning the deterministic `select` only).
- **Out of scope:** editing/reordering goals from the HUD; per-goal weights; the auto-ranker itself.

## Definition of done
- `GET /api/goals` returns each project's roadmap goals with correct `done` flags (Dota 6, Admin
  Brain ≥3, Job Hunt 5, etc.) and a correct `hasOpenCycle`.
- `POST /api/loop/select-goal` with a valid incomplete goal sets that project's `next` to the goal
  and opens a cycle at `awaiting-approval` (cycle note exists; its `task` == the goal).
- It **rejects**, with a reason, each of: a done goal; a goal not in the roadmap; a project that
  already has a cycle in flight.
- The PROJECT GOALS panel renders per-project goals (done ones marked), Run appears only on
  incomplete goals and is disabled when a cycle is in flight; clicking Run makes the cycle show up
  in the FEATURE LOOP panel.
- No new dependency; server runs no LLM; SELECT / approve / run / project-update all still work.

## Implementation
- branch: `auto/goals-board-browse-every-project-s-goals-and-manually-run-on` in `C:/Users/liamm/Admin-Brain` (off `main`) — never touches main
- started: 2026-08-07T18:33

### Checkpoint log
- 2026-08-07T18:33 — branch created; supervised implementation started.
- 2026-08-07T18:45 — Built the goals board. `vault.js`: `projectGoals(name)` (parses top-level
  roadmap checkboxes → {text, done, meta}) + `setProjectNext`. `server.js`: `GET /api/goals`,
  `POST /api/loop/select-goal` (validates goal ∈ roadmap & not done & no in-flight cycle →
  setNext + `select --project`), `inFlightProjects()`. Front-end: PROJECT GOALS panel + Run
  buttons (wired via `loopPost`). Manually tested through the running HUD: `/api/goals` returns
  6/6/5 goals with correct done + hasOpenCycle; select-goal rejects done/non-roadmap/in-flight
  and succeeds (opened a Dota cycle, then reverted the test). No console errors.

### Result — DoD check
- ✅ `GET /api/goals` returns each project's goals + correct `done` and `hasOpenCycle`
  (Dota 6, Admin Brain 6, Job Hunt 5; Admin Brain & Job Hunt flagged in-flight).
- ✅ `select-goal` on a valid goal sets `next` and opens a cycle at `awaiting-approval`.
- ✅ Rejects (with reason): a done goal; a goal not in the roadmap (injection guard); an
  in-flight project.
- ✅ PROJECT GOALS panel renders; Run only on incomplete goals, replaced by "in flight" when a
  cycle is open; the new cycle appears in FEATURE LOOP.
- ✅ No new dependency; server runs no LLM; existing endpoints unaffected.

**Implement complete.** Ready for Phase D (verify).

## Verify (Phase D)
Independent adversarial pass: **pass-with-notes** (8 checks). Core is solid — injection guard holds
(non-roadmap goal refused; the goal is never a shell arg; a colon/comma goal round-trips YAML-safe),
done/in-flight rejections work, the happy path opens a proper cycle, and the server stays $0/no-LLM.
**One confirmed gap:** `hasOpenCycle`/`select-goal` only count cycles *past* select, so running a
second different goal before approving the first creates a duplicate select-stage proposal (A2/A3).
Report: [[2026-08-07-goals-board-browse-every-project-s-goals-and-manually-run-on]].
**Recommended follow-up (⑤ → ①):** "Count select-stage proposals as open in the goals board (broaden
`hasOpenCycle` + the `select-goal` guard) so a project can't accumulate duplicate proposals."

_Cycle complete (Admin-Brain PR #1 draft, awaiting your review/merge)._

## Post-verify follow-ups (same branch / PR #1)
Applied on the branch before merge, at the user's request:
1. **Fixed the verify finding (duplicate proposals).** `hasOpenCycle` and the `select-goal` guard
   now use `projectsWithOpenCycle()` — counts **any** non-done cycle, including an unapproved
   select-stage proposal. Verified: run goal A → project shows in-flight → running goal B is
   rejected ("already has an open cycle …"), no duplicate note created.
2. **New feature — add goals from the HUD.** `vault.js` `addProjectGoal(project, text)` appends a
   `- [ ] …` line under the roadmap's `## Steps` (creates a roadmap note if the project has none);
   rejects empty/duplicate/multi-line. `POST /api/project/add-goal`; each PROJECT GOALS group has a
   "+ write a new goal…" input + Add button (Enter also submits). Verified: add to Dota (existing
   roadmap), add to Betting (creates `betting-analysis-roadmap.md`), reject duplicate + empty.
