---
type: cycle
project: Admin Brain
stage: implement
status: active
task: >-
  add function to manually drag goals to determine which is at the top of the
  order
started: '2026-08-12'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/add-function-to-manually-drag-goals-to-determine-which-is-at
target_path: 'C:/Users/liamm/Admin-Brain'
---

## Task (from SELECT)
add function to manually drag goals to determine which is at the top of the order

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
_Grounding: the goals board (PROJECT GOALS panel) renders `projectGoals(name)` — the top-level
checkbox lines of the roadmap plan note, **in file order**. That order already IS the order
everything reads (the board, `select`, progress %). So "drag to reorder" = reorder those checkbox
lines in the roadmap and re-render. Wrinkle: ticked goals carry an indented `_Delivered (PR #n)…_`
sub-bullet that must move **with** its goal — a naïve line-swap would orphan or drop them._

**🔴 Contrarian** — Don't add a drag library or a separate `priority`/`order` field. The roadmap
Steps order is the single source of truth; a parallel order field would just drift from it. Native
HTML5 drag is enough. The ONLY real risk is the rewrite: move each goal's whole **block** (checkbox
line + its sub-bullets) atomically, and **refuse to write** unless the new order contains exactly the
same set of goals — no add, drop, or duplicate. A reorder must never lose a goal or a Delivered note.

**🔵 First-Principles** — "Which is at the top" = the sequence of `- [ ]` lines. Dragging reorders
DOM rows; persistence rewrites the Steps section in the dragged order. Read the new order back from
the DOM after the drop and send it — no index math to get wrong.

**🟢 Expansionist** — This turns the goals board into the real prioritization surface: `select`'s
manual pick + drag-ordering together let you fully drive the loop's queue from the HUD, no file edits.

**⚪ Outsider** — I grab a goal, pull it to the top, and that's what I run next — and it stays there
after a refresh.

**🟡 Executor** — Branch-sized: `vault.js reorderProjectGoals(project, orderedTexts)` (block-aware
rewrite of the roadmap Steps; refuse on set-mismatch) + `POST /api/project/reorder-goals`; frontend:
make `.goal` rows draggable within a project group, and on drop read the group's new goal order and
persist it, then reload. No dependency; server stays $0/no-LLM.

**Gap:** the task is UI drag that **persists to the roadmap** (not just a visual shuffle). The care
is atomic goal-block moves + a no-loss guard.

## Refined task spec
**Drag to reorder a project's goals in the HUD, persisted to the roadmap.**
- **`vault.js reorderProjectGoals(project, orderedTexts)`** — locate the project's roadmap plan;
  parse its `## Steps` into **goal-blocks** (each = a top-level `- [ ]`/`- [x]` line **plus** the
  following indented/sub-bullet lines, e.g. `_Delivered…_`); reorder the blocks to match
  `orderedTexts` (matched by goal text with the trailing ` — meta` stripped); rewrite via
  `upsertNote`, preserving each block verbatim + any preamble/trailing blank lines. **Refuse**
  (`{ok:false}`, file untouched) unless `orderedTexts` is exactly the set of existing goal texts
  (no add/drop/dupe).
- **`server.js POST /api/project/reorder-goals { project, order:[text,…] }`** → `reorderProjectGoals`;
  200 on success, 400 on mismatch/unknown project. 127.0.0.1, no shell.
- **Front-end** — in the PROJECT GOALS panel, make each `.goal` row `draggable` (add `data-goal` to
  the row, `data-project` on the group); native `dragstart`/`dragover`/`drop` reorder rows **within
  the same project group only**; on drop, read the group's new goal order from the DOM, POST it, then
  `loadGoals()`. A grip affordance/cursor; a subtle dragging style.
- Server stays **$0/no-LLM**. **Out of scope:** cross-project moves; reordering the projects
  themselves; touching `select`/progress (they already read file order).

## Definition of done
- Dragging a goal to a new position within its project **persists**: after `loadGoals()`/refresh the
  roadmap Steps order matches, and every goal's `done` state, ` — meta`, and `_Delivered…_`
  sub-bullet are intact — **no goal added, dropped, or duplicated**.
- `POST /api/project/reorder-goals` with a valid permutation reorders the file; with a mismatched
  set (missing/extra/dupe) → **rejected, file unchanged**.
- `projectGoals` returns the same goals in the new order; progress % unchanged; `select` reads it.
- Verified on the Admin Brain roadmap (which has ticked goals with `_Delivered_` sub-bullets): move a
  goal up via the endpoint → file order + sub-bullets preserved; and drag works in the browser.

## Implementation
- branch: `auto/add-function-to-manually-drag-goals-to-determine-which-is-at` in `C:/Users/liamm/Admin-Brain` (off `main`) — never touches main
- started: 2026-08-12T00:10

### Checkpoint log
- 2026-08-12T00:10 — branch created; supervised implementation started.

- 2026-08-12T03:15 — Built drag-to-reorder. `vault.js reorderProjectGoals(project, orderedTexts)`
  (block-aware: each goal's checkbox line + its indented sub-bullets move together; refuses unless
  the order is an exact permutation of existing goals) + `POST /api/project/reorder-goals`. Front-end:
  `.goal` rows now `draggable` with a ⠿ grip; native dragstart/dragover/drop reorder within a project
  and persist on drop, then reload. Tested: reorder via node fetch persists (moved-to-top, set + count
  preserved); a synthetic browser drag persisted end-to-end; done-state + ` — meta` + all 3 Delivered
  sub-bullets preserved on a move; bad-set order → 400, file unchanged.

### Result — DoD check
- ✅ Dragging a goal persists to the roadmap Steps order; done/meta/`_Delivered_` sub-bullet intact;
  no goal added/dropped/duplicated.
- ✅ `POST /api/project/reorder-goals` valid permutation reorders; mismatched set → rejected (400),
  file unchanged.
- ✅ `projectGoals` returns the same goals in the new order; count/progress unchanged.
- ✅ Verified on the Admin Brain roadmap (ticked goals w/ Delivered sub-bullets) + synthetic drag.

**Implement complete.** Ready for Phase D (verify).

