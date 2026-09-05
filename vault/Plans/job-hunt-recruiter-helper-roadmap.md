---
type: plan
kind: roadmap
created: 2026-08-07T00:00:00.000Z
project: Job Hunt / Recruiter Helper
horizon: quarter
status: active
---

## Goal
Build the Job Hunt / Recruiter Helper agent (see the project's repo README): resume review
vs Google XYZ, job search, resume tailoring, and an ATS pre-screen.

## Steps
- [x] Build the resume reviewer skill (Google XYZ critique + rewrites) — near · high #improvement _Delivered: PR #1 merged; validated on the real resume; + .docx export._
- [x] Build the job searcher skill (≥100 roles for title/location/salary) — mid · high #improvement _Delivered: PR #2 merged; Adzuna + LinkedIn auto-detect. Live run needs an API key._
- [x] Build the resume customizer skill (tailor to a job description, XYZ) — mid · med #improvement _Delivered: PR #3 merged; + .docx export. Needs a real JD to validate._
- [x] Build the ATS scanner skill (flag rejection risks) — mid · med #improvement _Delivered: PR #4 merged; + ATS-safe .docx export._
- [ ] Test the full pipeline on my current resume — mid · high #improvement
- [x] build a dashboard for jobs applied to/interviews completed #improvement _Delivered: PR #5 merged; fills as you apply to roles._
- [ ] get first interview
- [ ] link dashboard to admin brain panel #improvement

## Build order (from the 2026-09-04 scope-refinement council)
See `Cycles/2026-09-04-job-hunt-scope-refinement.md`. The steps above are listed by feature;
the recommended *build* order is:
1. **Resume reviewer** (goal 1) — build as a reusable **structured XYZ scorer** (per-bullet
   hasX/hasY/hasZ + rewrite); goals 3, 4, 6 inherit this data shape.
2. **Job-search feasibility spike** — *insert before committing to goal 2.* Decide the
   legal/reliable data source for ≥100 roles (official API vs. alternative). This is the
   biggest risk and gates the actual outcome (an interview).
3. **Resume customizer** (goal 3) + **ATS scanner** (goal 4) — both reuse the goal-1 scorer.
4. **Pipeline test** (goal 5) → **Dashboard** (goal 6) over the structured records.
- **Goal 7 ("get first interview") is the success *metric*, not a build step** — track it; the
  loop should not SELECT it as a codeable task.

## Risks
- Job-board access (LinkedIn/Indeed) may hit anti-bot / ToS limits — reliably surfacing
  ≥100 roles is the hard part and may need an official API or a data source. → de-risk with the
  early feasibility spike above, not a mid-roadmap slot.
- "Improvements" and "tailoring" need a real resume + approval gates to avoid over-editing.

> Tick a box in Obsidian to mark a skill done — progress updates across brief/HUD/metrics.
