---
type: cycle
project: Job Hunt / Recruiter Helper
stage: verify
status: done
created: 2026-09-15T00:00:00.000Z
task: "wire the board sources (Greenhouse/Lever/Ashby) into the webapp search panel"
branch: auto/webapp-multi-source-search
pr: https://github.com/liammpek16/job-hunt/pull/14
repo: C:/Users/liamm/job-hunt
---

## Task
Follow-up: the webapp search panel was Claude-only. Let the user pick a search source
(the no-key ones) and a recency window from the browser.

## IMPLEMENT
- `skills/dashboard/dashboard.js`: `SEARCH_SOURCES` allowlist (claude=handoff,
  greenhouse/lever/ashby=live). `runSearch` (now async) routes by `body.source`: claude keeps
  the two-phase handoff (+ results-file consume); board sources fetch live + ingest. Shared
  `ingestResult()` shapes ingested/no_new (board no_new suggests widening the window / adding
  companies). New `GET /api/sources`; `NO_BOARDS`→400; board-fetch errors surfaced as
  `sourceErrors` without failing.
- `lib/webapp.js`: Source dropdown (populated from /api/sources) + "Posted within" select
  (7/14/30/90d); search body carries `source` + `sinceDays`; ingested message names the source
  and any unreachable boards. Only no-key sources offered (adzuna/linkedin need keys).

## VERIFY — PASS
- `node --test`: **132/132** (+8): searchSources, source routing (live path via injected fake
  module, no_new, sourceErrors), /api/sources, unknown-source 400, HTML selectors.
- LIVE E2E through the server: /api/sources lists all four; a Greenhouse search ingested 48 real
  roles (dead board skipped); bad source → 400; store restored to 22.

## Follow-up (open)
- Tighten remote-location matching (a remote-anywhere role matches a located search via "remote").

## Draft PR
https://github.com/liammpek16/job-hunt/pull/14 — awaiting user merge, then tick the roadmap goal.
