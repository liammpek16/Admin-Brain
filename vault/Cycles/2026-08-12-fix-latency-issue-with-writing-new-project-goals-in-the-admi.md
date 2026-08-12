---
type: cycle
project: Admin Brain
stage: implement
status: active
task: fix latency issue with writing new project goals in the admin brain
started: '2026-08-12'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/fix-latency-issue-with-writing-new-project-goals-in-the-admi
target_path: 'C:/Users/liamm/Admin-Brain'
---

## Task (from SELECT)
fix latency issue with writing new project goals in the admin brain

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
_Measured root cause: after `POST /api/project/add-goal` the front-end runs
`Promise.all([loadOverview(), loadGoals()])`, and **each** of those calls `getProjects()`, which
loops the projects and `await`s `lastGitActivity(repo)` **sequentially** — a **network `gh api`
commits** call for every GitHub-repo project (Admin Brain, Dota Coach) plus a local `simple-git`
for Job Hunt. Timed: `getProjects()` ≈ **800–975 ms every call, uncached** (call #2 ≈ 800 ms too).
So adding a goal = **~2 s and ~4 network round-trips**, and the same tax hits every 20 s poll and
every refresh. The git *date* is all that's derived from these calls — it changes only on a commit._

**🔴 Contrarian** — Don't rip out git-recency or fire-and-forget it (the HUD would show stale/blank
activity). And a one-off "don't refresh overview after add-goal" only band-aids this one button —
the slowness is in `getProjects()` itself and hits the poll, the goals board, everything. Fix the
source: the repeated, serial, uncached network calls.

**🔵 First-Principles** — Recency is a slowly-changing fact (only a new commit moves it). Two levers:
(1) the per-project calls are independent → run them **in parallel**; (2) the result is reusable for
a while → **cache** it with a short TTL. Together, the first load drops to ~one round-trip and every
load within the TTL is instant — no network at all.

**🟢 Expansionist** — A tiny TTL cache in the adapter's `lastGitActivity` speeds up *everything* that
reads projects (overview, goals, brief, metrics, the poll), not just add-goal, and keeps the "always
fresh enough" feel without hammering `gh`.

**⚪ Outsider** — I type a goal, hit Add, and it should feel instant — not freeze for two seconds
while it phones GitHub twice.

**🟡 Executor** — Branch-sized: (a) in `adapters/obsidian`, wrap `lastGitActivity` in a TTL memo
(keyed by repo, ~60 s, caches the resolved date incl. null); (b) in `vault.js getProjects`, resolve
the per-project recency with `Promise.all` instead of the sequential `for…await`. Optional polish:
`addGoal` refreshes goals first, overview after. No new deps.

**Resolution:** Fix the source — **parallelize + TTL-cache the git-recency lookups**. Cold load goes
~2 s → ~one round-trip; warm loads (the 2nd getProjects on add-goal, and every poll within the TTL)
go instant. Recency stays correct (just cached ≤60 s).

## Refined task spec
**Make `getProjects()` fast: parallelize + cache the git-recency network calls.**
- **`adapters/obsidian/index.js`** — add a small in-memory TTL cache around `lastGitActivity(repo)`:
  key by the repo string, store the resolved `Date|null` with a timestamp, reuse it for `TTL` ms
  (~60 s). A cache hit does **no** network/`gh`/`simple-git` work. (In-flight de-dupe is a bonus but
  optional.) Export a way to bypass/clear if trivial; otherwise keep it internal.
- **`skills/vault/vault.js getProjects()`** — replace the sequential `for (const n of notes) { …
  await lastGitActivity … }` with a **`Promise.all`** over the notes so the per-project recency
  lookups run concurrently. Preserve the exact same output shape/fields and the note-mtime fallback.
- **Front-end (optional, small)** — in `addGoal`, refresh `loadGoals()` first (the panel the user is
  looking at) then `loadOverview()`, so the board updates as soon as possible.
- No behavior change other than speed; recency may be up to TTL seconds stale (acceptable — it only
  moves on a commit). No new dependencies; server stays $0/no-LLM.
- **Out of scope:** removing git recency; a persistent on-disk cache; changing what's displayed.

## Definition of done
- Cold `getProjects()` runs the per-project recency lookups **concurrently** (parallel), and a second
  `getProjects()` within the TTL returns with **no network calls** and near-instantly (≪ the ~800 ms
  baseline) — measured before/after.
- Adding a goal via the HUD no longer pays ~2 s: the second `getProjects` (and subsequent polls
  within the TTL) are cache hits.
- `getProjects()` output is unchanged (same projects, fields, `activitySource`, `daysSince`, and the
  note-mtime fallback when there's no git date).
- Verified with a timing harness (parallel + cache hit) and a check that cached values still reflect
  the right dates; existing HUD endpoints unaffected.

## Implementation
- branch: `auto/fix-latency-issue-with-writing-new-project-goals-in-the-admi` in `C:/Users/liamm/Admin-Brain` (off `main`) — never touches main
- started: 2026-08-12T00:39

### Checkpoint log
- 2026-08-12T00:39 — branch created; supervised implementation started.

- 2026-08-12T04:10 — Fixed the source. `adapters/obsidian`: wrapped `lastGitActivity` in a per-repo
  TTL promise-cache (60s, `ADMIN_BRAIN_RECENCY_TTL_MS`) — caching the PROMISE also de-dupes concurrent
  callers (the HUD's overview+goals firing together) into one lookup; added `clearRecencyCache()`.
  `vault.js getProjects`: swapped the sequential `for…await lastGitActivity` for `Promise.all` so the
  per-project recency runs concurrently. Measured getProjects: **cold 449ms** (was ~800–975 serial),
  **warm 2ms**, **concurrent x2 (add-goal) 3ms**; output identical. Live HUD (fixed server): /api/
  overview cold 0.70s, **warm 6ms**, /api/goals warm 11ms; **add-goal round-trip 171ms (was 1788ms)**.

### Result — DoD check
- ✅ Cold `getProjects` runs recency lookups concurrently; a 2nd call within the TTL is a cache hit
  (~2ms, no network) vs the ~800ms baseline.
- ✅ Adding a goal no longer pays ~2s (171ms round-trip; the overview+goals pair share one cached lookup).
- ✅ `getProjects` output unchanged (same projects/fields/activitySource/daysSince; note-mtime fallback).
- ✅ Verified with a timing harness + live endpoints; existing endpoints unaffected.

**Implement complete.** Ready for Phase D (verify).

