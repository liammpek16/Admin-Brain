---
type: report
project: Job Hunt / Recruiter Helper
cycle: Build the ATS scanner skill
stage: verify
verdict: pass-with-notes
date: '2026-09-05'
pr: 'https://github.com/liammpek16/job-hunt/pull/4'
---

# VERIFY — ATS scanner (goal 4)

Independent pass on `lib/ats.js` + `skills/ats` (branch `auto/ats-scanner`, draft PR #4).

## Result: **pass-with-notes** — 14/14

- **Unit (8/8):** clean resume → low risk (≥80); missing email → HIGH; table → HIGH; image →
  HIGH; missing Skills+Experience sections flagged; low JD keyword coverage → HIGH auto-reject;
  weak quantification flagged; score floored at 0 with a valid verdict.
- **Adversarial (6/6):** empty resume safe + score floored; no-JD → null coverage, no keyword
  finding; verdict is always one of the three strings; every finding has severity+code+message;
  good coverage → no low-keyword finding; HTML detected.

## Notes / open gaps

- **Text-level parseability only.** Input is Markdown/text, so it cannot inspect PDF/DOCX
  layout (multi-column, text boxes). It targets the text-level issues that break most ATS —
  documented as a known limit in SKILL.md. A later PDF/DOCX-ingest cycle would extend this.
- **Score weights are heuristic** (high −20 / med −10 / low −3). Reasonable defaults; tunable
  once run against real resumes.
- **Shares the contract:** reuses goal-1 quantification + goal-3 keyword coverage — so the
  three skills stay consistent, but goal-1's heuristic verb/quant limits carry over.
- **Not validated on a real tailored resume** — last gate (ties to goal 5, the pipeline test).

## Recommended next

Run the whole pipeline (reviewer → customizer → ATS) on the user's real resume + a real JD
(goal 5), then the dashboard (goal 6, this batch) over the resulting application records.
