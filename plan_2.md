# Admin Brain — Plan 2: The Autonomous Project Cycle

> Evolve Admin Brain from a board that *shows* me where projects stand into an engine
> that *drives them forward*: pick the single most important next step across all
> projects, sharpen it with a council, build it autonomously on a branch inside one
> Claude Code usage window, stress-test it, and hand me a report to decide what's next.

Status: **vision / planning**. Builds on `plan.md` (v1: vault + skills + HUD, all $0).
Repo: `liammpek16/Admin-Brain` (private). Last updated: 2026-08-07.

> ⚠️ **This plan deliberately breaks the $0 rule** — for two stages only. See §5.

---

## 1. The cycle (your five stages, as a pipeline)

```
① SELECT      rank every project's next step → pick THE one → set "task of the day"     [you approve]
② REFINE      a council reviews the task vs the project's README → sharpens it            [you approve]
③ IMPLEMENT   build it on a branch within one ~5h usage window; checkpoint; resume/retry  [autonomous]
④ STRESS-TEST break the new feature; write a weaknesses/improvements report               [autonomous]
⑤ REVIEW      you read the report → decide the project's next step (which re-enters ①)     [you decide]
```

Three **human gates** (①, ②, ⑤) bracket two **autonomous stages** (③, ④). The loop is
closed: your review in ⑤ becomes the input to the next ①.

## 2. The cycle as a resumable state machine

Every cycle is one record the system can pause and resume — because stage ③ may not
finish in a single usage window.

- **Cycle note:** `vault/Cycles/<date>-<task-slug>.md`
  ```yaml
  type: cycle
  project: "Dota Coach"
  stage: implement          # select | refine | implement | test | review | done
  status: active            # active | awaiting-approval | paused | done | abandoned
  branch: "auto/reduce-info-error"
  started: 2026-08-07
  window_started: 2026-08-07T09:00
  last_checkpoint: <commit sha>
  ```
  Body: the approved task spec, a running progress log, and a checklist of sub-steps.
- **Code progress** lives on the git branch as frequent **checkpoint commits** (WIP is
  never lost even if a run is killed mid-window).
- **Resume =** read the cycle note + branch, continue from `last_checkpoint` and the
  unchecked sub-steps. This is the "save progress" mechanism.

A small **conductor** advances the machine and invokes Claude Code for the heavy stages;
at each human gate it flips `status: awaiting-approval` and stops until you say go.

## 3. Stage-by-stage design

### ① SELECT — the most important next step, everywhere
Mostly **deterministic** (cheap), with a light LLM tiebreak:
- Score each project's `next` using signals we already derive: `priority`, `health`
  (red/blocked boosts), staleness (`daysSince`), milestone `progress` (stalled → boost),
  and `trends` direction (declining → boost). This is a formula over existing metrics.
- Feed only the **top shortlist** (3–5) to a single short LLM pass to pick THE one and
  justify it in one paragraph.
- Write it as the day's task into the cycle note. **You approve** (or override).

### ② REFINE — the council sharpens the task
Reuse the **LLM Council** pattern from this project (Contrarian, First-Principles,
Expansionist, Outsider, Executor):
- Inputs: the task as written **+ the project's `README.md`** (fetched from its repo —
  local clone or GitHub via `gh`, using the `repo` field we already set).
- Job: find gaps between the task and the project's actual goal (from the README),
  then produce a **sharpened task spec** with a clear definition of done.
- Output: a proposal in the cycle note. **You approve** the refined spec.

### ③ IMPLEMENT — autonomous, branch-only, resumable
- Create branch `auto/<task-slug>` off `main`. **Never touches `main`.**
- Run Claude Code **headless** against the approved spec, in a loop that:
  - works in small increments and **commits a checkpoint** after each,
  - updates the cycle note's checklist + `last_checkpoint`,
  - stops cleanly when the spec's definition-of-done is met **or** the usage window ends.
- If the window ends incomplete → `status: paused`; a scheduled retry resumes it when the
  next window is available (see §4 for the honest caveat on "token reset").
- Opens a **draft PR** so the work is reviewable.

### ④ STRESS-TEST — try to break it, then report
- Generate and run tests aimed at breaking the new feature (edge cases, bad input,
  regressions). 
- Produce `vault/Reports/<date>-<task-slug>.md`: what broke, weaknesses, and concrete
  improvements — an honest post-mortem, not a victory lap.

### ⑤ REVIEW — you decide
- You read the report + PR. Merge, request changes, or shelve.
- You decide the project's **next** step → it flows back into ①.

## 4. Tooling & capability assessment (grounded, with caveats)

