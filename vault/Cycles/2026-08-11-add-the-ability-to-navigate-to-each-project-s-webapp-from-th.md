---
type: cycle
project: Admin Brain
stage: verify
status: done
task: >-
  Add the ability to navigate to each project's webapp from the HUD (e.g. the
  Dota coaching webapp)
started: '2026-08-11'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/add-the-ability-to-navigate-to-each-project-s-webapp-from-th
target_path: 'C:/Users/liamm/Admin-Brain'
report: 2026-08-11-add-the-ability-to-navigate-to-each-project-s-webapp-from-th
---

## Task (from SELECT)
Add the ability to navigate to each project's webapp from the HUD (e.g. the Dota coaching webapp)

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
_Grounding: the Dota webapp launches via `run-webapp.ps1` → `python -m dota_coach.webapp.server
--port 8080` (and `-Demo` = canned data, no API key/network) on http://127.0.0.1:8080. The user's
explicit requirement: the button must **open the server** — i.e. actually start it, not just link a
static URL. So the feature is "ensure the webapp is up, then open it," per project, when declared._

**🔴 Contrarian** — The scary part is a web button that **spawns a process**. Guard it hard: the
command must come **only** from the project note's frontmatter (user-authored, in their own vault),
never from the HTTP body — the request passes only a validated `project` name. Bind to 127.0.0.1,
and projects without a declared webapp must show **no button** (no dead/guessing UI). Also don't
blindly double-launch — if it's already up, just open it.

**🔵 First-Principles** — "Open the server" decomposes to: (1) know the URL; (2) is it already
responding? if yes, open it; (3) if no and a launch command is declared, start it, **wait until the
URL responds**, then open. Probing the URL before/after launch is what makes it "opening the server"
rather than "opening a maybe-dead link."

**🟢 Expansionist** — Declaring `webapp_url` / `webapp_cmd` / `webapp_cwd` per project generalizes:
any project that grows a webapp gets a launch button for free. The HUD becomes the one place to
reach every project's live surface.

**⚪ Outsider** — I click "Open webapp" on Dota and the coaching app comes up in a new tab. I don't
want to open a terminal, cd around, and remember the port. If it's already running, it should just
open.

**🟡 Executor** — Branch-sized: project frontmatter `webapp_url` (+ optional `webapp_cmd`,
`webapp_cwd`); `vault.js` surfaces them; `server.js` `POST /api/project/webapp {project}` →
probe the URL, spawn `webapp_cmd` **detached** in `webapp_cwd` if down, poll until it responds (bounded),
return `{ok,url,started|already}`; front-end shows a **⧉ Webapp** button only when `webapp_url` is
set, and `window.open(url)` on success. Set Dota's config to demo mode so it boots with no API key.

**Gap:** the goal says "navigate to each webapp"; the user sharpened it to **launch-then-open**. The
real work is the probe→launch→poll→open mechanism + a safe, note-only command source.

