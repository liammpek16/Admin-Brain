---
type: cycle
project: Admin Brain
stage: verify
status: done
task: Feature Loop model optimization
started: '2026-10-08'
readme_source: 'https://github.com/liammpek16/Admin-Brain'
branch: auto/feature-loop-model-optimization
target_path: 'C:/Users/liamm/Admin-Brain'
orchestrated: true
report: 2026-10-08-feature-loop-model-optimization
---

## Task (from SELECT)
Feature Loop model optimization

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
Goal as written (roadmap sub-line): a skill for the loop that creates a **master agent** to judge the
**feasibility** of each feature entering the loop, then starts **sub-agents** per task, with each
sub-agent's model matched to the task's **complexity**.

- **Contrarian** — "A master agent that spins up agents" can easily become unattended spending,
  which the README and plan_2 §7 rule out (human gates at ①②⑤, supervised ③). The feasibility
  verdict must **advise** the refine-approval gate, not replace it. A `no-go` stops the cycle only
  after you agree. It also must not quietly weaken ④: the verifier sub-agent can never be the
  implementer, and it can never run on a weaker tier than the work it checks.
- **First-Principles** — The real gain is cost and speed: mechanical work (renames, docs, config,
  one-file edits) doesn't need the strongest model, while design-heavy or ambiguous work does. To fit
  the "deterministic $0 core" principle, *routing* must be inspectable, like SELECT's scoring. The
  agent supplies task attributes, a pure function maps them to a tier, and a config table maps the
  tier to a model alias. The LLM judges; the arithmetic is auditable.
- **Expansionist** — Log every task's tier, model, and outcome in the cycle note. That builds a
  record for tuning the tier map later (the same idea as plan_2 §9.4 for SELECT weights). Later
  options: a HUD column showing each cycle's model mix, and a `claude -p` runner (Phase E). Both are
  **out of scope** here.
- **Outsider** — "Master agent" needs a concrete meaning. Today the "claude" owner of the
  refine/implement/verify stages is the Claude Code session driving the loop (`cycleNextAction`).
  So the master agent *is* that session following a new `orchestrate` SKILL.md. Sub-agents are
  Claude Code's Agent tool with a `model` override. Use the aliases `haiku`/`sonnet`/`opus`, not
  pinned IDs, so routing keeps working as models change.
- **Executor** — This fits in one branch as a skill (SKILL.md + harness + tests) plus a one-line
  hook into the existing loop docs. No HUD UI, no autonomous runner, no new dependencies.

**Gaps closed:** feasibility is advisory and gated · routing is deterministic and auditable ·
verification stays independent · models are aliases · out of scope stated explicitly.

## Refined task spec
Add an **`orchestrate`** skill (`skills/orchestrate/`) that runs between an approved REFINE spec and
IMPLEMENT/VERIFY:

1. **`SKILL.md` — the master-agent protocol.** For the cycle's refined spec:
   a. **Feasibility pass.** Score 5 dimensions 0–2: spec clarity · size (branch-sized?) ·
      external deps/cost (honours $0/local-first) · risk to `main`/vault data · testability.
      Pass the scores to the harness, which returns `go` / `go-with-split` / `no-go` plus reasons.
      `no-go` and `go-with-split` are surfaced for **human decision**; they are never auto-acted on.
   b. **Task breakdown.** Split the spec into ordered sub-tasks. Each declares attributes:
      `files` (est. count), `novel_design` (bool), `ambiguity` (low/med/high), `risk` (low/med/high),
      `kind` (mechanical | feature | design | verify).
   c. **Dispatch.** For each sub-task, the harness picks a tier → model alias. The master agent
      starts one Agent-tool sub-agent per task with that `model`, commits a checkpoint after each,
      and appends the result to the log.
   d. **Verify independence.** The `verify` sub-task always runs as a separate sub-agent with
      tier ≥ the highest implement tier (minimum `sonnet`).
