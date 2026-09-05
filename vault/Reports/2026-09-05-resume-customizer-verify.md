---
type: report
project: Job Hunt / Recruiter Helper
cycle: Build the resume customizer skill
stage: verify
verdict: pass-with-notes
date: '2026-09-05'
pr: 'https://github.com/liammpek16/job-hunt/pull/3'
---

# VERIFY — resume customizer (goal 3)

Independent pass on `lib/tailor.js` + `skills/customizer` (branch `auto/resume-customizer`,
draft PR #3).

## Result: **pass-with-notes** — 14/14

- **Unit (7/7):** extractKeywords surfaces JD skills + drops stopwords; frequency ranking puts
  repeated terms first; coverage splits present/missing (whole-word); tailorResume threads the
  XYZ summary + flags weak bullets + suggests missing keywords; strong resume covers core
  skills; tokenizer keeps c++/node.js and splits ci/cd.
- **Adversarial (7/7):** empty JD → 0 keywords, no crash; empty resume → all missing;
  **whole-word coverage** (`java` ≠ `javascript`); duplicate keyword counted once; topN
  respected (with valid multi-char terms); pct math correct (50%); suggestions always a
  non-empty array.

## Notes / open gaps

- **Reuses the goal-1 scorer** (`reviewResume`) — one contract, no duplicated critique logic.
  So goal-1's heuristic limits carry over (fine; same tuning point).
- **Rewrites are guidance, not drafts.** It names the missing keywords and the weak bullets;
  the actual rewrite is the user's (an optional later LLM pass could draft them). This is the
  honest deterministic/$0 boundary and respects the over-editing guard.
- **Not validated on real inputs** — needs the user's resume + a real JD (or a saved role from
  a live Adzuna search). Last gate.

## Recommended next

The ATS scanner (goal 4) reuses `extractKeywords`/`keywordCoverage` from here — build it next,
then validate customizer + ATS together on a real resume/JD pair.
