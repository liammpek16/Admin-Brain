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
Scaffolds `vault/Reports/<date>-<task>.md` (sections: what was tested, findings, improvements,
verdict) and advances the cycle to `stage: verify`.

## 2. Independent adversarial pass (agent)
A **separate** pass — not the implementer confirming its own work — writes and runs tests
aimed at breaking the feature against its **definition of done**: malformed input, missing
files, network failure, boundary values, false-positive/negative cases, and scope gaps.
Record honestly in the report:
- **Findings** — what broke or is weak (even if the DoD technically passed).
- **Improvements** — concrete, prioritized fixes.
- **Verdict** — pass / pass-with-notes / fails-DoD.

The report gates human review (⑤). A clean DoD with real weaknesses is still `pass-with-notes`.
