---
type: cycle
project: Admin Brain
stage: verify
status: done
task: >-
  adjust the goals section. Instead there should be a split between improvements
  versus checkpoints for each project
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/goals-split-improvements-checkpoints
target_path: 'C:/Users/liamm/Admin-Brain'
report: 2026-09-04-adjust-the-goals-section-improvements-vs-checkpoints
---

## Task (from SELECT)
adjust the goals section. Instead there should be a split between improvements versus checkpoints for each project

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
**Contrarian** — "Improvement vs checkpoint" is not a field the vault has, so any split needs a classification source. Inventing a parallel data store would violate the vault-is-truth principle; the split must be derived from the goal line itself, and existing untagged goals must not silently vanish from the board.

**First-principles thinker** — A goal is a top-level checkbox line in a plan note. The minimal, backward-compatible way to add a dimension is a trailing inline marker on that same line (`#checkpoint` / `#improvement`), parsed off exactly like the existing ` — meta` is. `kind` becomes a derived property alongside `text`/`done`/`meta`; the plan note stays the single source of truth and milestone-% (which counts every checkbox regardless) is unaffected.

**Expansionist** — Once goals carry a `kind`, the board can group them, adding can target a group, and a goal can be re-classified in place. But scope discipline: grouping + add-with-kind + reclassify is the branch; per-group ordering rules, counts-by-kind analytics, and cross-project rollups are follow-ups.

**Outsider** — A first-time viewer must still understand the board: clear group headings ("CHECKPOINTS" / "IMPROVEMENTS"), a sensible default for the dozens of already-written untagged goals (they should all appear, not disappear), and the existing Run / delete / drag / add affordances must keep working unchanged within each group.

**Executor** — Do NOT fold in goal 3 (hide/sort completed) here — that stacks next. Keep the data change tiny (one shared line-parser), reuse `parseSteps`/`writeSteps` for reclassify, and make `text`-matching (delete/reorder/run) keep working by stripping the kind tag everywhere `text` is derived.

## Refined task spec
Give every roadmap goal a derived **`kind`** — `checkpoint` or `improvement` — and split the HUD's PROJECT GOALS board into two labeled groups per project.

- **Data**: introduce one shared `parseGoalLine(line)` in `skills/vault/vault.js` that returns `{ done, text, meta, kind }`. `kind` comes from a trailing, case-insensitive `#checkpoint` / `#improvement` token stripped off the end of the line (before the ` — meta` split). **Untagged → `checkpoint`** (existing roadmap goals are milestone-style). `projectGoals` and `goalTextOf` both route through it, so `text` is always tag-stripped — delete/reorder/run keep matching on the same `text`.
- **Add with a kind**: `addProjectGoal(project, text, kind='checkpoint')` appends the correct `#tag`; reject an invalid kind. The HUD add-row gets a small kind selector.
- **Reclassify**: `setProjectGoalKind(project, text, kind)` rewrites just that goal's checkbox line (swap/insert the trailing tag) via the existing `parseSteps`/`writeSteps`; refuses if the goal isn't found. A `POST /api/project/goal-kind` route exposes it. Each goal row gets a control to flip its kind.
- **UI**: within each project, render two sub-lists under `CHECKPOINTS` and `IMPROVEMENTS` headings (each with its own count). An empty group shows a muted placeholder. Drag-reorder stays within a group; Run / ✕ / add unchanged.
- No new dependencies, no second data store. Tag is invisible in the displayed text (stripped like meta).

## Definition of done
- Every existing untagged goal appears on the board under **CHECKPOINTS** (nothing disappears); milestone-% is unchanged.
- Each project shows two labeled groups (CHECKPOINTS / IMPROVEMENTS) with per-group counts; an empty group renders a placeholder, not a broken layout.
- Adding a goal with a chosen kind writes the `#tag` and the goal lands in the right group; the tag is not visible in the goal text.
- Reclassifying a goal moves it between groups and persists to the plan note (survives reload); an unknown goal/kind is refused without corrupting the note.
- Run, delete (✕), and drag-reorder still work within each group (they match on the tag-stripped text).
- `parseGoalLine` is covered by automated tests (untagged default, both tags, tag + meta together, case-insensitivity); `npm test` and a live browser pass are green with no console errors.

## Implementation
- branch: `auto/goals-split-improvements-checkpoints` (stacked on `auto/add-new-project-button`).
- `skills/vault/vault.js`: shared `parseGoalLine()` → `{ done, text, meta, kind }`; a trailing
  `#checkpoint`/`#improvement` tag is stripped before the ` — meta` split, so `text` is always
  tag-free. `projectGoals` + `goalTextOf` both route through it (delete/reorder/run keep matching).
  `addProjectGoal(project, text, kind)` writes the tag only for improvements; new
  `setProjectGoalKind(project, text, kind)` flips a goal in place via `parseSteps`/`writeSteps`;
  `GOAL_KINDS` exported.
- `hud/server.js`: `add-goal` now forwards `kind`; new `POST /api/project/goal-kind`.
- HUD: the PROJECT GOALS board renders two labeled groups per project (CHECKPOINTS / IMPROVEMENTS,
  each with a count + empty-placeholder); a per-goal ⇄ button reclassifies; the add-row has a kind
  selector; drag-reorder is now constrained to within a single kind-list.
- `test/vault-goal-kind.test.js` added.

### Checkpoint log
- data model + accessor + route + UI + CSS + tests implemented on the stacked branch.
- `npm test` green (6/6); live browser pass (grouping on real data, add-with-kind, reclassify,
  guard) green.

## Verification — see report `2026-09-04-adjust-the-goals-section-improvements-vs-checkpoints`
**Verdict: pass.** All DoD criteria hold: existing untagged goals all appear under CHECKPOINTS
(nothing disappears, milestone-% unchanged); two labeled groups with counts + placeholders; add
lands in the chosen group with the tag invisible in the text; reclassify persists and survives
reload; run/delete/reorder still match on the tag-stripped text; 6/6 automated + live browser, no
JS console errors (only the handled 400 on the invalid-kind guard).
