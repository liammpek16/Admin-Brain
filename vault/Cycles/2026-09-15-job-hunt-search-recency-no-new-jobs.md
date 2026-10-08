---
type: cycle
project: Job Hunt / Recruiter Helper
stage: verify
status: done
created: 2026-09-15T00:00:00.000Z
task: "new searches do not surface new jobs → last-week recency window or expand-criteria error"
branch: auto/search-recency-window-no-new-jobs
pr: https://github.com/liammpek16/job-hunt/pull/11
repo: C:/Users/liamm/job-hunt
---

## Task
Roadmap goal: "new searches do not surface any new jobs. This should be adjusted to either
find new job postings within the last week, or provide an error saying that there have been
no new job postings within the last week and the search criteria should be expanded."

## REFINE — root cause
`lib/sources/claude.fetchRoles` returned an ingest as long as the `.results.json` file
existed, so every re-run re-ingested the SAME cached file → all roles already in the store →
`added:0`. No recency filter existed either (`created` was ignored). Together: "new searches
surface no new jobs," with no useful feedback. (Confirmed: a stale
`claude-search-sales-engineer-new-york-city.results.json` sat in data/.)

## IMPLEMENT (branch `auto/search-recency-window-no-new-jobs`, commit on branch)
1. **Recency window (7 days)** — request spec + handoff prompt ask Claude for postings created
   in the last week WITH an ISO `created` date; `fetchRoles` filters ingested roles via
   `withinDays` and returns `{ total, recent, stale, sinceDays }`.
2. **Fresh re-runs** — `archiveResults` renames the results file aside AFTER ingest, so the next
   run re-enters the handoff and searches afresh (the real fix for "no new jobs").
3. **`no_new` outcome** — when a search adds 0 new recent roles, `runSearch` returns
   `status:'no_new'` + an "expand your criteria" message; the webapp shows it as an error
   instead of a silent "0 added". Searcher CLI mirrors it + gains `--since-days`.
Files: `lib/sources/claude.js`, `skills/dashboard/dashboard.js`, `skills/searcher/searcher.js`,
`lib/webapp.js`, tests. $0/no-LLM/no-network/no new deps.

## VERIFY — PASS
- `node --test`: **103/103** (+8): `withinDays`, recency split, `archiveResults`→fresh handoff,
  `runSearch` `no_new`/`ingested` (store-safe, self-cleaning), prompt recency. Updated 4 existing
  phase-2 tests to carry recent `created` dates (recency filter changed their semantics).
- Live HTTP: handoff → no_new (expand-criteria message) → ingested; store restored (22 roles),
  temp files cleaned.

## Notes
- Recency enforced on `created`; the 22 pre-existing roles (created:null) are left untouched.
- The user's stale NYC results file self-heals on next run (dupes → no_new → archived → fresh).

## Draft PR
https://github.com/liammpek16/job-hunt/pull/11 — awaiting user merge, then tick the roadmap goal.
