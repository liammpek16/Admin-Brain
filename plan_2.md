# Admin Brain — Plan 2: The Project Cycle

> Evolve Admin Brain from a board that *shows* where projects stand into an engine that
> *drives them forward*: pick the most important next step across all projects, sharpen it
> with a council, build it (supervised) on a branch, independently verify it, and hand me a
> report to decide what's next.

Status: **planning**. Revised after **two** LLM Council reviews (see §11). Builds on
`plan.md` (v1: vault + skills + HUD, all $0). Repo: `liammpek16/Admin-Brain` (private).
Last updated: 2026-08-07.

> ⚠️ Two stages (implement, verify) deliberately spend Claude Code usage. The board and the
> decision stages stay $0. See §6.

---

## 1. What the council changed (the reframe)

Plan 2's first draft optimized the wrong thing. The corrections now baked in:

- **The unit of work is a well-specified, branch-sized task — not the 5-hour window.** The
  window is a *usage budget*, not the design axis. We stopped architecting around it.
- **③ IMPLEMENT starts human-supervised.** Fully-unattended, window-long autonomous coding
  is a *destination earned* after verification is trustworthy — not a starting point.
- **④ is promoted to a first-class, INDEPENDENT verification stage.** Its own tests, never
  the implementer grading its own homework. This is the load-bearing wall, so it gets real
  design — not one paragraph.
- **The cycle is a protocol with a pluggable implementer.** Headless Claude today; a
  stronger agent (or a human) can drop into ③ later without changing the cycle.
- **The portfolio is thin** (≈1 active project). Build the cheap decide/refine core now; the
  autonomous machinery earns its place as active work grows.

## 2. The cycle (your five stages)

```
① SELECT   rank every project's next step → propose THE one → cycle note      [you approve]
② REFINE   council reviews task vs the project's README → sharpened spec        [you approve]
③ IMPLEMENT build it on a branch, SUPERVISED, checkpointing as it goes          [you can veto]
④ VERIFY   INDEPENDENT tests try to break it → weaknesses/improvements report   [autonomous]
⑤ REVIEW   you read the report + PR → decide the project's next step → back to ① [you decide]
```

Human gates at ①, ②, ⑤; ③ is supervised (you can stop it); ④ is an independent check.

## 3. The cycle as a resumable record

A task may span more than one sitting, so each cycle is a record we can pause and resume:

- **Cycle note** `vault/Cycles/<date>-<task-slug>.md`:
  ```yaml
  type: cycle
  project: "Dota Coach"
  stage: select            # select | refine | implement | verify | review | done
  status: awaiting-approval # awaiting-approval | approved | active | paused | done | abandoned
  branch: ""               # set at implement
  task: "the next step"
  score: 0
  started: 2026-08-07
  ```
  Body: proposed/approved task spec, the ranking, a progress log, a sub-step checklist.
- **Code progress** lives on the branch as **checkpoint commits** — WIP is never lost.
- **Resume =** read the cycle note + branch and continue. (Unattended resume/retry is a
  *later, earned* capability — see §8, and the honest caveat in §5.)

## 4. Stage-by-stage design

### ① SELECT — the most important next step, transparently
**Deterministic and inspectable** (so you can *trust the pick*): score each project's `next`
from signals we already derive — `priority`, `health`/`blocked`, staleness (`daysSince`,
active projects only), whether `needsAttention` flags it, and stalled milestone `progress`.
Rank, propose the top one, and **show the full score breakdown** so the pick is auditable.
Weights are tunable constants (§9.4). You approve or override. *(Trend inputs join once
per-project history exists.)*

### ② REFINE — the council sharpens the task
Reuse the LLM Council (Contrarian, First-Principles, Expansionist, Outsider, Executor):
- Inputs: the task **+ the project's `README.md`** (from its repo — local or GitHub via `gh`).
- Job: find gaps between the task and the project's real goal; produce a **sharpened spec
  with a clear definition of done**, small enough to be branch-sized (split if not).
- You approve the refined spec.

### ③ IMPLEMENT — supervised, branch-only
- Branch `auto/<task-slug>` off `main`. **Never touches `main`.**
- Claude Code works the approved spec **with you able to veto at checkpoints**, committing a
  checkpoint after each increment and updating the cycle note.
- Opens a **draft PR**. Unattended, window-long runs are deferred until ④ earns trust (§8).

### ④ VERIFY — independent, try to break it
- **A separate pass** (not the implementer) writes and runs tests aimed at breaking the
  feature: edge cases, bad input, regressions against the definition of done.
- Produces `vault/Reports/<date>-<task-slug>.md`: what broke, weaknesses, concrete
  improvements. **Verification gates the merge proposal** — honest, not a victory lap.

### ⑤ REVIEW — you decide
Read the report + PR → merge / request changes / shelve → set the project's next step,
which re-enters ①.

