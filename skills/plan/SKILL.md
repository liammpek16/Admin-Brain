---
name: plan
description: Turn a stated goal for a project into a structured plan note (goal, checkboxed steps, risks, horizon) at vault/Plans/. Use when you want to capture a plan of action for a project. Deterministic scaffolder, refuses to overwrite without --force, no LLM, $0.
---

# plan

Scaffolds a plan note at `vault/Plans/<slug>.md` (`type: plan`) from a goal and optional
steps/risks. Won't overwrite an existing plan unless `--force` is passed.

## Usage
```bash
node skills/plan/plan.js --goal "Ship coaching v1" --project "Dota Coach" \
  --horizon week --step "Define milestone" --step "Log a session" --risk "Parser regressions"
```

- `--goal` (required), `--project`, `--horizon` (day|week|month|quarter, default week),
  repeatable `--step` and `--risk`, and `--force` to replace an existing plan.
- Filename is a slug of `<project>-<goal>`. Vault path via `ADMIN_BRAIN_VAULT`.
