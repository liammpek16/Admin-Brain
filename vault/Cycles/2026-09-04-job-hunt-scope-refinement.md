---
type: cycle
project: Job Hunt / Recruiter Helper
stage: done
status: done
task: scope refinement — pressure-test the whole roadmap (all 7 goals) against the refreshed README
started: '2026-09-04'
readme_source: 'https://github.com/liammpek16/job-hunt'
approved: '2026-09-04'
repo: 'https://github.com/liammpek16/job-hunt'
---

## Task (from SELECT)
Scope refinement across the whole project — not a single build task. Refresh the README to
cover all 7 roadmap goals, then convene the council on the **project scope + build order**
(the analogue of the friendslop "feasibility" cycle). The individual skills stay as their own
later cycles (goal 1, "resume reviewer", already has a refine cycle: `2026-08-07-job-hunt-recruiter-helper.md`).

## Project goal — source: C:/Users/liamm/job-hunt
```
Job Hunt / Recruiter Helper — a personal agent that runs the job search end to end:
1. Resume review vs the Google XYZ rubric (approve → apply).
2. Job search — ≥100 roles for a title/location/salary from LinkedIn/Indeed.
3. Resume tailoring to a specific JD (XYZ).
4. ATS scan — flag auto-rejection risks.
5. Pipeline test on a real resume.
6. Dashboard — jobs applied / interviews completed.
7. Get first interview (the real-world outcome).

Conventions: XYZ bullet = "Accomplished [X], as measured by [Y], by doing [Z]" with a
quantified [Y]; start on Markdown/plain-text resumes (defer PDF/DOCX); human gates on resume
edits and job selection. Known risks: job-board anti-bot/ToS limits (the ≥100-roles goal), and
over-editing without a real resume + approval gates.
(Full text in the repo README.)
```

## Council refinement
_5-persona council: gaps between the roadmap (7 goals) and the real goal — landing a first
interview — and the right build order._

- **🔴 Contrarian:** The roadmap is ordered by *building convenience*, not by *what actually
  gets an interview*. Goals 1–4 are all resume machinery; but a polished resume that never
  reaches a hiring pipeline lands zero interviews. The real bottleneck to goal 7 is **goal 2
  (job search / applying at volume)**, which is also the **riskiest and least controllable**
  (anti-bot/ToS). Building four resume skills before proving you can even source and apply to
  roles is polishing the ammunition before checking the gun fires. At minimum, de-risk goal 2
  early (spike it) rather than leaving it mid-roadmap.
- **🔵 First-Principles:** What produces an interview reduces to: (a) a resume that passes ATS
  + a human skim, and (b) enough *targeted* applications submitted. The XYZ rubric (goal 1) is
  the atomic shared primitive — goals 3 (tailor) and 4 (ATS) are the same "score a bullet /
  resume against a rubric" operation with different inputs. So the *engineering* core is one
  reusable scorer, not four skills. The *outcome* core is application throughput. Separate the
  two: build the scorer once; treat search/apply as a distinct, higher-risk track.
- **🟢 Expansionist:** Make goal 1's output the **shared contract** for the whole project:
  a structured per-bullet XYZ analysis (hasX / hasY / hasZ + rewrite). Then the customizer
  (3) and ATS scanner (4) *inherit* it instead of re-implementing critique, and the dashboard
  (6) can aggregate the same structured records (bullets fixed, resumes tailored, apps sent,
  interviews). One data shape threads goals 1→3→4→6. Design that shape now, in the reviewer.
- **⚪ Outsider:** As the user I don't want "four skills"; I want: *is my resume good, find me
  jobs, tailor + check each one, and tell me it's working.* The thing I can feel immediately is
  goal 1 on **my actual resume** — so the very first deliverable should run against a real
  resume, not a synthetic one. And goal 7 ("get first interview") isn't a build task at all —
  it's the **success metric**; keep it on the roadmap as the outcome, but don't let the loop
  treat it like a codeable step.
