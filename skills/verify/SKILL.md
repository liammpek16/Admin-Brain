---
name: verify
description: Independently verify an implemented task (Plan 2, stage ④) — a separate adversarial pass that tries to BREAK the new feature (edge cases, bad input, failure modes) against its definition of done, and writes an honest weaknesses/improvements report to vault/Reports/. Never the implementer grading its own work; gates the merge/review.
---

# verify

Stage ④. Two parts:

## 1. Harness (deterministic)
```bash
node skills/verify/verify.js --project "Dota Coach"
```
Scaffolds `vault/Reports/<date>-<task>.md` (sections: automated checks, what was tested,
findings, improvements, verdict) and advances the cycle to `stage: verify`.

**Automated checks:** if the project note sets `verify_cmd` (run in `local_path`), the harness
runs it first (15 min timeout; the whole process tree is killed on timeout) and records
PASS/FAIL, the exit code and the last 40 output lines under `## Automated checks`, plus
`automated_checks: pass|fail` in the report frontmatter. `--no-checks` skips it. A failing
check means the verdict can be no better than **fails-DoD** unless the failure is shown to be
unrelated to the task. The checks are a floor, not the adversarial pass: still try to break
what they don't cover.

## 2. Independent adversarial pass (agent)
A **separate** pass — not the implementer confirming its own work — writes and runs tests
aimed at breaking the feature against its **definition of done**: malformed input, missing
files, network failure, boundary values, false-positive/negative cases, and scope gaps.
Record honestly in the report:
- **Findings** — what broke or is weak (even if the DoD technically passed).
- **Improvements** — concrete, prioritized fixes.
- **Verdict** — pass / pass-with-notes / fails-DoD.

The report gates human review (⑤). A clean DoD with real weaknesses is still `pass-with-notes`.
