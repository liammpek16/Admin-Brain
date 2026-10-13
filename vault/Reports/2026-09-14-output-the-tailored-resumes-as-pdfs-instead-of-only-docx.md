---
type: report
project: Job Hunt / Recruiter Helper
task: output the tailored resumes as PDFs instead of only .docx
date: '2026-09-14'
cycle: 2026-09-14-output-the-tailored-resumes-as-pdfs-instead-of-only-docx
verdict: pass
---

# Verification report — Job Hunt / Recruiter Helper

**Task:** output the tailored resumes as PDFs instead of only .docx
**Branch:** `auto/output-the-tailored-resumes-as-pdfs-instead-of-only-docx`

## What was tested
- **`npm test` in job-hunt: 60/60** — new `test/pdf.test.js` (valid `%PDF` header, >1KB, `%%EOF`, per-bullet transform applied, nested-dir creation) + an ATX-heading regression in `test/docx.test.js`.
- **All three skills `--pdf`:** reviewer / customizer / ATS each wrote a valid PDF; visually rendered via the Read tool — styled section headings, name with no leading marker, bullets + rewrite scaffolds intact.
- **Parity:** `--pdf` content matches `--docx`; `--docx` still works; passing both writes both files.
- **Real resume:** regenerated improved / Datadog-tailored / ATS-safe as PDFs from the real resume; all valid.

## Findings (weaknesses / what broke)
- **Bug found + fixed in-cycle (the important one):** the shared `parseResume` did not handle markdown **ATX headings** (`#` / `##` / `###`) — the markers leaked verbatim into every rendered resume, **`.docx` included** (both the sample and the real resume use ATX). The first PDF render exposed literal "# Liam Pek" / "## Experience". Fixed at the source (strip the markers, map by level → name/section/subhead) + regression test. This silently improves all prior `.docx` output too.
- **Non-blocking:** a long resume spills a couple of skills bullets onto page 2 (expected for a full page of content); pdfkit uses core Helvetica (no font embedding) — fine for ATS text extraction.

## Improvements
1. Optional single-page compaction (tighter leading) when a resume just overflows one page.
2. A small shared "emit" helper could DRY the `--docx` / `--pdf` wiring across the three skills.

## Verdict
**pass** — `--pdf` delivered on all three skills with `--docx` parity, `--docx` preserved, 60/60 tests, and a genuine latent heading-leak bug fixed along the way. Real-resume PDFs produced and delivered.
