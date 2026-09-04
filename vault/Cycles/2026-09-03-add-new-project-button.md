---
type: cycle
project: Admin Brain
stage: verify
status: done
task: add new project button
started: '2026-09-03'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/add-new-project-button
target_path: 'C:/Users/liamm/Admin-Brain'
report: 2026-09-03-add-new-project-button
---

## Task (from SELECT)
add new project button

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
**Contrarian** — A button that merely creates a note can leave the HUD inconsistent if it skips the project data contract, duplicates a filename, or does not make a new project immediately actionable.

**First-principles thinker** — A project is a `vault/Projects` note with the required human-owned fields; its roadmap is optional and progress is derived. Creation must write the note through the existing vault adapter, then refresh the HUD from the vault rather than maintaining client-side state.

**Expansionist** — The form can include the useful project metadata already understood by the system (name, status, health, priority, next action, and optional repo/local path/webapp fields), but creation must remain a fast local, dependency-free path.

**Outsider** — A first-time user needs visible labels, safe defaults, inline validation, and a clear empty/success state. Duplicate or unsafe filenames must never overwrite an existing project note.

**Executor** — Keep this cycle narrowly focused on creation. Do not implement completed-goal filtering or improvements/checkpoints grouping here; they are the next two separate roadmap goals.

## Refined task spec
Add a `NEW PROJECT` control to the HUD's Projects panel. It opens an accessible, keyboard-operable form that creates a project note via a new validated vault accessor and a narrow `POST /api/project/create` route.

- Require a non-empty, single-line project name; normalize it to a safe note slug and reject a duplicate existing project name or target note.
- Default the new project to `planned`, `gray`, `med`, and an empty `next` field; support the existing optional project metadata only when supplied.
- Persist using the existing Obsidian adapter so the vault remains the sole source of truth. Do not introduce a second data store or client-side project cache.
- Return structured validation errors and render them next to the form; on success, close/reset the form, refresh the overview and goals board, and surface the created project immediately.
- Add focused automated coverage around valid creation, invalid/multiline names, duplicate prevention, defaults, and the API response. Verify the real HUD flow in a browser.

## Definition of done
- A user can create a project from the HUD with a keyboard and see it immediately in the Projects and Project Goals panels.
- The created `vault/Projects/<slug>.md` note has `type: project`, the requested name, and valid default values for `status`, `health`, and `priority`.
- Empty, multiline, unsafe, and duplicate names fail without modifying an existing note; the HUD explains why.
- The implementation uses the vault adapter/accessor and a narrow server endpoint, with no new dependencies or parallel state.
- New automated tests pass, the repository's test/build checks pass, and a manual browser pass confirms no console errors.

## Implementation
- branch: `auto/add-new-project-button` in `C:/Users/liamm/Admin-Brain` (off `main`) — never touches main
- `createProject(input)` added to `skills/vault/vault.js`: validates name (required, single-line, ≤120, must slugify to non-empty), rejects duplicates by name and slug, validates `status`/`health`/`priority` against the existing allow-lists, accepts only whitelisted optional metadata (`next`, `repo`, `local_path`, `webapp_url`, `webapp_cmd`, `webapp_cwd`), and persists via the existing `upsertNote` — no second data store.
- `POST /api/project/create` route in `hud/server.js`: 201 on success, 400 with `{ ok:false, error }` on rejection.
- `＋ NEW PROJECT` toggle in the PROJECTS panel header + an accessible, keyboard-operable form (`aria-expanded`/`aria-controls`, `role=status` `aria-live` for errors, focus moves to the name field on open). On success it resets/closes and refreshes overview + goals + cycles from the vault.
- Responsive form CSS (`.project-create*`) with a mobile breakpoint. `npm test` wired to `node --test`.

### Checkpoint log
- branch created off clean main; feature implemented (vault accessor + server route + HUD form).
- `node --test` green (2/2); 13/13 adversarial edge-case checks green; browser flow verified live.

## Verification — see report `2026-09-03-add-new-project-button`
Independent adversarial pass + live browser flow. **Verdict: pass.** DoD met: create-from-HUD works by keyboard and shows immediately in Projects + Project Goals; the note carries `type: project` and valid defaults; empty/multiline/unsafe/duplicate names are rejected without touching an existing note; vault-adapter-only, no new deps or parallel state; automated tests pass; no JS console errors (the only console line is the handled 400 on the validation-reject path, matching this repo's `add-goal`/`delete-goal` convention).
