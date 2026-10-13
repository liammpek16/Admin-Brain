---
type: cycle
project: Job Hunt / Recruiter Helper
stage: done
status: done
verdict: pass
task: >-
  Test the full pipeline on my current resume (goal 5) — now searchable keyless
  via the Claude source
started: '2026-09-14'
readme_source: 'https://github.com/liammpek16/job-hunt'
report: 2026-09-14-test-the-full-pipeline-on-my-current-resume-goal-5-now-searc
---

## Task (from SELECT)
Test the full pipeline on my current resume (goal 5) — now searchable keyless via the Claude source

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

- **Pragmatist.** This is a **validation/run cycle**, not a build — like the phone-feasibility cycle
  (SELECT→REFINE→run→VERIFY→done, no PR unless a bug forces a code change). Deliverable = the
  pipeline run on the REAL resume + a report + tangible outputs.
- **Grounding.** Real resume located at `Downloads/Pek_Liam_Resume_32726.pdf` (PDF → extracted to
  Markdown in scratchpad; NOT committed — private). Liam is a **Sales Engineer**, matching last
  cycle's NYC "Sales Engineer" store, so the customizer/ATS use a real saved role as the JD.
- **Skeptic.** Watch for: skills erroring on real (messier) input vs the sample; the `--role` JD
  path (customizer/ATS reading the JD from the store) working on a claude-sourced role.
- **User-advocate.** Produce the actual `.docx` outputs (improved / tailored / ATS-safe) so the
  test yields something usable, not just a green check.

## Refined task spec
_A sharpened, branch-sized task._

Run all four skills end-to-end on the real resume and report: **reviewer** (XYZ scorecard) →
**searcher store** (JD source) → **customizer** (`--role`, tailor to a saved NYC SE role) →
**ATS scanner** (`--role`). Generate the `.docx` deliverables. Capture any breakage or quality
gap as findings. No code change unless a skill actually breaks.

## Definition of done
_Clear, testable completion criteria._

- All four skills run on the real resume without error (exit 0 where expected).
- The customizer + ATS pull the JD from a real saved role via `--role` (search→tailor store shared).
- Improved / tailored / ATS-safe `.docx` files are produced and handed to the user.
- A verify report records the scores, coverage, and any findings/limitations.
