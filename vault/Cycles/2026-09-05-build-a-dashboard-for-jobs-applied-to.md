---
type: cycle
project: Job Hunt / Recruiter Helper
stage: done
status: done
task: Build a dashboard for jobs applied to / interviews completed
started: '2026-09-05'
approved: '2026-09-05'
repo: 'https://github.com/liammpek16/job-hunt'
local_path: 'C:/Users/liamm/job-hunt'
pr: 'https://github.com/liammpek16/job-hunt/pull/5'
---

## Task (from SELECT)
Build a dashboard for jobs applied to / interviews completed (roadmap goal 6).

## Council refinement
- **🟢 Expansionist:** the dashboard is the 4th consumer of the shared store — aggregate the
  same `data/jobs.json` the searcher writes; don't invent a new data shape.
- **⚪ Outsider:** I want to see, at a glance, how many I applied to, who I'm interviewing
  with, and whether it's working (the funnel toward an interview — the project's real metric).
- **🟡 Executor:** deterministic aggregate → self-contained HTML (funnel + tiles + table, no
  server/deps) + a terminal summary; carry the lightweight tracking commands
  (--apply/--status/--interview) so the dashboard has real data; HTML-escape all user data.

## Definition of done
- [x] Tracks jobs applied to + interviews completed
- [x] Renders a dashboard (HTML + terminal) over the structured records
- [x] Self-contained (no server/deps); XSS-safe rendering
- [ ] **Populated with real applications** — as the user applies to roles from the searcher

## Implementation
Branch `auto/jobs-dashboard` (stacked on goal 4); draft PR #5. `lib/dashboard.js`
(aggregate/renderHtml/renderTerminal) + `skills/dashboard/` + `test/dashboard.test.js`.
Verified visually with a seeded demo (Sourced 6 → Applied 5 → Interviewing 3 → Offer 1,
3 interviews) and sent to the user.

## Verify (2026-09-05) — verdict pass-with-notes
Report: `vault/Reports/2026-09-05-jobs-dashboard-verify.md`. **10/10** (5 unit + 5 adversarial).
Open DoD gate: populate with real applications. Roadmap goal 6 stays UNTICKED until it holds
real data.
