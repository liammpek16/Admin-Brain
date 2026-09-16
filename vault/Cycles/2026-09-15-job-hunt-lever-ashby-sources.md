---
type: cycle
project: Job Hunt / Recruiter Helper
stage: verify
status: done
created: 2026-09-15T00:00:00.000Z
task: "add Lever + Ashby board sources (follow-up to the Greenhouse scraper)"
branch: auto/lever-ashby-board-sources
pr: https://github.com/liammpek16/job-hunt/pull/13
repo: C:/Users/liamm/job-hunt
---

## Task
Follow-up the user requested after the Greenhouse source (PR #12): add Lever + Ashby as two more
key-less, browser-free board scrapers.

## IMPLEMENT
- **`lib/sources/board-common.js`** — extracted the generic machinery (seed-board resolver,
  title/location/recency filter, dedupe, HTML strip, fetch-all-boards harvest loop). Greenhouse
  refactored onto it with identical exports/behavior (its tests unchanged + green).
- **`lib/sources/lever.js`** (+ `lever-companies.json`) — `api.lever.co/v0/postings/<token>?mode=json`;
  maps text/hostedUrl/categories.location/createdAt(ms→ISO), folds `workplaceType=remote`.
- **`lib/sources/ashby.js`** (+ `ashby-companies.json`) — `api.ashbyhq.com/posting-api/job-board/<org>`;
  maps title/location/jobUrl/publishedAt, folds `isRemote`, pulls salary from `compensation`.
- Selectable `--source lever|ashby`; honor `--since-days`; URL gate; graceful 404-skip. SKILL.md
  documents all three board sources + how to add another (~30 lines).

## VERIFY — PASS
- `node --test`: **124/124** (+12).
- LIVE against production APIs: Lever 26 open SE roles (jobgether/thinkahead/sambatv/azul/perforce),
  Ashby real Ramp/Hex SE roles across 7 org boards — no key, no browser. Seed lists are
  live-verified tokens (dead ones dropped: lever r3.com/viantinc; ashby clay/etc).

## Follow-ups (still open)
- Wire the board sources into the webapp search panel (currently claude-only).
- Tighten remote-location matching (a UK/India-remote role matches a NYC search via "remote").

## Draft PR
https://github.com/liammpek16/job-hunt/pull/13 — awaiting user merge, then tick the roadmap goal.
