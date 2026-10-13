---
type: cycle
project: Job Hunt / Recruiter Helper
stage: done
status: done
verdict: pass
pr: 'https://github.com/liammpek16/job-hunt/pull/8'
task: output the tailored resumes as PDFs instead of only .docx
started: '2026-09-14'
readme_source: 'https://github.com/liammpek16/job-hunt'
branch: auto/output-the-tailored-resumes-as-pdfs-instead-of-only-docx
target_path: 'C:/Users/liamm/job-hunt'
report: 2026-09-14-output-the-tailored-resumes-as-pdfs-instead-of-only-docx
---

## Task (from SELECT)
output the tailored resumes as PDFs instead of only .docx

## Project goal — source: https://github.com/liammpek16/job-hunt
```
# Job Hunt / Recruiter Helper

A personal agent that runs my job search end to end — from sharpening my resume to finding
roles, tailoring applications, pre-screening them the way a recruiter's ATS would, and tracking
the pipeline through to a first interview.

## Ultimate goal

The full workflow the agent should support:

1. **Resume review.** Take in my resume and review it against the **Google XYZ format**
   ("Accomplished **X** as measured by **Y** by doing **Z**"). Suggest improvements and,
   **after my approval**, implement them.
2. **Job search.** Given my desired **job title, location, and salary range**, search
   LinkedIn and/or Indeed for roles matching that profile. Surface **at least 100 jobs**.
   Show me the list; I pick the ones I want to apply to.
3. **Resume tailoring.** For each job I select, tailor my resume to that job description —
   again following the Google XYZ format.
4. **ATS check.** Act as an **ATS scanner** and check every tailored resume for weaknesses
   that would get it auto-rejected (keywords, formatting, parseability), and report them.
5. **Track & land.** Track jobs applied to and interviews completed on a dashboard, and drive
   the whole thing toward the real outcome: **a first interview**.

## Scope / roadmap

Each build target is a discrete skill (or, for the last two, a tracked outcome). Ordered as in
`Admin-Brain/vault/Plans/job-hunt-recruiter-helper-roadmap.md`:

| # | Target | Priority | Notes |
|---|--------|----------|-------|
| 1 | **Resume reviewer skill** — score/critique a resume against Google XYZ; propose rewrites | high | The shared XYZ rubric other skills reuse. Build first. |
| 2 | **Job searcher skill** — surface ≥100 roles for a given title/location/salary | high | The hard one — see Risks (anti-bot / ToS / data source). |
| 3 | **Resume customizer skill** — tailor the resume to a specific job description (XYZ) | med | Reuses the reviewer's rubric. |
| 4 | **ATS scanner skill** — flag ATS-rejection risks in a tailored resume | med | Reuses the reviewer's rubric. |
| 5 | **Pipeline test** — run the full pipeline end to end on my real resume | high | Needs a real resume as input. |
| 6 | **Dashboard** — track jobs applied to / interviews completed | — | Reporting layer over the pipeline. |
| 7 | **Get first interview** — the real-world outcome the whole project is for | — | The success metric, not a code task. |

## Conventions / definitions

- **Google XYZ bullet:** "Accomplished [X], as measured by [Y], by doing [Z]." Every resume
  bullet should be expressible in this shape, with a **quantified [Y]**. This rubric is the
  shared contract across skills 1, 3, and 4.
- **Inputs:** my resume (start with Markdown / plain text; PDF/DOCX parsing deferred), and a
  target profile (title, location, salary) and/or a specific job description.
- **Human gates:** resume edits (goal 1) and job selection (goal 2) require my approval — the
  agent proposes, I approve before anything is applied.

## Risks

- **Job-board access** (LinkedIn/Indeed) may hit anti-bot / ToS limits — reliably surfacing
  ≥100 roles is the hardest part and may need an official API or an alternate data source.
- **Over-editing** — "improvements" and "tailoring" need a real resume + approval gates so the
  agent proposes rather than silently rewrites.

## Status

Scoped; build not yet started. The **resume reviewer skill (goal 1)** is first, and its XYZ
scorer is the reusable core that goals 3–4 inherit.
```

## Council refinement
_5-persona council: gaps between the task and the project goal._

- **Architect.** `lib/docx.js` already parses the resume into typed lines (`parseResume`) + a
  per-bullet transform. Add a sibling `lib/pdf.js` that REUSES `parseResume` and renders the same
  structure to PDF via **pdfkit** (pure-JS, no system/browser dependency, matches the $0/local ethos).
- **Pragmatist.** Add a `--pdf <out>` flag to all three skills (reviewer/customizer/ATS) mirroring
  the existing `--docx`. **Keep `--docx`** — don't delete a tested feature; "instead of" = give the
  user PDFs, not remove Word. Same `improveBullet`/`note` inputs → identical content, different format.
- **Skeptic.** Ensure the PDF actually renders (valid `%PDF` header, non-trivial size) and the
  bracketed rewrite scaffolds survive. Async write like docx.
- **User-advocate.** Regenerate the three real-resume outputs as PDFs and hand them over.

## Refined task spec
_A sharpened, branch-sized task._

1. `lib/pdf.js`: `writeResumePdf(markdown, improveBullet, outPath, note)` reusing `docx.parseResume`;
   render name (title), sections (headings), subheads (bold), bullets, text via pdfkit; always a NEW file.
2. Wire `--pdf <out>` into `skills/reviewer`, `skills/customizer`, `skills/ats` alongside `--docx`.
3. Tests in `test/pdf.test.js` (valid PDF bytes, bullet transform applied). Update the three SKILL.md docs.
4. Regenerate Liam's improved / tailored / ATS-safe resumes as `.pdf`.

## Definition of done
_Clear, testable completion criteria._

- Each skill accepts `--pdf <out>` and writes a valid PDF (starts with `%PDF`, >1KB) with the same
  content as its `--docx`; `--docx` still works.
- `npm test` passes including new PDF tests.
- Three real-resume PDFs produced and delivered.

## Implementation
- branch: `auto/output-the-tailored-resumes-as-pdfs-instead-of-only-docx` in `C:/Users/liamm/job-hunt` (off `main`) — never touches main
- started: 2026-09-14T23:26

### Checkpoint log
- 2026-09-14T23:26 — branch created; supervised implementation started.
