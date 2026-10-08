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
- [x] Test the full pipeline on my current resume — mid · high #improvement _Delivered: ran reviewer→search store→customizer→ATS on the real resume (Sales Engineer); all clean; improved/tailored/ATS-safe .docx produced. Finding: resume is quantification-light (1/17 full XYZ); JD enrichment would sharpen tailoring._
- [x] build a dashboard for jobs applied to/interviews completed #improvement _Delivered: PR #5 merged; fills as you apply to roles._
- [x] output the tailored resumes as PDFs instead of only .docx #improvement _Delivered: PR #8 merged; `--pdf` on reviewer/customizer/ATS (pdfkit, docx kept). Also fixed a latent markdown-heading leak in all rendered resumes. 60/60 tests._
- [ ] get first interview
- [x] link dashboard to admin brain panel #improvement _Delivered: PR #6 merged; HUD webapp button launches the live dashboard (port 4188)._
- [x] make the searcher skill runnable using my claude code subscription rather than api credits. #improvement _Delivered: PR #7 merged; `claude` source (no API key, subscription handoff), auto-selected when no key; 56/56 tests._
- [x] run the first search for jobs in New York City with a title of sales engineer. _Delivered: 22 real NYC "Sales Engineer" roles surfaced on the subscription, saved to the store._
- [x] add a button to the webapp to run the search skill using my claude code subscription #improvement _Delivered: PR #9 merged; webapp Run-search button → Claude Code subscription file handoff (no API key)._
- [x] add a display for all of the surfaced jobs from the search sorted by relevance. Make sure that all of these jobs are sortable by relevance for me as well. #improvement _Delivered: PR #9 merged; relevance-ranked list (lib/relevance.js) + click-any-column sort._
- [x] add a button to run the resume refine skills on each job listing surfaced by the search skill #improvement _Delivered: PR #9 merged; per-row "Refine résumé" tailors the resume to that role's JD in-process._
- [x] add a link to each surfaced job from the search to the actual web link for the job posting. #improvement _Delivered: PR #9 merged; "View posting ↗" + linked title on every row._
- [x] add a preview menu for the improved resumes for each job listing that has been run. #improvement _Delivered: PR #9 merged; inline expandable tailoring-report preview per refined role._
- [x] remove accents on resume #improvement _Delivered: PR #10 merged; lib/text.js folds diacritics + smart punctuation to ASCII in every generated .docx/.pdf (ATS-safe); original resume untouched._
- [x] fix bug where it is surfacing non existent jobs #improvement _Delivered: PR #10 merged; claude source now drops roles with no valid http(s) posting URL on ingest._
- [x] add new button to preview .pdf files for the newly generated resumes #improvement _Delivered: PR #10 merged; refine generates a tailored-resume PDF + per-row "Preview PDF ↗" button (GET /api/tailored/pdf)._
- [x] new searches do not surface any new jobs. This should be adjusted to either find new job postings within the last week, or provide an error saying that there have been no new job postings within the last week and the search criteria should be expanded. #improvement _Delivered: PR #11 merged; 7-day recency window + results file consumed after ingest (fresh re-runs) + `no_new` "expand your criteria" message when nothing new comes back._
- [x] improve the scraper function. When implementing this feature, please describe what posting sites are currently being scraped, and do research on what other platforms can be scraped for more job postings. Please implement a new scraper with improved job hunting features, and if browser integration is needed for further searching, please let me know. #improvement _Delivered: PR #12 merged; new key-less/browser-free `greenhouse` board source (official API, `--source greenhouse`, 48 live SE roles verified). Research report in vault; browser NOT needed — Lever/Ashby next (no browser). See Reports/2026-09-15-job-hunt-scraper-research-and-greenhouse-source.md._
- [x] add Lever + Ashby board sources (more key-less/browser-free scraping coverage) #improvement _Delivered: PR #13 merged; `lever` + `ashby` sources on a shared board-common module (Greenhouse refactored onto it); 124 tests; live-verified real SE roles, no key/browser._
- [x] wire the board sources into the webapp search panel (source dropdown + recency window) #improvement _Delivered: PR #14 merged; Source dropdown (Claude/Greenhouse/Lever/Ashby) + "Posted within" window; live board fetch + ingest; 132 tests, 48 live roles E2E._
- [x] tighten remote-location matching so foreign-remote roles don't match a US search #improvement _Delivered: PR #15 merged; country-aware locationMatches drops clearly-foreign remote roles (UK/India/EMEA…) while keeping US/US-remote/agnostic; 139 tests; live Datadog NY 20→17, 0 foreign._

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
