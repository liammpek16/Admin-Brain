---
type: report
project: Job Hunt / Recruiter Helper
task: >-
  Test the full pipeline on my current resume (goal 5) — now searchable keyless
  via the Claude source
date: '2026-09-14'
cycle: 2026-09-14-test-the-full-pipeline-on-my-current-resume-goal-5-now-searc
---

# Verification report — Job Hunt / Recruiter Helper

**Task:** Test the full pipeline on my current resume (goal 5) — now searchable keyless via the Claude source
**Branch:** ``

## What was tested
Full pipeline run on the **real resume** (`Downloads/Pek_Liam_Resume_32726.pdf`, extracted to Markdown; kept private/uncommitted), target JD = a real saved NYC role (`Datadog — Mid-Market Sales Engineer (NYC)`) pulled from the searcher store via `--role`.

- **Reviewer** → exit 0. **1/17 bullets full XYZ (6%), avg 1.06/3, 12 weak.** Only bullet 2 ("Completed 5 proof of concepts per month…") scores 3/3. Actionable per-bullet rewrites emitted.
- **Customizer** (`--role`) → exit 0. **Keyword coverage 27% (4/15)** vs the Datadog JD; missing keywords listed (mid-market, accounts, demonstrations, evaluations, POCs, presentations…); truthful weave-in suggestions.
- **ATS scanner** (`--role`) → exit 0. **ATS risk 70/100 (moderate).** HIGH: low keyword match (27%); MED: only 18% of bullets quantified.
- **`.docx` outputs** → all 3 generated (improved / Datadog-tailored / ATS-safe), ~10 KB each.
- **Store sharing:** search → customizer/ATS all read the one `data/jobs.json` (JD came from a claude-sourced role) — end-to-end contract holds.

## Findings (weaknesses / what broke)
- **Nothing broke** — all four skills ran clean on real (messier) input; no code change needed.
- **JD quality caps tailoring accuracy (data, not code):** the claude-sourced roles store only a short snippet as `description`, so the customizer/ATS keyword universe is tiny (15 keywords) and coverage/risk numbers are pessimistic. Full-JD text would sharpen goals 3–4. → ties to the searcher's logged "per-posting enrichment" follow-up.
- **Real signal on the resume itself (the point of the test):** the resume is quantification-light — 12/17 bullets miss a measured [Y] and most miss a lead action verb [X]. The tools correctly flagged this; the fix is Liam filling the `[bracketed]` placeholders in the improved `.docx` with real numbers.

## Improvements
1. Enrich stored roles with full JD text (fetch the posting URL) — biggest lever for customizer/ATS accuracy.
2. Optional: reviewer could suggest concrete numbers by inferring from context (currently leaves `[brackets]`), but that risks fabrication — keep human-filled.
3. PDF/DOCX resume ingestion (currently Markdown/text only) so the user needn't pre-convert — deferred per README.

## Verdict
**pass** — DoD fully met: all four skills ran end-to-end on the real resume without error, the JD flowed from the shared store via `--role`, three `.docx` deliverables were produced, and the run surfaced honest, actionable signal. The pipeline is proven on real input; remaining quality gains are the logged JD-enrichment follow-up, not defects.
