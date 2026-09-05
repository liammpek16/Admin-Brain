---
type: cycle
project: Job Hunt / Recruiter Helper
stage: done
status: done
task: Build the job searcher skill (>=100 roles for title/location/salary)
started: '2026-09-05'
approved: '2026-09-05'
readme_source: 'https://github.com/liammpek16/job-hunt'
repo: 'https://github.com/liammpek16/job-hunt'
local_path: 'C:/Users/liamm/job-hunt'
pr: 'https://github.com/liammpek16/job-hunt/pull/2'
---

## Task (from SELECT)
Build the job searcher skill — surface >=100 roles for a given title/location/salary.

## Council refinement (the key decision: data source)
- **🔴 Contrarian / ⚪ Outsider:** the roadmap's own Risks section names this as the biggest
  risk — LinkedIn/Indeed scraping hits anti-bot/ToS limits and won't reliably reach 100. Don't
  build a scraper that breaks and may violate ToS.
- **🔵 First-Principles:** the atomic need is "given a profile, return many real, legal
  listings, paginated." An **official aggregator API** provides exactly that.
- **🟢 Expansionist:** make the source **pluggable** so the skill isn't wedded to one provider;
  normalize every result into the shared role shape so goals 3/4/6 reuse it.
- **🟡 Executor:** **Adzuna** (developer.adzuna.com) — free-tier, legal, many boards,
  title/location/salary filters, 50/page pagination → reaches >=100. User chose "Official API".

**Refined spec:** pluggable source (default Adzuna) with an injectable HTTP layer (testable
without a key); env-only credentials; normalize to the shared shape; save to `data/jobs.json`
at status `saved`; **never apply** (human gate); signal under-target via exit code.

## Definition of done
- [x] Query by title/location/salary, paginate toward a target of >=100
- [x] Pluggable source interface; results normalized to the shared shape
- [x] Saved to the shared store (`data/jobs.json`) for downstream skills; never auto-applies
- [x] Credentials env-only, never in code or the URL path
- [ ] **Live-validated with a real Adzuna key** — pending the user's free key

## Implementation
Branch `auto/job-searcher-adzuna` (stacked on goal 1); draft PR #2.
`lib/sources/adzuna.js` (buildUrl/normalize/fetchRoles, injectable httpGetJson) + `lib/store.js`
(shared job/app store) + `skills/searcher/` (CLI + SKILL.md) + `test/searcher.test.js`.

## Verify (2026-09-05) — verdict pass-with-notes
Report: `vault/Reports/2026-09-05-job-searcher-verify.md`. **14/14** (7 unit + 7 adversarial).
Open DoD gate: **live run against Adzuna needs the user's free key** (code paths verified with
fixtures). Roadmap goal 2 stays UNTICKED until a live run confirms >=100 for a real query.

## Follow-up (2026-09-05, user request): LinkedIn source + auto-detect
Searcher now auto-selects its source: LinkedIn when a provider key (LINKEDIN_JOBS_API_KEY) is
present, else Adzuna (--source overrides). HONEST FRAMING: LinkedIn has no first-party public
job-search API for individuals (partner-gated), so lib/sources/linkedin.js targets a THIRD-PARTY
LinkedIn-jobs provider (RapidAPI/Proxycurl-style) via the user's provider key -- injectable HTTP,
tolerant normalization, fixture-tested. resolveSource() in searcher.js. +4 tests. PR #2 updated.
