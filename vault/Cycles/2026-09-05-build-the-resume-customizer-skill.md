---
type: cycle
project: Job Hunt / Recruiter Helper
stage: done
status: done
task: Build the resume customizer skill (tailor to a JD, XYZ)
started: '2026-09-05'
approved: '2026-09-05'
repo: 'https://github.com/liammpek16/job-hunt'
local_path: 'C:/Users/liamm/job-hunt'
pr: 'https://github.com/liammpek16/job-hunt/pull/3'
---

## Task (from SELECT)
Build the resume customizer skill — tailor the resume to a specific job description (XYZ).

## Council refinement
- **🟢 Expansionist / 🔵 First-Principles:** don't re-implement critique — the customizer is
  the goal-1 scorer + a keyword-gap layer. Reuse `reviewResume` from `lib/xyz.js` (the shared
  contract) and add JD keyword coverage.
- **⚪ Outsider:** I want it to tell me which JD words I'm missing AND which bullets to fix —
  and to pull the JD straight from a role I already searched, not re-paste it.
- **🟡 Executor:** deterministic keyword extraction (stopword-filtered frequency ranking) +
  whole-word coverage + XYZ scoring; suggest weaving missing keywords into weak bullets **only
  where truthful**; suggestions only (over-editing guard). JD from `--jd <file>` or `--role
  <store id>`.

## Definition of done
- [x] Tailors a resume to a specific JD; reuses the goal-1 XYZ scorer
- [x] Keyword-gap analysis (present/missing/pct) + structured output the ATS scanner reuses
- [x] JD from a file or a saved role id (shared store threads search → tailor)
- [x] Suggestions only — never edits the resume
- [ ] **Validated on a real resume + real JD** — pending the user's resume

## Implementation
Branch `auto/resume-customizer` (stacked on goal 2); draft PR #3. `lib/tailor.js`
(extractKeywords/keywordCoverage/tailorResume/formatTailorReport) + `skills/customizer/` +
`test/tailor.test.js`.

## Verify (2026-09-05) — verdict pass-with-notes
Report: `vault/Reports/2026-09-05-resume-customizer-verify.md`. **14/14** (7 unit + 7
adversarial). Open DoD gate: validate on a real resume + real JD. Roadmap goal 3 stays
UNTICKED until then.

## Follow-up (2026-09-05, user request): .docx export
Customizer now emits a NEW tailored-resume .docx (--docx): weak bullets get their XYZ rewrite,
header note lists the JD keywords to weave in truthfully. Reuses lib/docx.js. +1 test. PR #3 updated.