| Need | Mechanism | Notes |
|---|---|---|
| Rank tasks (①) | existing `metrics`/`trends`/`vault` skills | deterministic; cheap |
| Council (②) | subagents (as used here) + `gh` to fetch the repo README | bounded reasoning pass |
| Autonomous build (③) | **Claude Code headless** (`claude -p`) or the **Agent SDK**, driven by the conductor | the usage-spending core |
| Isolation | git branch (or worktree) + draft PR via `gh` | never `main`; human merges |
| Checkpoint / resume | git checkpoint commits + the cycle note state | survives a killed window |
| Retry after reset | scheduled job (Windows Task Scheduler / a Claude Code routine) | **caveat below** |
| Coordination store | the vault (`Cycles/`, `Reports/`) | consistent with v1 |

**Honest caveat on "retry when tokens reset":** there is no reliable in-process signal for
the exact moment a subscription usage window resets. The pragmatic design is a **scheduled
retry on a fixed cadence** (aligned to the ~5h window) that only acts when a cycle is
`paused` and enough time has elapsed — not a precise reset detector. We accept approximate
timing rather than pretend to detect the reset exactly.

## 5. Cost model — where this spends (and where it doesn't)

v1 is $0. Plan 2 keeps most of that and spends deliberately in two places:

- **Cheap / approval-gated:** ① ranking (deterministic + one short LLM pass) and ② the
  council (one bounded reasoning pass). Minimal usage.
- **The deliberate spend:** ③ implement and ④ test **consume your Claude Code subscription
  usage** — that's the whole point of "use the 5h slot." This is the opposite of the $0
  core, by design and within a bounded window.
- **No external paid APIs.** It rides your existing subscription; nothing new to pay for.

The boundary is explicit so the cost is never a surprise: the board stays free; only the
autonomous builder spends, and only on a task you approved.

## 6. Guardrails & safety (non-negotiable for an autonomous coder)

- **Branch-only, PR for merge.** The agent never writes to `main`; you merge.
- **Three human gates.** Nothing autonomous starts without your approval at ① and ②;
  nothing ships without your review at ⑤.
- **Bounded scope.** The council-refined spec defines "done"; the agent works to that spec,
  not open-endedly.
- **Everything logged** to the cycle note; WIP committed continuously.
- **Tests gate the PR.** ④ must run before a merge is proposed, and the report is honest
  about weaknesses.
- **Kill switch.** Setting a cycle's `status: abandoned` stops all further automation on it.

## 7. Phased build (incremental, not a moonshot)

- **Phase A — SELECT.** The ranking + approval, over existing metrics/trends. Cheap,
  buildable now. *Exit:* it proposes a defensible "task of the day" you can approve.
- **Phase B — REFINE.** Wire the council to (task + repo README) → sharpened spec. *Exit:*
  a refined task spec with a clear definition of done.
- **Phase C — IMPLEMENT harness.** Branch + headless run + checkpoint/state + resume,
  **manual-trigger first**. *Exit:* it builds a small approved task on a branch and can
  resume after being interrupted.
- **Phase D — Scheduled retry.** Add the cadence-based resume for paused cycles. *Exit:* an
  interrupted cycle continues on the next window unattended.
- **Phase E — STRESS-TEST + REPORT**, then wire the full ①→⑤ loop with the human gates.
  *Exit:* one end-to-end cycle completes with a report you review.

## 8. Open risks & uncertainties (stated plainly)

- **Autonomous multi-hour coding is genuinely hard.** Quality varies; the mitigations are
  bounded scope, checkpointing, tests, and your review — not blind trust.
- **Reset timing is approximate** (§4). Expect "resumes within the next window," not "the
  instant tokens refresh."
- **This is a real escalation** from a deterministic $0 tool to a usage-spending agent that
  changes code. The gates and branch-only rule are what keep it safe.
- **A task must be branch-sized.** Huge or vague tasks won't fit one window; ② should split
  or shrink them.

## 9. Open decisions (need your input before Phase A)

1. **Orchestration engine** — Claude Code **headless CLI loop** (simplest, local) vs the
   **Agent SDK** (more control) vs **scheduled cloud agents/routines**.
2. **Where it runs** — your local machine (uses your box + subscription) vs cloud.
3. **Autonomy level in ③** — fully unattended within the window, or periodic quick
   checkpoints you can veto.
4. **Ranking weights (①)** — how to weigh priority vs health vs staleness vs trend.
5. **Retry cadence (④/§4)** — fixed interval, or only on-demand when you say "resume."
6. **Scope guard** — a max task size / time budget before ② must split it.

## 10. Immediate next step
Decide §9.1 (engine) and §9.3 (autonomy level), then build **Phase A** — the task selector
+ approval — since it's cheap, reuses what we have, and immediately proves the "pick the
most important next step" idea before any autonomous spending begins.
