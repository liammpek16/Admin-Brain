---
type: cycle
project: Admin Brain
stage: implement
status: active
task: >-
  allow for hiding of completed goals. All completed goals should automatically
  sort to the bottom of the goals list.
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/hide-and-sort-completed-goals
target_path: 'C:/Users/liamm/Admin-Brain'
report: 2026-09-04-hide-and-sort-completed-goals
---

## Task (from SELECT)
allow for hiding of completed goals. All completed goals should automatically sort to the bottom of the goals list.

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
**Contrarian** — "Sort completed to the bottom" must not silently rewrite the roadmap on every page load. The stored order IS the roadmap (and is drag-editable); auto-sorting the file would fight drag-reorder and mutate the vault behind the user's back. Sorting must be **display-only**; the file changes only on an explicit drag.

**First-principles thinker** — Two independent concerns: (1) an ordering rule at render time (open goals first, done goals last, each keeping its stored order) and (2) a per-viewer visibility preference (hide the done ones). Neither needs a server change — both are pure front-end over the data already returned by `/api/goals`. The hide preference is a per-viewer convenience → `localStorage`, like the goal drafts already are.

**Expansionist** — This composes cleanly with the new checkpoint/improvement groups: the sort + hide apply *within each group*. A single board-level toggle is enough; per-project toggles are scope creep.

**Outsider** — Hiding must be discoverable and reversible, and it must be obvious that goals are hidden (not lost): a labeled toggle in the panel header, and each group still shows how many done goals exist even when they're hidden (a muted "+N done"). An empty-but-all-done group should say "all done", not look broken.

**Executor** — Front-end only, in `loadGoals` + one header control + a persisted flag. Keep drag working (done goals stay draggable). Don't touch the server or the vault accessor. Respect the existing draft-preservation logic in `loadGoals`.

## Refined task spec
Within each project's goal groups, always render **open goals first and completed goals last** (each keeping its stored order — display-only, never rewriting the plan note on load), and add a board-level **"hide completed"** toggle that removes done goals from view.

- **Auto-sort (display)**: in `loadGoals`, order each kind-group's items as `[...open, ...done]`. Do not call reorder on load; the roadmap file is unchanged until the user drags.
- **Hide toggle**: a labeled checkbox in the PROJECT GOALS panel header; its state persists in `localStorage` (per-viewer, like goal drafts) and survives reload. When on, done goals are not rendered.
- **Honest counts**: each group header shows the open count plus a muted `+N done` when completed goals exist (visible even while hidden), so nothing looks lost. A group with only completed goals shows `all done ✓` when hidden, or the done goals (at the bottom) when shown.
- Drag-reorder, run, delete, ✕, and reclassify keep working on whatever rows are visible; hiding is purely visual.
- No server or vault-accessor changes.

## Definition of done
- In every group, completed goals appear **below** all open goals; open-goal order is unchanged and no plan note is rewritten just by loading the board.
- A "hide completed" toggle in the panel header hides/shows all done goals; its state **persists across reload** (localStorage) and re-renders immediately on change.
- While completed goals are hidden, each affected group still shows a `+N done` indicator (they're hidden, not deleted); a group whose only goals are completed reads `all done ✓`.
- Toggling does not disturb an in-progress goal draft or the checkpoint/improvement grouping; drag/run/delete/reclassify still work on visible rows.
- Behavior is covered by an automated test of the pure sort/partition helper; `npm test` and a live browser pass (toggle + reload persistence + sort order) are green with no console errors.

## Implementation
- branch: `auto/hide-and-sort-completed-goals` (stacked on `auto/goals-split-improvements-checkpoints`).
- **Front-end only** (no server / accessor change):
  - `hud/public/goals-view.js` (new classic script, loaded before app.js): pure `partitionCompleted`
    + `sortGoalsForDisplay` (open first, done last, stable) — attached to `window`, framework-free.
  - `hud/public/app.js`: each kind-group renders `sortGoalsForDisplay(gs)` (or just open goals when
    hidden); header shows the open count plus a muted `+N done`; empty group reads `all done ✓` when
    only completed goals exist and they're hidden. `readHideCompleted`/`writeHideCompleted` persist the
    toggle in localStorage (like the goal drafts); the `#hide-completed` checkbox reflects + re-renders.
  - `hud/public/index.html`: the "hide completed" toggle in the PROJECT GOALS header; `goals-view.js`
    script tag. `hud/public/style.css`: `.goals-toggle` / `.gdone-count`.
- `test/goals-view.test.js`: loads the shipped `goals-view.js` in a `vm` sandbox and checks the sort/
  partition rule (open-first/done-last, stability, empty/non-array).

### Checkpoint log
- pure helper + view wiring + toggle + persistence + CSS + test implemented on the stacked branch.
- `npm test` green (11/11); live browser: sort order `OOOOODDDDDDDDDDD`, hide toggles + persists across
  reload, `+N done` indicator stays, no console errors.

## Verification — see report `2026-09-04-hide-and-sort-completed-goals`
**Verdict: pass.** Completed goals sort below open ones (display-only; no plan-note rewrite on load);
the header toggle hides them and persists across reload; each group keeps a `+N done` indicator so
nothing looks lost; drafts and the checkpoint/improvement grouping are undisturbed; 11/11 automated +
live browser, no console errors.
