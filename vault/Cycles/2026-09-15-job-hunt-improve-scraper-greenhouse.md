---
type: cycle
project: Job Hunt / Recruiter Helper
stage: verify
status: done
created: 2026-09-15T00:00:00.000Z
task: "improve the scraper — describe current sites, research others, implement a new scraper, flag browser need"
branch: auto/greenhouse-board-scraper-source
pr: https://github.com/liammpek16/job-hunt/pull/12
repo: C:/Users/liamm/job-hunt
report: Reports/2026-09-15-job-hunt-scraper-research-and-greenhouse-source.md
---

## Task
Roadmap goal: improve the scraper — describe what sites are scraped now, research other
platforms, implement a new scraper with improved features, and flag if browser integration is
needed.

## REFINE — grounding
There is **no HTML scraper** (deliberate: LinkedIn/Indeed scraping = anti-bot + ToS risk, the
roadmap's #1 flagged risk). Three sources exist: `adzuna` (free key, official API), `linkedin`
(paid third-party relicensed provider — LinkedIn has no first-party public search API), and
`claude` (subscription web-search file handoff, $0 default; 7-day recency + URL gate). Surfaced
roles come mostly from **Greenhouse / Lever / Ashby** ATS boards → those are the best targets.

## IMPLEMENT — new `greenhouse` source
`lib/sources/greenhouse.js` — key-less, browser-free scraper of official Greenhouse boards
(`boards-api.greenhouse.io/v1/boards/<token>/jobs?content=true`). Seed board list
(`lib/sources/greenhouse-companies.json`; override via `GREENHOUSE_COMPANIES` env or
`data/greenhouse-companies.json`), filter by title + location + recency, dedupe, normalize to
the shared shape (`source:"greenhouse"`). Reuses claude's `withinDays`/`validPostingUrl`.
Selectable via `--source greenhouse`; all sources gained `--since-days`. SKILL.md documented.
No searcher-code change needed (generic `loadSource`; claude-only `archiveResults` is guarded).

## VERIFY — PASS
- `node --test`: **112/112** (+9): resolveBoards (opts/env/bundled floor), title/location match,
  normalize + HTML strip + URL gate, multi-board fetch with recency split + dedupe, graceful
  404-skip recorded in `errors`.
- **LIVE** against production Greenhouse API: 48 open "Sales Engineer" roles across the seed
  boards (Datadog etc.) with real URLs, no key, no browser. 2 dead seed tokens (vimeo,
  coactivesystems) 404'd → removed from the seed; 7 working boards remain.

## Browser integration — answer: NO
Not needed. Greenhouse/Lever/Ashby/The Muse are key-less JSON APIs. A browser is only required
to scrape LinkedIn/Indeed/Glassdoor directly (anti-bot + ToS-violating) — recommended AGAINST;
add Lever/Ashby sources instead (same pattern). Research report has the full platform table.

## Follow-ups
- Add `lever` + `ashby` sources (same shape) for more coverage.
- Wire `greenhouse` into the webapp search panel (currently claude-only).
- Tighten remote-location matching (a UK-remote role currently matches a NYC search via "remote").

## Draft PR
https://github.com/liammpek16/job-hunt/pull/12 — awaiting user merge, then tick the roadmap goal.
