---
type: project
name: Job Hunt / Recruiter Helper
status: active
health: green
priority: high
next: output the tailored resumes as PDFs instead of only .docx
started: '2026-09-05'
updated: '2026-09-14'
tags:
  - career
  - tooling
repo: 'https://github.com/liammpek16/job-hunt'
local_path: 'C:/Users/liamm/job-hunt'
webapp_url: 'http://127.0.0.1:4188'
webapp_cmd: powershell -NoProfile -ExecutionPolicy Bypass -File run-dashboard.ps1
webapp_cwd: 'C:/Users/liamm/job-hunt'
---

## Summary
A helper for the job hunt / recruiting workflow. Build started 2026-09-05 — all 5 v1 skills
built through the loop (draft PRs, awaiting review + real-resume/key validation).

## Now
- All 5 skills MERGED to `main` (`liammpek16/job-hunt`), PRs #1–#5, 47/47 tests:
  reviewer (shared XYZ scorer) · searcher (Adzuna + LinkedIn auto-detect) · customizer ·
  ATS scanner · dashboard. Reviewer/customizer/ATS also generate a `.docx`.
- Remaining: goal 5 (full-pipeline test on the real resume — needs an Adzuna/LinkedIn key
  + a real JD) and goal 7 (get an interview, the outcome metric).

## Blockers
- Adzuna `app_id`/`app_key` (or a third-party LinkedIn-jobs provider key) needed to live-run
  the searcher end-to-end (goal 2 works; just needs a key for a real query).

## Log
- 2026-08-06 — Created as a planned project.
- 2026-09-04 — Scope refinement cycle: README + build order + repo pushed to GitHub.
- 2026-09-05 — Ran all 5 goals through the loop: reviewer, searcher, customizer, ATS,
  dashboard. Each has a cycle note + verify report.
- 2026-09-05 — Follow-ups per user: .docx export (reviewer/customizer/ATS) + LinkedIn
  source auto-detect (searcher). Reviewer validated on the real resume.
- 2026-09-05 — PRs #1–#5 MERGED to main in order (squash), 47/47 tests. 5 build goals
  ticked; pipeline test (goal 5) + interview (goal 7) remain.

> You own `health` · `priority` · `next`.
