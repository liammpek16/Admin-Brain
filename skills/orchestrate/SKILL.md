---
name: orchestrate
description: Master-agent protocol run after the refined spec is approved, before/through IMPLEMENT and VERIFY — feasibility pass + complexity-routed sub-agents. The harness does deterministic scoring; the agent does the judging.
---

# orchestrate

Stage ② → ③. The master agent (the Claude Code session driving the loop) JUDGES: it scores a
refined spec's feasibility and breaks it into sub-tasks with declared attributes. The harness does
the ARITHMETIC: feasibility verdict, per-task complexity tier, tier → model alias, and the
verify-independence rule — then records the plan in the cycle note. No LLM, no network, $0.

## What it is

- **Master agent** = the Claude Code session driving the loop, following SKILL.md
- **Sub-agents** = Agent tool calls with a `model` override, scoped to task files
- **Harness** = deterministic scoring (feasibility, complexity, tier, routing), exports + unit-tested
- **Feasibility verdict** = ADVISORY. It informs the human gates, never replaces them. No-go / go-with-split are surfaced to the human; human gates unchanged.

## Feasibility rubric

Score each of 5 dimensions: **clarity**, **size**, **cost**, **risk**, **testability**. Each is an integer 0–2.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| **clarity** | spec is unclear; send back to REFINE | some gaps | crisp, complete |
| **size** | not branch-sized; split before IMPLEMENT | acceptable | small, focused |
| **cost** | needs paid/external service; breaks $0/local-first | new deps or usage spend, still local | $0, no new deps |
| **risk** | unacceptable risk to main or vault data | medium risk | low or managed risk |
| **testability** | no way to verify it; VERIFY can't gate it | partial coverage | clear, testable definition of done |

**Blockers:** any 0 on clarity, cost, risk, or testability → **no-go**. Also: size 0 → **go-with-split** (not branch-sized; split before IMPLEMENT). If total score < 7 (0–10) → **go-with-split** (weak on named dimensions; consider splitting/tightening). Otherwise **go**.

## Task attributes and scoring

Master agent declares each sub-task:
```json
{
  "id": "task-slug",
  "title": "Human-readable task name",
  "kind": "mechanical|feature|design|verify",
  "files": 3,
  "novel_design": false,
  "ambiguity": "low|med|high",
  "risk": "low|med|high",
  "status": "pending|running|done|failed|skipped",
  "note": "Optional context"
}
```

Harness computes **tier** (light/standard/heavy) by complexity score:

| Input | Base | Bands | Novel | Ambiguity | Risk | Total score | Tier |
|---|---|---|---|---|---|---|---|
| kind | mechanical:0, feature:1, design:3, verify:1 | files: 0–1→0, 2–4→1, 5+→2 | yes:+2, no:0 | low:0, med:1, high:2 | low:0, med:1, high:2 | sum above | ≤1→light, ≤4→standard, else→heavy |

**Floors:** design tasks ≥ heavy; verify tasks ≥ standard. Verify tasks are lifted to at least the highest implement task's tier (never below standard).

## Tier → model routing

```json
{
  "light": "haiku",
  "standard": "sonnet",
  "heavy": "opus"
}
```

Override via `ADMIN_BRAIN_TIER_MODELS` environment variable (JSON `{ tier: alias }`):
```bash
export ADMIN_BRAIN_TIER_MODELS='{"light":"sonnet","heavy":"opus"}'
node skills/orchestrate/orchestrate.js --project "..." --plan plan.json
```

## Verify independence

The plan must have:
- ≥ 1 implement task (kind: mechanical/feature/design)
- ≥ 1 verify task (kind: verify)
- Every verify task routed to a tier ≥ the max implement task tier (at least standard)

The verifier is a separate sub-agent, never the implementer.

## CLI and plan.json

```bash
node skills/orchestrate/orchestrate.js --project "<name>" --plan plan.json [--cycle <base>] [--dry-run]
```

Options:
- `--project "<name>"` — required; the project whose open cycle is written
- `--plan <file>` — path to plan.json
- `--cycle <base>` — explicit cycle note name (e.g. `2026-10-08-<task-slug>`); if omitted, finds latest open cycle for the project
- `--dry-run` — score only; do not write to the cycle note

Example `plan.json`:
```json
{
  "feasibility": {
    "clarity": 2,
    "size": 2,
    "cost": 2,
    "risk": 1,
    "testability": 2
  },
  "tasks": [
    {
      "id": "impl-auth",
      "title": "Implement OAuth login flow",
      "kind": "feature",
      "files": 5,
      "novel_design": true,
      "ambiguity": "med",
      "risk": "med",
      "status": "pending"
    },
    {
      "id": "verify-auth",
      "title": "Verify OAuth edge cases and security",
      "kind": "verify",
      "files": 2,
      "novel_design": false,
      "ambiguity": "low",
      "risk": "high",
      "status": "pending"
    }
  ]
}
```

## Dispatch protocol

1. **Score** — Master agent evaluates feasibility + complexity; drafts plan.json.
2. **Validate** — Run harness (dry-run) to check feasibility verdict and tier routing.
3. **Write plan** — If verdict is "go" or human approves "go-with-split", run harness to write `## Feasibility` and `## Orchestration plan` to the cycle note (idempotent; replaces prior sections).
4. **Spawn sub-agents** — For each pending task in order, spawn a sub-agent with `model` override + self-contained prompt scoped to task's files.
5. **Review output** — Check each sub-agent's work against the definition of done.
6. **Checkpoint** — Commit changes with a checkpoint message (never amend; create new commits).
7. **Update plan** — Mark task `status: running/done/failed` in plan.json; re-run harness to refresh cycle note.
8. **Verify last** — Verify task runs last (independent of implementer); produce report in `vault/Reports/`.
9. **Human review** — VERIFY report gates the merge/review.
