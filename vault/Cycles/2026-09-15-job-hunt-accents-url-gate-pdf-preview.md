---
type: cycle
project: Job Hunt / Recruiter Helper
stage: verify
status: done
created: 2026-09-15T00:00:00.000Z
task: "Batch: remove accents on resume + fix non-existent jobs bug + PDF preview button"
branch: auto/resume-accents-job-url-gate-pdf-preview
pr: https://github.com/liammpek16/job-hunt/pull/10
repo: C:/Users/liamm/job-hunt
---

## Task
Three Job Hunt roadmap `#improvement` goals, run as ONE batched cycle (all touch the
résumé/webapp pipeline — same rationale as PR #9/#14/#22):
1. remove accents on resume
2. fix bug where it is surfacing non existent jobs
3. add new button to preview .pdf files for the newly generated resumes

## SELECT / REFINE
- **Goal 1** — interpreted as ATS-safety: fold diacritics + smart punctuation to ASCII in
  every *generated resume document*, extending the existing `lib/ats.atsCleanBullet`
  philosophy. New shared `lib/text.js` (`deaccent` / `asciiResumeText`) applied at the
  text-emission points of both writers (`lib/docx.js`, `lib/pdf.js`) so all outputs
  (reviewer/customizer/ATS CLIs + webapp) benefit. Original resume never modified.
- **Goal 2** — root cause: `lib/sources/claude.normalize` accepted a role with no posting
  URL (id fell back to `title@company`), so unlinkable / hallucinated ("non-existent")
  jobs got ingested. Fix: require a syntactically valid absolute http(s) URL
  (`validPostingUrl`); drop the rest. $0/no-network — validates URL *shape*, not liveness.
- **Goal 3** — the webapp refine only wrote a Markdown *report* (no actual resume file).
  `refineRole` now also generates a tailored-resume PDF (accent-stripped) via the shared
  `writeResumePdf` + the customizer's `improveBullet`; new `GET /api/tailored/pdf?id=`
  serves it; per-row **Preview PDF** button.

## IMPLEMENT
Branch `auto/resume-accents-job-url-gate-pdf-preview`, commit `58a7d53`. Files: `lib/text.js`
(new), `lib/docx.js`, `lib/pdf.js`, `lib/sources/claude.js`, `lib/tailored.js`
(`pdfPath`/`hasPdf`), `lib/webapp.js`, `skills/dashboard/dashboard.js`, + tests. Front-end +
JSON API only; $0/no-LLM/no-network/no new deps.

## VERIFY — PASS
- `node --test`: **95/95** (+16 new: text folding, URL gate + `fetchRoles` drop, tailored
  PDF path/flag, `renderTo` ASCII proof, PDF endpoint 404).
- Live E2E against the running server: refine a real role → `/api/tailored/pdf` returns a
  valid 2940-byte `%PDF` inline; `?download=1` → attachment; role flips to `pdf:true`.
- Accent-fold in the real PDF pipeline proven via a `renderTo` mock capturing every emitted
  string (all ASCII except the WinAnsi `•` bullet marker).

## Notes / follow-ups
- Goal 2's gate is shape-only (no network liveness check). A future enhancement could
  optionally HEAD-check URLs, but that breaks $0/offline — deferred.
- The bullet glyph `•` in the PDF is left as-is (WinAnsi-encodable, not an accent).

## Draft PR
https://github.com/liammpek16/job-hunt/pull/10 — awaiting user merge, then tick the 3
roadmap goals in `vault/Plans/job-hunt-recruiter-helper-roadmap.md`.
