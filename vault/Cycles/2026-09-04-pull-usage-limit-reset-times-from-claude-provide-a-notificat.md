---
type: cycle
project: Admin Brain
stage: verify
status: done
task: >-
  pull usage limit reset times from claude. provide a notification for when this
  happens
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/claude-usage-reset-notifier
target_path: 'C:/Users/liamm/Admin-Brain'
report: 2026-09-04-claude-usage-reset-notifier
---

## Task (from SELECT)
pull usage limit reset times from claude. provide a notification for when this happens

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
**Contrarian** — "Pull from Claude" has no free, stable, programmatic source here: Claude Code stores no usage-limit reset file locally (checked `~/.claude` — only a minimal `.claude.json`), and hitting the Anthropic API for its rate-limit headers needs an API key and spends quota — violating the **deterministic $0 core** principle. Inventing a scraper of an undocumented endpoint would be fragile and dishonest. The right move is an **ingestion pipeline** with a declared source, not a magic auto-pull.

**First-principles thinker** — The reset times are just data: `{ name, resetsAt }`. Admin Brain already lives by "the vault/declared inputs are the source of truth; derive the rest." So: read reset times from a **configurable local source**, normalize them, derive `msUntil` + a `status` (ok / soon / reset) deterministically, and render + notify. The provenance (a file the user or a future updater writes, or Anthropic rate-limit headers dropped in) is pluggable; the pipeline is the deliverable.

**Expansionist** — Accept two input shapes so real Claude data flows in with zero glue: the native `{ limits:[{name,resetsAt,used?,limit?}] }` AND the **Anthropic rate-limit header** shape (`anthropic-ratelimit-*-reset`, whose values literally come from Claude). Then a tiny future updater (or a copy-paste of response headers) populates it.

**Outsider** — Must degrade honestly: with no source configured, the panel says so and how to wire it — never fabricates a time. Notifications need explicit browser permission and must not spam: notify once per reset event.

**Executor** — Match the existing brain-skill shape (`metrics`/`inbox`): a `skills/usage/usage.js` with a **pure** `normalizeUsage(raw, now)` (unit-tested) + a thin `readUsageResets()` (fs, no network) + `npm run usage`. One `GET /api/usage` route. One HUD panel + a permission-gated browser Notification, front-end only (like the voice/TTS features). Real usage file gitignored; ship a committed `.example.json`.

## Refined task spec
Add a **USAGE LIMITS** capability: ingest Claude usage-limit reset times from a declared local source, show each limit's reset time + live countdown in the HUD, and fire a browser notification when a reset occurs.

- **`skills/usage/usage.js`**:
  - `normalizeUsage(raw, now)` — **pure**. Accepts the native `{ limits:[{ name, resetsAt, used?, limit? }] }` OR an Anthropic-header object (`anthropic-ratelimit-<window>-reset` ISO/epoch values). Returns `{ configured, generatedAt, limits:[{ name, resetsAt, msUntil, status }] }` sorted by `resetsAt`; `status` = `reset` (resetsAt ≤ now), `soon` (≤ 15 min), else `ok`. Invalid/empty → `{ configured:false }`.
  - `readUsageResets()` — reads JSON from `ADMIN_BRAIN_CLAUDE_USAGE` (path) else `vault/State/claude-usage.json` else returns null. No network.
  - CLI (`npm run usage`) prints the normalized limits.
- **`GET /api/usage`** → `normalizeUsage(readUsageResets(), Date.now())`.
- **HUD**: a USAGE LIMITS panel listing each limit (name, reset time, countdown, status dot); an "enable alerts" control that requests Notification permission; on the existing 20s poll, when a limit's `resetsAt` newly passes, fire **one** browser Notification per reset event (dedup via localStorage) and highlight it in-panel. Not-configured → a clear message with the source path/env to set.
- Deterministic, $0, **no network, no new deps**. Real `vault/State/claude-usage.json` is gitignored; a committed `vault/State/claude-usage.example.json` documents the schema.

## Definition of done
- With a source present (native OR Anthropic-header shape), the panel shows each limit's reset time and a live countdown, ordered by soonest reset, with a correct `status`.
- With no source, the panel shows an honest "not configured" message naming `ADMIN_BRAIN_CLAUDE_USAGE` / `vault/State/claude-usage.json` — never a fabricated time.
- When a limit's reset time passes while the HUD is open, a browser notification fires **once** for that reset (given permission), and the panel reflects the reset; no duplicate spam on subsequent polls.
- `normalizeUsage` is covered by automated tests (native shape, Anthropic-header shape, status thresholds ok/soon/reset, sorting, empty/invalid → not-configured); `npm test` green.
- No network calls and no new dependencies; the real usage file is gitignored and an example is committed. A live browser pass confirms render + a simulated reset notification with no console errors.

## Implementation
- branch: `auto/claude-usage-reset-notifier` (stacked on `auto/hide-and-sort-completed-goals`).
- **`skills/usage/usage.js`** (+ `SKILL.md`, `npm run usage`): pure `normalizeUsage(raw, now)` accepts
  the native `{ limits:[…] }` OR an Anthropic rate-limit-header object, derives `msUntil` + `status`
  (`reset`/`soon`/`ok`), sorts soonest-first, and returns `{ configured:false }` for empty/invalid.
  `readUsageResets()` reads `ADMIN_BRAIN_CLAUDE_USAGE` → `vault/State/claude-usage.json` → null. No network.
- **`hud/server.js`**: `GET /api/usage` → `normalizeUsage(readUsageResets(), Date.now())`.
- **HUD**: a USAGE LIMITS panel (status dot · name · used/limit · live countdown · reset time), a
  `🔔 alerts` permission button, and a browser Notification fired **once per reset event** (dedup via
  localStorage) on the 20s poll. Not-configured → an honest message naming the env/file. `style.css`
  + `index.html` panel.
- `vault/State/claude-usage.example.json` committed; the real `claude-usage.json` is gitignored.
- `test/usage-normalize.test.js` (native + header shapes, status thresholds, epoch s/ms, sorting,
  empty/invalid → not-configured).

### Checkpoint log
- skill + route + panel + notification + example + gitignore + test implemented on the stacked branch.
- `npm test` green (16/16); `npm run usage` prints the not-configured guidance; live browser: render
  (reset/soon/ok + countdowns), notify-once-then-dedup (stubbed Notification), not-configured message,
  no console errors.

## Verification — see report `2026-09-04-claude-usage-reset-notifier`
**Verdict: pass (with an honest provenance note).** The ingest→display→notify pipeline is complete and
tested: reset times are read from a declared source (native or Anthropic-header shape), shown with a
live countdown ordered soonest-first, and a browser notification fires exactly once per reset. It
degrades honestly to a "not configured" message and never fabricates a time. The one caveat (called
out, not hidden): Claude exposes no free/stable programmatic reset source here, so auto-population is a
documented source file / pasted headers / future updater — the pipeline is the deliverable, at $0 and
no network, per the project's core principle.
