---
type: cycle
project: Admin Brain
stage: refine
status: done
resolution: closed-already-delivered
task: Run the feature loop from inside the Admin Brain (HUD-triggered cycles)
started: '2026-08-07'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
---

## Task (from SELECT)
Run the feature loop from inside the Admin Brain (HUD-triggered cycles)

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
_The honest gap: this task was **substantially delivered last commit** (`a663c92` — the FEATURE
LOOP panel). You literally drove it to approve this cycle. SELECT and both approval gates run
fully from the HUD; REFINE/IMPLEMENT/VERIFY run their **deterministic half** (scaffold + branch)
from the HUD but hand their **reasoning half** (council fill, code, adversarial tests) to a
separate Claude Code chat — like this one. So "run the loop from inside the Admin Brain" is ~80%
done; the remaining friction is the handoff to Claude for those three stages._

**🔴 Contrarian** — Don't "rebuild the loop in the HUD" — it exists. And don't overreach into the
obvious-sounding fix (a web button that spawns `claude -p` to run stages unattended): that's a big
autonomy jump plan_2 explicitly **deferred** (③ starts supervised; unattended earned later), and it
turns cycle-note text into an LLM prompt — a prompt-injection surface — behind a click. Wrong slice
for one branch.

**🔵 First-Principles** — What's the *minimal* thing missing? When a cycle sits on a "⤳ Claude"
step, the HUD knows exactly what needs doing (stage + cycle note + branch) but makes the human
re-explain it in a chat. The smallest real closure is: the HUD **emits the precise handoff** for the
current stage — copy it, paste into Claude Code, done. No new server autonomy, no LLM in the server.

**🟢 Expansionist** — The North Star is a real "▶ Run stage (Claude)" that spawns headless Claude,
streams to the loop log, and advances the cycle — true one-surface operation. But that needs async
job management, a kill switch, timeouts, and injection guards. Make it the *next* cycle; this branch
should lay the groundwork (the exact prompt each stage needs) that the autonomous version reuses.

**⚪ Outsider** — I clicked Approve and then had to switch to a chat and type "continue the loop."
If the card had just handed me the exact instruction to paste, I'd never have to guess or context-
switch. That alone would make it feel like one system.

**🟡 Executor** — Branch-sized, safe, $0-server: add a **stage handoff**. A pure
`claudeHandoff(cycle)` returns the copy-paste Claude Code prompt for the cycle's current reasoning
stage; expose it on each cycle from `/api/cycles`; add a **"⧉ Copy Claude handoff"** button on the
"⤳ Claude" cards (clipboard + log confirm). Server still runs no LLM — it just generates text.

**Resolution:** Scope this cycle to the **handoff affordance** — the branch-sized slice that closes
the last-mile UX of running the loop from the HUD, while keeping the server $0/no-LLM and the human
in the loop. The autonomous `claude -p` stage-runner is logged as the explicit **next cycle**
(Phase E: needs async jobs + kill switch + injection guards).

## Refined task spec
**Add a per-stage "Copy Claude handoff" to the HUD feature loop.**
- Pure function `claudeHandoff(cycle)` (in `hud/server.js`) → returns the exact, copy-paste Claude
  Code prompt for a cycle whose next action is `kind: 'claude'`, tailored per stage:
  - **refine/refining** → "Fill the council + refined spec + DoD in `vault/Cycles/<base>.md` from the
    README already in the note, then set `status: awaiting-approval`."
  - **implement/active** → "Implement the approved spec in `<base>.md` on branch `<branch>` in
    `<local_path>`; checkpoint-commit; open a draft PR; fill the Implementation/DoD section."
  - **verify/verifying** → "Run an independent adversarial pass on `<branch>`; write the report at
    `vault/Reports/<report>.md`; fill the Verify section; mark the cycle done."
  - Each prompt names the repo/vault paths so a fresh Claude session has full context.
- Surface `handoff` on each cycle object in `GET /api/cycles` (empty string when the next action
  isn't a Claude stage).
- Front-end: on cards whose action is a "⤳ Claude" chip, render a **⧉ Copy handoff** button →
  `navigator.clipboard.writeText(handoff)` → confirm in the loop log. (Clipboard works because the
  HUD is served over http on localhost, a secure context.)
- **Out of scope (next cycle):** spawning `claude -p` from the server to run stages unattended.
- Server stays **$0 / no-LLM** — it only generates prompt text.

## Definition of done
- `GET /api/cycles` returns a non-empty `handoff` for the active refine/implement/verify cycle and
  `''` for select/approve/done cycles.
- The refine cycle's handoff names this cycle's file, task, and the "set status awaiting-approval"
  step; implement's names the branch + local_path; verify's names the report path.
- A **⧉ Copy handoff** button appears only on "⤳ Claude" cards; clicking it copies the prompt and
  logs a confirmation. No button on approve/run/done cards.
- No new server dependency; server still runs no LLM. Approve/run/select all still work.
- Verified: hit `/api/cycles`, confirm the three handoff strings; load the HUD, confirm the button
  shows on the Claude card and copies.

## Closed (no implementation)
**Decision at the refine gate: closed as already delivered.** The refine council established that the
literal task — running the feature loop from inside the Admin Brain HUD — shipped in `a663c92`
(SELECT + both approval gates run fully from the HUD; REFINE/IMPLEMENT/VERIFY run their deterministic
half there). This cycle intentionally did **not** go to IMPLEMENT/VERIFY: there was nothing new to
build for the stated goal. Roadmap goal #1 ticked.

**Logged as future work (not this cycle):**
1. **Stage handoff** — the "⧉ Copy Claude handoff" affordance (branch-sized; the refined spec above
   is ready to pick up if wanted).
2. **Autonomous stage-runner** — spawn `claude -p` from the HUD to run refine/implement/verify
   unattended (Phase E: needs async jobs, kill switch, prompt-injection guards).

_Cycle complete — no branch, no PR (nothing to implement)._
