---
type: cycle
project: Job Hunt / Recruiter Helper
stage: verify
status: done
created: 2026-09-15T00:00:00.000Z
task: "tighten remote-location matching so foreign-remote roles don't match a US search"
branch: auto/fix-remote-location-matching
pr: https://github.com/liammpek16/job-hunt/pull/15
repo: C:/Users/liamm/job-hunt
---

## Task
The last open follow-up from the board-scraper work: `board-common.locationMatches` matched ANY
role containing "remote", so a "United Kingdom, Remote" / "India (Remote)" role surfaced for a
New York (US) search.

## IMPLEMENT
Rewrote `locationMatches(location, query, country='us')` in `lib/sources/board-common.js`:
direct location-term overlap still matches; a REMOTE role matches only when it is
location-agnostic (bare Remote / Global / Worldwide / Anywhere), scoped to the query's own
country or a compatible US region (US/USA/America(s)/North America), or scoped to somewhere not
identifiable as foreign (e.g. a US city). A remote role naming a clearly FOREIGN country/region
(UK/India/Canada/EMEA/APAC/…) is dropped. Country from `params.country` (default us), threaded
through `harvest`. Short codes (us/uk) matched whole-word (so "Waukesha" ≠ UK). Applies to all
three board sources via the shared module.

## VERIFY — PASS
- `node --test`: **139/139** (+7, `test/board-location.test.js`): direct overlap, US-remote kept,
  agnostic/global kept, foreign-remote (UK/India/Canada/EMEA/APAC) dropped, whole-word code
  matching, country-param flips compatibility.
- LIVE: a Datadog SE search for "New York" went 20→17 roles — 0 UK/foreign remained, all US and
  US-remote kept.

## Draft PR
https://github.com/liammpek16/job-hunt/pull/15 — awaiting user merge, then tick the roadmap goal.
This clears the last logged follow-up from the scraper arc.