## 5. Tooling & capability assessment (grounded)

| Need | Mechanism | Notes |
|---|---|---|
| Rank tasks (①) | existing `metrics`/`trends`/`vault` | deterministic, inspectable, $0 |
| Council (②) | subagents + `gh` to fetch the repo README | bounded reasoning pass |
| Supervised build (③) | **Claude Code headless CLI** *(provisional §9.1)* | already installed; no new infra |
| Isolation | git branch/worktree + draft PR via `gh` | never `main`; you merge |
| Independent verify (④) | a *separate* test pass, not the implementer | the load-bearing stage |
| Resume | cycle note + checkpoint commits | supervised now; unattended later |
| Coordination store | the vault (`Cycles/`, `Reports/`) | consistent with v1 |

**Honest caveat (unattended retry, deferred):** there is no reliable in-process signal for
when a subscription window resets. If/when we add unattended resume, it will be a
**fixed-cadence scheduled retry** that only acts on `paused` cycles after enough time — not
a precise reset detector. We don't build this until supervised cycles prove the loop.

## 6. Cost model — where this spends

- **$0 / approval-gated:** ① (deterministic ranking) and ② (one bounded council pass).
- **The deliberate spend:** ③ implement and ④ verify consume your Claude Code subscription —
  by design. Keeping ③ **supervised** is also a *cost control*: a confidently-wrong
  unattended branch wastes a whole window plus your review time; a human veto stops that
  early.
- **No external paid APIs.** Rides your subscription; nothing new to pay for.

## 7. Guardrails & safety

- **Branch-only, PR for merge.** The agent never writes to `main`; you merge.
- **Human gates at ①, ②, ⑤** + **veto during ③**.
- **Bounded scope.** ② defines "done"; the task must be branch-sized.
- **Independent verification (④) gates the merge** — not self-grading.
- **Everything logged** to the cycle note; WIP committed continuously.
- **Kill switch.** `status: abandoned` stops all automation on a cycle.

## 8. Phased build (earn each step)

- **Phase A — SELECT (now).** Deterministic ranking + a proposed "task of the day" cycle note
  for approval. Cheap, reuses metrics/trends, spends nothing. *Exit:* it proposes a pick you'd
  approve — i.e. **you trust the ranking.**
- **Phase B — REFINE.** Council on (task + repo README) → sharpened, branch-sized spec.
  *Exit:* a refined spec with a clear definition of done.
- **Phase C — SUPERVISED IMPLEMENT.** Branch + checkpointed build with you watching + draft PR.
  *Exit:* a small approved task built on a branch, reviewable.
- **Phase D — INDEPENDENT VERIFY.** A separate test pass + report that can actually fail the
  work. *Exit:* verification catches a real weakness on a real task.
- **Phase E — Close the loop**, then *only after several trustworthy supervised cycles*
  consider **unattended stretches + scheduled resume** (§5 caveat). *Exit:* one end-to-end
  cycle you'd run again.

## 9. Open decisions

**Provisionally decided (council advice):**
1. ✅ **Orchestration engine → Claude Code headless CLI.** Already installed, zero new infra,
   stays on your machine + subscription. Migrate to the Agent SDK / cloud routines *later*,
   only if the proven loop needs it.
3. ✅ **Autonomy in ③ → supervised checkpoints, not unattended.** Start watching with veto;
   earn longer unattended stretches once ④ is trustworthy.

**Still open:**
2. Where it runs — local (default) vs cloud.
4. Ranking weights (①) — priority vs health vs staleness vs attention vs stalled-progress.
5. Retry cadence — deferred until Phase E; on-demand "resume" until then.
6. Scope guard — a max task size before ② must split it.

## 10. Immediate next step
**Build Phase A** — the `select` command that ranks every project's next step, proposes the
single most important one with a transparent score breakdown, and writes it to a cycle note
for approval. It answers the question the whole plan rests on: *do you trust its pick?*

## 11. LLM Council reviews — conclusions folded in

**Review 1 (design, plan.md era):** vault-as-cache, minimal human input, slice-first, North Star.

**Review 2 (plan_2 feasibility + the two decisions):**
- **Agrees:** the cheap value is ①②⑤; **④ verification is the under-designed load-bearing
  wall** (and can't be self-grading); the **5h window is a billing artifact, not a work
  unit**; build **Phase A only** now; the portfolio is too thin for the full engine yet.
- **Clashes → resolved:** ambition vs restraint → build the minimum loop *as a protocol*;
  unattended ③ → keep supervised until ④ earns trust; retry-on-reset → deferred.
- **Blind spots:** not enough active work to feed the engine; a confidently-wrong branch
  costs trust + rework (not just tokens); both open decisions were premature → provisional
  defaults set above.
- **The one thing first:** Phase A — prove you trust the pick before building anything on it.