## Refined task spec
**Add a per-project "Open webapp" button that ensures the server is up, then opens it.**
- **Project frontmatter (opt-in):** `webapp_url` (e.g. `http://127.0.0.1:8080`), optional
  `webapp_cmd` (launch command), optional `webapp_cwd` (defaults to the project's `local_path`).
- **`vault.js`:** surface `webappUrl`, `webappCmd`, `webappCwd` on each project from `getProjects()`.
- **`server.js` `POST /api/project/webapp { project }`:**
  1. Resolve the project (validated against known projects); if no `webappUrl` → `{ok:false}`.
  2. **Probe** `webappUrl` (HTTP GET, ~1s timeout). If it responds → `{ok:true, url, already:true}`.
  3. If down and `webappCmd` is set → spawn it **detached** (stdio ignored, unref'd) in `webappCwd`;
     **poll** the URL up to ~20s; when it responds → `{ok:true, url, started:true}`; if it never
     comes up → `{ok:false, url, output:'launched but not responding yet'}`.
  4. If down and no `webappCmd` → `{ok:true, url, already:false}` (just open — may be external).
  - The command is read **only** from the note; the request body carries just `project`. 127.0.0.1.
- **Front-end:** a **⧉ Webapp** button on each project row (PROJECTS panel) **only when** `webappUrl`
  is set; click → POST → on `ok`, `window.open(url, '_blank')`; log started/already/failed.
- **Dota config:** `webapp_url: http://127.0.0.1:8080`, `webapp_cmd:` launch `run-webapp.ps1 -Demo`
  (demo mode → no API key/network), `webapp_cwd: C:/Users/liamm/Scripts`.
- Server stays otherwise $0/no-LLM; the only new capability is launching a **note-declared** server.
- **Out of scope:** stopping/managing the process from the HUD; health beyond a single probe.

## Definition of done
- `GET /api/overview` (or a dedicated field) exposes `webappUrl` per project; only Dota has one.
- The **⧉ Webapp** button appears only on projects with `webapp_url` (Dota), not the others.
- `POST /api/project/webapp {project:"Dota Coach"}` **starts the Dota webapp** (demo mode) and
  returns `{ok:true, url:"http://127.0.0.1:8080", started:true}`; a second call while it's up returns
  `already:true` (no double-launch). **Verified by the server actually coming up on :8080.**
- A project with no `webapp_url` returns `{ok:false}` and shows no button.
- The command is sourced only from the note (request passes only `project`); bound to 127.0.0.1.
- No regressions: goals board, loop, project edits still work.

## Implementation
- branch: `auto/add-the-ability-to-navigate-to-each-project-s-webapp-from-th` in `C:/Users/liamm/Admin-Brain` (off `main`) — never touches main
- started: 2026-08-11T01:38

### Checkpoint log
- 2026-08-11T01:38 — branch created; supervised implementation started.
- 2026-08-11T01:55 — Built the webapp launcher. `vault.js`: surface `webappUrl/webappCmd/webappCwd`.
  `server.js`: `probeUrl()` + `launchWebapp()` (probe → spawn detached if down → poll ~20s → open),
  `POST /api/project/webapp`, `webappUrl` added to `/api/overview`. Front-end: ⧉ webapp button on a
  project row only when `webapp_url` is set; opens a tab in the click gesture then points it at the
  URL. Configured Dota (`http://127.0.0.1:8080`, `run-webapp.ps1 -Demo`, cwd Scripts).
  **Live test:** endpoint launched the Dota webapp → came up on :8080 (`started:true`); 2nd call
  `already:true` (no double-launch); `:8080` served the real app (71 KB, title "Dota Coach");
  stopped it after. Button renders on Dota only; no console errors.

### Result — DoD check
- ✅ `/api/overview` exposes `webappUrl` per project; only Dota has one.
- ✅ ⧉ webapp button appears only on projects with `webapp_url` (Dota), not the others.
- ✅ `POST /api/project/webapp {Dota Coach}` **starts the server** (demo) → `{ok, url, started:true}`;
  a 2nd call while up → `already:true`. Verified the server actually came up on :8080 and served the app.
- ✅ A project with no `webapp_url` → `{ok:false}`, no button.
- ✅ Command sourced only from the note (request passes only `project`); 127.0.0.1.
- ✅ No regressions (goals board / loop / edits intact).

**Implement complete.** Ready for Phase D (verify).

## Verify (Phase D)
Independent adversarial pass: **pass-with-notes** (8 checks). The button genuinely *opens the
server* — it launched the Dota webapp (demo), waited for it, and :8080 served the real app;
idempotent (2nd call `already:true`); **secure** (W2: request body can't inject a command — the
launch command is note-only); no regressions. **Findings (minor):** double-launch race if two calls
arrive before the server is up (button-disable covers the common case); probe checks liveness not
identity; `webapp_url` can be any URL; spawned server is detached/unmanaged (by design). Report:
[[2026-08-11-add-the-ability-to-navigate-to-each-project-s-webapp-from-th]].
**Recommended follow-up (⑤ → ①):** "Add a per-project in-flight lock to the webapp launcher so
concurrent clicks can't double-spawn."

_Cycle complete (Admin-Brain PR #2 draft, awaiting your review/merge)._