2. **`orchestrate.js` — the deterministic harness** (pure, exported, unit-tested):
   - `assessFeasibility(scores)` → `{ verdict, total, reasons }` (thresholds as constants).
   - `classifyTask(attrs)` → `tier` (`light` | `standard` | `heavy`), with a score breakdown.
   - `routeModel(tier, overrides?)` → alias, from a `TIER_MODELS` table
     (`light→haiku`, `standard→sonnet`, `heavy→opus`). Overridable via
     `ADMIN_BRAIN_TIER_MODELS` JSON.
   - CLI: `node skills/orchestrate/orchestrate.js --project "<name>" --plan <plan.json>`. It
     validates the plan and writes `## Feasibility` and `## Orchestration plan` (task · attrs ·
     tier · model · status) into the open cycle note. It refuses unless the cycle is
     `refine/approved` or `implement/active`.
3. **Loop wiring (docs only):** `skills/implement/SKILL.md` and `skills/README.md` reference
   orchestrate as the way ③/④ are run. No HUD changes.

**Out of scope:** HUD panel/UI, an autonomous `claude -p` runner, tuning tiers from history,
`.claude/agents` definitions, and any change to SELECT/REFINE behaviour or the human gates.

## Definition of done
- [ ] `skills/orchestrate/SKILL.md` documents the feasibility rubric, task attributes, tier
      rules, dispatch steps, and the verify-independence rule. It states that feasibility is advisory.
- [ ] `orchestrate.js` exports `assessFeasibility`, `classifyTask`, `routeModel`. All are pure and
      have no network calls or deps beyond what the repo already uses.
- [ ] Unit tests (`node --test`) cover: each verdict boundary; each tier with a mechanical/feature/design
      example; verify is never below `sonnet` or below the max implement tier; env override applies;
      malformed scores/attrs/plan are rejected with clear errors (no partial write).
- [ ] CLI on a sample plan writes `## Feasibility` + `## Orchestration plan` to the cycle note
      idempotently (re-run updates, doesn't duplicate). It refuses on a wrong-stage cycle.
- [ ] implement SKILL.md + skills/README.md reference the new skill. Full existing test suite still green.
- [ ] Dogfood: this cycle's own IMPLEMENT stage is run through `orchestrate`, and its plan/log is
      recorded in this note.

## Feasibility
**Verdict: go** (10/10) — advisory; the human gates decide.
- scores: clarity 2 · size 2 · cost 2 · risk 2 · testability 2
- total 10/10, no blockers

## Orchestration plan
| # | task | attributes | tier [score] | model | status | note |
|---|---|---|---|---|---|---|
| T1 | orchestrate.js harness: feasibility, classify, route, buildPlan, note writer | design, 1f, novel, amb med, risk med | heavy [7] | `opus` | done | master agent (session) |
| T2 | Unit tests for the harness (node --test) | feature, 1f, known, amb low, risk low | light [1] | `haiku` | done | haiku sub-agent: 64 tests, reviewed; suite 84/84 |
| T3 | SKILL.md protocol + implement SKILL.md / skills README / package.json wiring | mechanical, 4f, known, amb low, risk low | light [1] | `haiku` | done | haiku sub-agent; master fixed 3 doc inaccuracies |
| T4 | Independent adversarial verify pass + report | verify, 1f, known, amb low, risk low | heavy (lifted from standard) [1] | `opus` | done | opus sub-agent: pass-with-notes; F1-F5 fixed post-verify |

## Implementation
- branch: `auto/feature-loop-model-optimization` in `C:/Users/liamm/Admin-Brain` (off `main`) — never touches main
- started: 2026-10-08T18:27

### Checkpoint log
- 2026-10-08T18:27 — branch created; supervised implementation started.
- 2026-10-08T14:31 — T1 harness done (master, opus); T2 tests + T3 docs done by haiku sub-agents, reviewed; full suite 84/84.
- 2026-10-08T18:39 — T4 verify (opus sub-agent): pass-with-notes. Master fixed F1–F5 (fence-aware sections, model-level verify guard, alias charset, writable-cycle pick, CLI tests); suite 95/95. Draft PR opened.
