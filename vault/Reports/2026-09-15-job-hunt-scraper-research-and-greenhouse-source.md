---
type: report
project: Job Hunt / Recruiter Helper
created: 2026-09-15T00:00:00.000Z
cycle: 2026-09-15-job-hunt-improve-scraper
verdict: pass
---

# Improve the scraper — research + new Greenhouse source

## 1. What is currently being "scraped"

The project **does not scrape HTML at all** — a deliberate choice, because scraping
LinkedIn/Indeed hits anti-bot walls and violates their ToS (the roadmap's flagged #1 risk).
The searcher has three pluggable **sources** (`lib/sources/*`), each exporting
`fetchRoles(params, target, opts)`:

| Source | Key needed? | How it gets jobs | Notes |
|---|---|---|---|
| **adzuna** | Free key (`ADZUNA_APP_ID/KEY`) | Official Adzuna aggregator API, paginates ≥100 | Real listings across many boards; title/location/salary filters |
| **linkedin** | Paid provider key | A **third-party** relicensed LinkedIn-jobs API (RapidAPI/Proxycurl) | LinkedIn has **no** first-party public job-search API; direct scraping = ToS violation |
| **claude** | None ($0) | Claude Code **subscription web-search** via a file handoff | Default when no key; now with a 7-day recency window + valid-URL gate |

In practice the roles surfaced so far come from **Greenhouse, Lever and Ashby** ATS boards
(that's what the Claude web search returns) — so those platforms are the highest-value targets.

## 2. Platforms that can be added (research)

**Key-less, official, no browser — recommended:**

| Platform | Endpoint | Cost | Fit |
|---|---|---|---|
| **Greenhouse** (built this cycle) | `boards-api.greenhouse.io/v1/boards/<token>/jobs` | Free, no key | Per-company boards; exactly where our roles already come from |
| **Lever** | `api.lever.co/v0/postings/<company>?mode=json` | Free, no key | Same model as Greenhouse; natural next add |
| **Ashby** | `api.ashbyhq.com/posting-api/job-board/<org>` | Free, no key | Same model; growing adoption |
| **The Muse** | `themuse.com/api/public/jobs?category=&location=&page=` | Free, no key | General aggregator with location + category |
| **Remotive / RemoteOK / Arbeitnow / Jobicy** | public JSON feeds | Free, no key | Remote-focused; good for remote searches |
| **USAJOBS** | `data.usajobs.gov/api` | Free, email+key | US federal roles |
| **HN "Who is hiring"** | Algolia HN API | Free, no key | Monthly thread; startup-heavy |

**Require a key / partner approval:** Adzuna (have it), LinkedIn/Indeed/Glassdoor first-party
(partner-gated, not open).

## 3. What was implemented

A new **`greenhouse` source** (`lib/sources/greenhouse.js`) — a real, key-less, browser-free
scraper of official Greenhouse boards. Given a seed list of company tokens
(`lib/sources/greenhouse-companies.json`, override via `GREENHOUSE_COMPANIES` or
`data/greenhouse-companies.json`), it pulls every open posting, filters by title + location +
recency, dedupes, and normalizes to the shared role shape. Run with
`--source greenhouse`; all sources also gained `--since-days`.

**Live-verified:** a real run over the seed boards surfaced **48 open "Sales Engineer" roles**
(e.g. Datadog Enterprise/Senior SE) with real posting URLs — no key, no browser. Two dead
seed tokens 404'd and were skipped gracefully.

## 4. Do we need browser integration? — NO (for this)

**No browser automation is needed** for this improvement or for meaningful coverage growth:
Greenhouse, Lever, Ashby, The Muse and the remote boards are all **key-less JSON HTTP APIs**.
A headless browser is only required to scrape **LinkedIn, Indeed, Glassdoor, ZipRecruiter**
directly — which are **anti-bot and against their ToS**. Recommendation: **do not** build
browser scraping of those; instead add the Lever/Ashby/Muse sources (same pattern as
Greenhouse) for far more reach at $0 and zero legal risk. If you ever specifically want
LinkedIn/Indeed data, the safe path is a paid relicensed provider key (the existing `linkedin`
source), not a scraper.

## Verify
`node --test` **112/112** (+9 greenhouse tests) + live fetch against the production Greenhouse
API. $0 / no new deps / no key / no browser.