- **🟡 Executor:** Concretely, the build order that respects the above: **(1) resume reviewer**
  (XYZ scorer w/ structured output, on a real Markdown resume) → **(2-spike) job-search
  feasibility spike** (can we legally/reliably source ≥100 roles? pick the data source before
  committing) → **(3) customizer** + **(4) ATS**, both reusing the scorer → **(5) end-to-end
  pipeline test** → **(6) dashboard** over the structured records. Goal 7 stays as the tracked
  outcome. Each of (1)–(6) is its own refine→implement cycle; goal 1's cycle already exists.

**Gap vs the goal:** the roadmap front-loads four resume skills before de-risking the one goal
(search/apply) that actually gates interviews, and it lists a real-world *outcome* (goal 7) as
if it were a build step. The reusable XYZ scorer (goal 1) is the correct first build and the
shared contract; job search deserves an early feasibility spike, not a mid-roadmap slot.

## Refined task spec
_A sharpened, branch-sized scope decision (this cycle produces the refined scope + build order;
each skill is its own later cycle)._

1. **README refreshed** to cover all 7 goals, the XYZ rubric as the shared contract, and the two
   known risks. ✅ done this cycle (commit on `main`).
2. **Adopt the council's build order** and record it in the roadmap:
   - Goal 1 (resume reviewer) first — build it as a **reusable structured XYZ scorer**
     (per-bullet hasX/hasY/hasZ + rewrite) so goals 3, 4, 6 inherit the same data shape.
   - Insert an early, small **job-search feasibility spike** before committing to goal 2:
     decide the legal/reliable data source for ≥100 roles (official API vs. alternative) — this
     is the project's biggest risk and gates the actual outcome.
   - Goals 3 (customizer) and 4 (ATS) explicitly reuse the goal-1 scorer.
   - Goal 7 ("get first interview") is reframed as the **tracked success metric**, not a build
     step the loop should SELECT.
3. **No product code in this cycle.** Each skill remains its own refine→implement cycle; goal
   1's refine cycle already exists (`2026-08-07-job-hunt-recruiter-helper.md`, awaiting
   approval — the natural next build).

## Definition of done
_Clear, testable completion criteria._

- README covers **all 7 goals** + the XYZ shared-contract framing + the two risks. ✅
- The **build order + job-search spike** recommendation is written into the roadmap (or the
  roadmap notes point at this cycle's ordering).
- Goal 1 is stated as a **reusable structured scorer** that goals 3/4/6 inherit (the shared
  data shape is named).
- Goal 7 is **reframed as an outcome metric**, not a SELECT-able build task.
- The project repo is **pushed to GitHub** and the project note `repo` points at the GitHub URL
  (so future `refine` cycles fetch the README via `gh`), matching the friendslop end state.

**Out of scope (later cycles):** building any of the skills (goals 1–4), the dashboard (6), the
job-search spike itself, and connecting to any job board. This cycle only sharpens scope + order.

> **Human approval gate:** approve this refined scope before it moves to IMPLEMENT (which here =
> committing the README + roadmap ordering + pushing to GitHub, not skill code).
> — **Approved 2026-09-04** (user chose "Scope + council + push").

## Implementation
- **Approved** 2026-09-04. IMPLEMENT here = docs + repo wiring (no skill code).
- README refreshed to cover all 7 goals → committed `c4374cd` on `main` in `C:/Users/liamm/job-hunt`.
- Roadmap updated with the council's **build order + job-search feasibility spike** and goal-7
  reframed as a metric (`vault/Plans/job-hunt-recruiter-helper-roadmap.md`).
- Repo **pushed to GitHub (private):** https://github.com/liammpek16/job-hunt.
- Project note `repo` set to the GitHub URL so future `refine` cycles fetch the README via `gh`.

### Checkpoint log
- 2026-09-04 — README refreshed + committed, roadmap build-order recorded, repo pushed to
  GitHub, project note repo wired to the URL. Definition of done met.

### Definition of done — status
- [x] README covers all 7 goals + XYZ shared-contract + risks
- [x] Build order + job-search spike written into the roadmap
- [x] Goal 1 stated as a reusable structured scorer (goals 3/4/6 inherit the data shape)
- [x] Goal 7 reframed as an outcome metric, not a SELECT-able build task
- [x] Repo pushed to GitHub + project note `repo` = GitHub URL (matches friendslop end state)
