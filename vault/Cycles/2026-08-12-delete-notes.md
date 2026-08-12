---
type: cycle
project: Admin Brain
stage: verify
status: done
task: delete notes
started: '2026-08-12'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/delete-notes
target_path: 'C:/Users/liamm/Admin-Brain'
report: 2026-08-12-delete-notes
---

## Task (from SELECT)
delete notes

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
_Scope (confirmed with the user): a HUD control to **delete an existing vault note** — the records
that safely accumulate (completed cycle notes + their reports; old Daily/Metrics caches) — never core
data. The HUD already lists **completed cycles** (`#cycles-list` in the FEATURE LOOP panel), so that's
the natural home for a delete control. This is destructive, so the design is mostly about **guards**._

**🔴 Contrarian** — The danger isn't the delete, it's deleting the WRONG thing. A single loose
endpoint that unlinks any path is a foot-gun (traversal, or nuking `Projects/`/`Plans/` = your source
of truth). Lock it down: a **folder allowlist** (Cycles/Reports/Daily/Metrics only — never Projects,
Plans, Sessions, _Dashboards, Home), **path-safety** (resolve inside the folder, reject `..`/absolute),
**one named file per call** (no globs/bulk), and for Cycles **done/abandoned only** (never delete an
in-flight cycle). And require a **confirm** in the UI. It's git-tracked, so a delete is recoverable —
say so.

**🔵 First-Principles** — "Delete a note" = remove one file, safely. The safety is a whitelist + a
path check + a status check; the action is `fs.unlink`. The UI is a ✕ on things already shown.

**🟢 Expansionist** — A guarded `deleteNote(folder, name)` becomes the one safe primitive for any
future "tidy up" affordance (clear old caches, prune reports) — all gated by the same allowlist.

**⚪ Outsider** — I finished a cycle; I want to click ✕ on it and have its note (and report) gone from
the board, after a quick "are you sure?". I never want to accidentally delete a project.

**🟡 Executor** — Branch-sized: `vault.js deleteNote(folder, name)` (allowlist + path-safe +
Cycles-done-only) → `POST /api/note/delete {folder, name}`; front-end adds a **✕** to each completed-
cycle row that `confirm()`s, deletes the cycle note **and its report** (two calls), then reloads.

**Gap:** the task is a *safe, guarded* delete of the accumulating records — the whole value is the
guards (allowlist, done-only, path-safety, confirm), not the unlink.

