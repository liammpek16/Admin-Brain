---
type: report
project: Job Hunt / Recruiter Helper
cycle: Build the job searcher skill
stage: verify
verdict: pass-with-notes
date: '2026-09-05'
pr: 'https://github.com/liammpek16/job-hunt/pull/2'
---

# VERIFY — job searcher (goal 2)

Independent pass on `lib/sources/adzuna.js`, `lib/store.js`, `skills/searcher`
(branch `auto/job-searcher-adzuna`, draft PR #2).

## Result: **pass-with-notes** — 14/14

- **Unit (7/7):** paginates to 100 over 2 fixture pages; stops when results run out (no
  infinite loop, returns what exists); normalize maps Adzuna→shared shape; **NO_CREDS thrown
  before any network call**; buildUrl includes filters + keeps creds as query params (Adzuna's
  scheme) not the path; store dedups by id, setStatus/addInterview advance correctly; bad
  status + unknown id rejected.
- **Adversarial (7/7):** store persists to disk and dedups across separate load→save cycles;
  no `salary_*` param when unset; parseArgs coerces numbers + sane defaults; `--no-save` flips
  off; unknown `--source` gives a helpful error; addInterview on a fresh role auto-sets
  `interviewing`; total surfaced from `count`.

## Notes / open gaps

- **Not live-validated.** All checks use fixtures — the real Adzuna response and the true
  ">=100 for a real query" claim can't be confirmed without the user's free key. This is the
  last gate.
- **Security:** credentials read only from env; never logged, never in the URL path (query
  params only, as Adzuna requires). `data/jobs.json` is gitignored (user data).
- **Never applies.** The skill only surfaces + saves at `saved`; advancing to `applied` and
  applying are the user's action — matches the roadmap's human gate.

## Recommended next

User sets `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` and runs a real query (e.g. their target title +
location) to confirm >=100 and eyeball result quality; widen filters if under target. Then the
customizer (goal 3) reads a saved role's description to tailor against.
