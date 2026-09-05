---
type: report
project: Job Hunt / Recruiter Helper
cycle: Build the resume reviewer skill
stage: verify
verdict: pass-with-notes
date: '2026-09-05'
pr: 'https://github.com/liammpek16/job-hunt/pull/1'
---

# VERIFY — resume reviewer (goal 1)

Independent adversarial pass on `lib/xyz.js` + `skills/reviewer` (branch
`auto/resume-reviewer-xyz-scorer`, draft PR #1).

## Result: **pass-with-notes** — 18/18 checks

- **Unit (8/8, `node --test`):** full XYZ = 3/3; missing-Y flagged; weak bullet = 0/3;
  money/multiplier/time all count as Y; method via "by …ing" and using/via; bullet
  extraction (-,*,•,numbered) ignores prose; sample-resume summary correct; empty resume safe.
- **Adversarial (10/10):** bare year NOT counted as Y (V1); percent-word form (V2); empty
  string (V3) and non-string input (V4) don't crash; unicode • and indented bullets extract
  (V5,V6); verb detection case-insensitive (V7); prose lines never become bullets (V8);
  HTML-ish bullet text doesn't crash the report (V9); full-XYZ bullet yields a null rewrite,
  no noise (V10).

## Notes / open gaps

- **DoD not fully met: not yet validated on the user's REAL resume.** Verified on a synthetic
  sample only; the reviewer's whole point is the user's actual bullets. This is the last gate —
  awaiting the resume file the user said they'd provide.
- **Rewrites are scaffolds, by design** (no LLM → can't fabricate metrics). Honest, but an
  optional later cycle could add an opt-in LLM rewrite pass.
- **Detection is heuristic**: an action verb outside the ~75-word list reads as missing X, and
  an unusual quantifier phrasing could miss Y. Tunable; acceptable for v1.

## Recommended next

Validate on the real resume; if the verb list or quantifier regex misfires on real bullets,
widen them. Then goals 3 (customizer) and 4 (ATS) build directly on this scorer.
