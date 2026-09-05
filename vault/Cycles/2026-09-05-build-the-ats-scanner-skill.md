---
type: cycle
project: Job Hunt / Recruiter Helper
stage: done
status: done
task: Build the ATS scanner skill (flag rejection risks)
started: '2026-09-05'
approved: '2026-09-05'
repo: 'https://github.com/liammpek16/job-hunt'
local_path: 'C:/Users/liamm/job-hunt'
pr: 'https://github.com/liammpek16/job-hunt/pull/4'
---

## Task (from SELECT)
Build the ATS scanner skill — flag ATS-rejection risks in a (tailored) resume.

## Council refinement
- **🟢 Expansionist:** the ATS view is the third consumer of the shared contract — reuse the
  goal-1 scorer (quantification) and goal-3 keyword coverage; don't re-implement.
- **🔵 First-Principles:** ATS auto-reject reduces to (a) can the parser read it, and (b) does
  it keyword-match the JD. Everything else is secondary.
- **🟡 Executor:** deterministic checks: keyword match vs JD, parseability (tables/images/
  HTML/glyphs/smart-punct), contact info, standard sections, quantification, length → severity
  + a 0-100 risk score; exit 1 on high risk to gate a pipeline. Risks only, never edits.
- **⚪ Outsider caveat:** input is Markdown/text, so it can't see PDF/DOCX *layout* — the
  parseability checks target text-level issues (honest limit, documented in SKILL.md).

## Definition of done
- [x] Flags rejection risks (keywords, formatting, parseability) with severity + score
- [x] Reuses the goal-1 scorer + goal-3 coverage (shared contract)
- [x] JD optional (file or saved role); exit 1 on high risk
- [ ] **Validated on a real tailored resume** — pending the user's resume

## Implementation
Branch `auto/ats-scanner` (stacked on goal 3); draft PR #4. `lib/ats.js` (scanResume/formatScan)
+ `skills/ats/` + `test/ats.test.js`.

## Verify (2026-09-05) — verdict pass-with-notes
Report: `vault/Reports/2026-09-05-ats-scanner-verify.md`. **14/14** (8 unit + 6 adversarial).
Open DoD gate: validate on a real tailored resume. Roadmap goal 4 stays UNTICKED until then.

## Follow-up (2026-09-05, user request): .docx export
ATS scanner now emits a NEW ATS-safe .docx (--docx): the rebuild removes structural risks
(no pipe-tables/images/HTML), bullets ASCII-normalized (atsCleanBullet), header note lists
remaining risks. Reuses lib/docx.js. +2 tests. PR #4 updated.
