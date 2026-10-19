---
type: plan
kind: roadmap
created: 2026-08-07T00:00:00.000Z
project: Job Hunt / Recruiter Helper
horizon: quarter
status: active
---

## Goal
An automated job application workflow: find fresh postings for my titles and locations, tailor
my base resume to each one I pick, give me the direct apply link, and track every application
to its outcome from my email. I apply myself. Plan approved 2026-10-19: council-revised v4
(`job-hunt/docs/plan-v4-council.md`). Jobs come only from employers' own ATS boards
(Greenhouse, Lever, Ashby, SmartRecruiters); no LinkedIn scraping. A company watchlist is the
search. Gated milestones M0–M4.

The pre-revamp goals (resume reviewer, Greenhouse/Lever/Ashby sources, old webapp, PRs #1–#15)
are in this file's git history.

## Steps

### M0: Real jobs this week (3–5 days)
- [x] M0: search profile + include/exclude title filter
  - _Description: `config/search-profile.json` with titles + synonyms, exclude words (Senior/Staff/Principal/Manager/Director/Partner/Intern), locations, max age. Fixture tests for the filter._
  - _Built 2026-10-19 ([job-hunt#17](https://github.com/liammpek16/job-hunt/pull/17), merged): `lib/profile.js`; titles incl. presales/applications-engineer variants, whole-word excludes, Boston/MA + New York/NY + US-remote (now needs a positive US signal), max 4 years required (dropped 41 roles in the first scan)._
- [x] M0: starter watchlist with tiers + ATS auto-detect; remove Jobgether, add blocklist
  - _Description: ~100 target companies (tier A/B/C) drafted with Claude; auto-detect tries slugs on each ATS API and saves the hit, else "not covered". Blocklist aggregators and staffing firms._
  - _Built 2026-10-19 ([job-hunt#17](https://github.com/liammpek16/job-hunt/pull/17), merged): 210 companies, tiers A/B/C; `npm run detect` covered 144 (greenhouse 77, ashby 49, lever 11, smartrecruiters 5, workable 2), 66 not covered (mostly Workday). Jobgether removed and blocklisted with 19 staffing firms._
- [x] M0: SmartRecruiters source (+ Workable probe) on board-common
  - _Built 2026-10-19 ([job-hunt#17](https://github.com/liammpek16/job-hunt/pull/17), merged): SmartRecruiters (paged, JD fetched for matches) + Workable widget source. Workable confirmed but rate-limits hard (IP blocked ~24 h after detection), so its detection pass is opt-in._
- [x] M0: daily scheduled scan + Backlog on first run + Greenhouse first_published
  - _Description: Windows Task Scheduler at 7am; first run marks existing jobs Backlog so New means genuinely new; use Greenhouse first_published and our own first-seen date._
  - _Built 2026-10-19 ([job-hunt#17](https://github.com/liammpek16/job-hunt/pull/17), merged): `npm run scan` (~85 s, 142/144 boards, 55 matching roles, all backlog on first run); task "JobHunt Daily Scan" registered for 07:00, live now that #17 is merged; dashboard Scan button + new/backlog/tier badges._
- [x] M0 gate: ≥ 80 covered companies and an 18/20 spot check (human)
  - _Claude's check 2026-10-19: 144 covered; random 20-role spot checks 20/20 and 19/20 after the remote fix (the miss, Colombia, now fixed), all postings live. Ticked 2026-10-19 on request; your own spot check is still worth doing in the dashboard._
  - _2026-10-19 follow-up in #17: the scan now closes roles that leave their board; 67 pre-revamp roles archived (35 no longer existed)._

### M1: Dashboard + store (1–1.5 weeks)
- [ ] M1: SQLite store (jobs, companies, events) + migrate jobs.json and Excel
- [ ] M1: Jobs tab (New/Pipeline/Closed, keyboard triage, match chips, tier ranking) + Applied button
  - _Description: Applied records date, JD snapshot, resume used, follow-up +7 d, undo. Columns include Apply ↗ (direct) and a plain Find on LinkedIn ↗ link._
- [ ] M1: Companies tab + paste-a-link intake + coverage %
  - _Description: pasting any posting URL takes only the company name (never fetches LinkedIn), auto-detects its ATS, adds it to the watchlist, and records whether we already had the job._
- [ ] M1: closed detection + health bar; retire claude posting source, adzuna, linkedin.js, dashboard.html, Excel
- [ ] M1 gate: one week of daily use, < 5 min/day triage (human)

### M2: Resume adjuster (1–1.5 weeks)
- [ ] M2: canonical base resume + in-place .docx editor (`lib/docx-edit.js`)
- [ ] M2: Generate resume → `claude -p` + guardrails + preview (PDF, bullet diff, ATS score)
  - _Description: saved to `C:\Users\liamm\job-hunt\Resumes\`; guardrails: no new employers/dates/tools/numbers, one page; Accept / Regenerate-with-note. PDF via LibreOffice headless._
- [ ] M2 gate: 5 resumes, ≤ 1 manual edit each (human)

### M3: Email tracking (1–1.5 weeks)
- [ ] M3: Gmail API read-only poller on a `Job Hunt` label
- [ ] M3: classifier + matcher + Unmatched tray + undo + ghost timer
  - _Description: rules first, `claude -p` for the rest; match by company then title; low confidence → Unmatched; 30 days of silence → Ghosted; notification on interview/offer._
- [ ] M3 gate: 2 weeks ≥ 90% correct, zero silent wrong rejections (human)

### M4: Hit rate + coverage (ongoing)
- [ ] M4: funnel metrics + weekly HUD digest + interview prep pack
- [ ] M4: discovery sweep + lookalike suggestions; Workday decision from coverage %
  - _Description: Claude suggests company slugs only (≤ 25/week, each with ≥ 1 open match). Add an opt-in Workday source only if coverage % < 70% and the missed jobs are mostly on Workday._

### Outcome
- [ ] get first interview
  - _Description: the success metric, not a build step; the loop should not SELECT it._

## Risks
- **Coverage:** ATS boards miss Workday/iCIMS enterprises. Measured by coverage % from
  paste-a-link intake; Workday decision in M4.
- **Noise at scale:** 300+ boards need a strict title filter; fixture-tested in M0.
- **Over-editing resumes:** guardrail checks in code plus a bullet diff before Accept.
- **Wrong email statuses:** low confidence goes to the Unmatched tray; every change is undoable.

> Tick a box in Obsidian to mark a goal done. Progress updates across brief/HUD/metrics.
