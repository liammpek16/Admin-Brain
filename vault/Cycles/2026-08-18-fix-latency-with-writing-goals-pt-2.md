---
type: cycle
project: Admin Brain
stage: implement
status: active
task: Fix latency with writing goals pt.2
started: '2026-08-18'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/fix-latency-with-writing-goals-pt-2
target_path: 'C:/Users/liamm/Admin-Brain'
---

## Task (from SELECT)
Fix latency with writing goals pt.2

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
_Scope: a **measured** follow-up to PR #4. I profiled the add-goal path before refining._

**Profiling (this machine, corpus Projects=5 / Plans=3 / Cycles=15):**
- Warm everything: `goalsBoard()` 4.4ms, post-add `Promise.all([overview, goalsBoard])` **4.9ms**. Disk is fine.
- **`getProjects()` COLD (git-recency cache expired): ~430ms**; warm immediately after: **1ms**. Repeated 3×: 442 / 413 / 433ms.
- PR #4's recency cache has a **60s TTL** → every 60s the *first* `getProjects()` re-fires `gh api` for the 2 GitHub repos (Admin Brain + Dota Coach). That call sits on the **critical path of writing a goal**: the front-end's post-add `loadOverview()`+`loadGoals()` both call `getProjects()`, so an add after any 60s gap waits ~430ms.

**🔴 Contrarian** — PR #4 didn't *fix* the cost, it *reduced its frequency*. The network call is still synchronously awaited inside `getProjects()`, still on the write path, and a goal write has **nothing to do with commit dates**. Don't just bump the TTL — that only widens the lucky window; the first write after any idle still stalls ~430ms, and it looks random to the user ("sometimes slow"). The real bug: **recency (a derived, slow, network-sourced hint) is blocking a local file write's UI refresh.** Also beware regressing correctness: don't let a transient network blip wipe a good commit-date to null (→ recency visibly jumps to note-mtime).

**🔵 First-Principles** — Writing a goal = write one file + re-render. Nothing in that needs a fresh `gh api`. Recency only moves when a commit lands (rare, external). So recency should be served from cache **without ever awaiting the network on a read**; refresh it in the background. The write path then costs only disk (~5ms).

**🟢 Expansionist** — Stale-while-revalidate on `lastGitActivity` makes *every* HUD interaction that touches `getProjects` (overview, goals, the 20s poll, add/reorder/delete) instant, not just goal writes — one fix, whole-HUD win.

**⚪ Outsider** — I type a goal, hit Add, and it should snap in. It shouldn't occasionally hang for half a second because something phoned GitHub.

**🟡 Executor** — Branch-sized, in the adapter: change `lastGitActivity` from "await compute on miss" to **stale-while-revalidate** — return the last known value immediately; when stale, kick a background refresh (never awaited). Only the very first call per repo (server boot) computes synchronously. Keep the value **sticky** (a transient null from a failed refresh doesn't overwrite a good date). No API change to `getProjects`/callers.

**Gap:** the value is taking the **network off the write path** so a goal write is *always* ~disk-fast — not merely rarer. Serving recency ≤ (TTL + a refresh) stale is already accepted by PR #4; SWR just formalizes it.

## Refined task spec
**Make `lastGitActivity` stale-while-revalidate so git recency never blocks a read (esp. a goal write).**
Adapter-only change in `adapters/obsidian/index.js`; no API change to `getProjects`, `goalsBoard`, or the HUD.

- **Cache entry** per repo: `{ at, value, promise }` where `value` is the last *resolved* `Date|null`.
- **`lastGitActivity(repoPath)`**:
  - falsy repo → `Promise.resolve(null)` (unchanged).
  - **cold** (no entry yet): compute and await once (return the promise); store `value` on resolve. (One-time at server boot per repo.)
  - **fresh** (`now - at < TTL`): return `Promise.resolve(value)` — no network.
  - **stale** (`>= TTL`): return `Promise.resolve(value)` immediately **and** trigger a background refresh (guard against overlapping refreshes) that updates `value`/`at` for next time. **The read never awaits the network.**
  - **stickiness:** a background refresh that resolves `null` when the previous `value` was non-null does **not** overwrite it (treat null-after-known as a transient miss), so recency never regresses to note-mtime on a blip.
- **`clearRecencyCache`** keeps working (drops entries → next call is a cold compute).
- Keep it $0/deterministic; `_computeLastGitActivity` still never rejects.

## Definition of done
- After one warm-up call, **`getProjects()` returns in single-digit ms even immediately after the TTL expires** (no ~430ms cold hit on reads); measured before/after.
- **`lastGitActivity` never awaits the network on a stale hit** — it returns the cached value synchronously-fast and refreshes in the background (verified by timing a stale call << a cold compute, and by observing the value update on a subsequent call).
- **Stickiness:** if a refresh yields `null` but a prior value existed, the prior `Date` is retained (unit-tested with a stubbed compute).
- First-ever call per repo still returns the correct date (cold path intact); `clearRecencyCache()` forces a fresh cold compute.
- No API change to `getProjects`/`goalsBoard`/HUD; still $0/no-LLM/local; existing behavior (correct recency within ≤~TTL) preserved.
- Verified with a **stubbed `_computeLastGitActivity`** (no real network) driving: cold→value, fresh→no recompute, stale→instant + background refresh fired, null-stickiness, and a before/after timing on the real `getProjects()`.

**Out of scope:** persisting recency to disk across restarts (would also kill the one-time boot cost — logged as a follow-up); the minor O(N²) `projectGoals` re-reads inside `goalsBoard` (only ~4ms at this corpus; note only); any HUD/UX change.

## Implementation
- branch: `auto/fix-latency-with-writing-goals-pt-2` in `C:/Users/liamm/Admin-Brain` (off `main`) — never touches main
- started: 2026-08-18T21:38

### Checkpoint log
- 2026-08-18T21:38 — branch created; supervised implementation started.
- 2026-08-18T21:55 — Rewrote `adapters/obsidian/index.js` `lastGitActivity` as stale-while-revalidate.
  Cache entry is now `{ at, value, refreshing, promise }`. Cold (first call per repo) computes + awaits
  once (concurrent first-load callers share the in-flight `promise`); every later call returns
  `Promise.resolve(value)` immediately. A stale entry (≥ TTL) triggers `_refreshRecency` — a background
  compute (never awaited, one in-flight per repo) that updates the value for next time and is **sticky**
  (a `null` result won't overwrite a known Date). `clearRecencyCache` unchanged. No API change to
  `getProjects`/`goalsBoard`/HUD; adapter-only; $0/no-LLM.

### Result — DoD check (measured, real repos, TTL forced to 50ms)
- ✅ **`getProjects()` after TTL expiry: 17.7ms** (was ~430ms) — the network cold-hit is off the read path.
- ✅ `lastGitActivity` stale hit **6.4ms** vs **422ms** cold (same repo) — reads never await the network.
- ✅ Warm fresh hit 0.0ms; cold computes once (422ms) then value cached.
- ✅ **Stickiness:** with `gh` forced to fail on a background refresh, the previously-known Date is
  retained (not wiped to null → no regression to note-mtime).
- ✅ Background refresh runs (value intact on the next call); `clearRecencyCache()` forces a fresh cold
  compute (418ms); falsy repo → null instantly.
- ✅ Recency correctness preserved (stale value == cold value); no API change; existing callers untouched.
- ✅ 11/11 SWR checks against the REAL adapter + real GitHub repo.

**Implement complete.** Ready for Phase D (verify).