## Refined task spec
**Add a guarded "delete note" capability to the HUD, surfaced on completed cycles.**
- **`vault.js deleteNote(folder, name)`** → `{ ok, error? }`:
  - **Allowlist** `folder ∈ { Cycles, Reports, Daily, Metrics }` — reject anything else (Projects,
    Plans, Sessions, _Dashboards, Home, …).
  - **Path-safe:** `name` is a bare filename (no `/`, `\`, `..`); resolve the target under
    `vault/<folder>/` and confirm it stays inside; require `.md`; must exist.
  - **Cycles guard:** only delete when the cycle's `status` is `done` or `abandoned` (never an
    in-flight cycle).
  - Then `fs.unlink`. (Files are git-tracked → recoverable; no separate trash.)
- **`server.js POST /api/note/delete { folder, name }`** → `deleteNote`; 200 ok / 400 with the reason.
  127.0.0.1, no shell.
- **Front-end:** a small **✕** button on each **completed-cycle** row (`#cycles-list`). Click →
  `confirm("Delete this completed cycle's note (and report)? Recoverable via git.")` → delete the
  cycle note, and its `report` if present (two `deleteNote` calls) → `loadCycles()` + `loadOverview()`.
  Show the result in the loop log.
- Server stays $0/no-LLM. **Out of scope:** deleting active cycles, projects, plans, or sessions; a
  trash/undo UI (git is the safety net); bulk delete; a general notes-capture feature.

## Definition of done
- `POST /api/note/delete` deletes a **done** cycle note and its report; a subsequent `/api/cycles`
  no longer lists it.
- **Rejected (400, nothing deleted):** a disallowed folder (e.g. `Projects`/`Plans`); a path-traversal
  `name` (`../…`, absolute, or with slashes); a non-existent file; a Cycles note whose status is **not**
  done/abandoned (in-flight).
- The completed-cycles list shows a ✕ that, after a confirm, removes the cycle (and report) and the
  row disappears on reload.
- No new deps; server $0/no-LLM; only Cycles/Reports/Daily/Metrics are ever deletable; existing HUD
  unaffected.
- Verified with a throwaway note (create → delete via endpoint → gone) plus the rejection cases; core
  notes (a Projects/Plans file) proven **undeletable**.

## Implementation
- branch: `auto/delete-notes` in `C:/Users/liamm/Admin-Brain` (off `main`) — never touches main
- started: 2026-08-12T22:34

### Checkpoint log
- 2026-08-12T22:34 — branch created; supervised implementation started.

- 2026-08-12T06:05 — Built the guarded delete. `vault.js deleteNote(folder,name)` (allowlist
  Cycles/Reports/Daily/Metrics; path-safe — bare .md, no sep/`..`/absolute, must resolve inside the
  folder; Cycles = done/abandoned only; `fs.unlink`). `server.js` `POST /api/note/delete`. Front-end:
  a ✕ on each completed-cycle row → `confirm()` → deletes the report (if any) then the cycle note →
  reload. style.css: red-hover ✕. Tested (throwaways only; real notes untouched): REJECTS Projects/
  Plans folders, `../`/absolute/slashes, nonexistent, and an in-flight cycle; DELETES a throwaway
  done cycle + report + Daily cache (function AND endpoint); UI ✕ deletes report+cycle and the row
  disappears. 13 real cycles + core notes all intact after the run.

### Result — DoD check
- ✅ `POST /api/note/delete` removes a done cycle note (+ report); `/api/cycles` no longer lists it.
- ✅ Rejects (400, nothing deleted): disallowed folder (Projects/Plans), traversal/absolute/slashes,
  nonexistent, and an in-flight (non-done) Cycles note.
- ✅ Completed-cycles ✕ → confirm → removes cycle (+report); row gone on reload.
- ✅ No new deps; server $0/no-LLM; only Cycles/Reports/Daily/Metrics deletable; core notes proven undeletable.

**Implement complete.** Ready for Phase D (verify).

## Verify (Phase D)
Independent pass: **pass** (12 checks, throwaways only, real notes intact throughout). Guards hold on
every path: rejects Projects/Plans folders, dot-dot/absolute/slashes/Windows-backslash traversal,
empty/bare dot-dot, case variants (cycles/CYCLES/reports), nonexistent, and in-flight (non-done)
cycles; deletes a throwaway done cycle+report+Daily via function, endpoint, and the UI x (confirm)
with the row disappearing; md-less names append the extension. Core notes proven undeletable. Minor
notes (not blockers): Reports/Daily/Metrics have no status-guard (reachable only via the raw endpoint;
the UI exposes delete on completed cycles only; git-recoverable); orphan-report possible via the raw
endpoint (the UI deletes both). Report: [[2026-08-12-delete-notes]].

_Cycle complete (Admin-Brain PR #6 draft, awaiting your review/merge)._

## Course correction (review feedback)
At review the user redirected the feature: **the delete control should live in the PROJECT GOALS
panel and remove a _goal_ — not sit in the FEATURE LOOP panel deleting cycle-note files.** The branch
was reshaped accordingly (still `auto/delete-notes`, PR #6):

- **Removed** the note-file path entirely — `vault.js deleteNote()` + the `Cycles/Reports/Daily/Metrics`
  allowlist, `POST /api/note/delete`, the ✕ on completed-cycle rows, and its CSS.
- **Added** `vault.js deleteProjectGoal(project, text)` — removes the matching `## Steps` goal-BLOCK
  (its checkbox line **and** its indented Delivered/meta sub-lines), refuses if the goal isn't found or
  the project has no roadmap, and no-ops nothing else. Roadmap files are git-tracked → recoverable.
- **Refactor:** factored the shared `## Steps` block parsing into `parseSteps`/`writeSteps`, now used by
  **both** `reorderProjectGoals` and `deleteProjectGoal` (single source of truth for goal-block handling).
- **`POST /api/project/delete-goal { project, goal }`** → 200 ok / 400 with the reason. 127.0.0.1, no shell.
- **HUD:** a hover-reveal **✕** on every goal in the goals board → `confirm()` → deletes → reloads
  (goals + overview, so milestone % updates).

**Re-verified (throwaways only; real notes untouched):** 14/14 vault checks (rejects unknown project /
unknown goal / empty; deletes a done goal incl. its `_Delivered_` sub-line; preamble kept; reorder still
works after the refactor; rejects non-permutation) + 5/5 endpoint checks over HTTP (goals list; unknown
project→400; unknown goal→400; delete→200; goal removed, siblings intact). Live server confirmed serving
the new assets. Only vault change on disk is the pre-existing roadmap edit.
