---
type: cycle
project: Job Hunt / Recruiter Helper
stage: refine
status: awaiting-approval
task: Build the resume reviewer skill
started: '2026-08-07'
readme_source: 'C:/Users/liamm/job-hunt'
---

## Task (from SELECT)
Build the resume reviewer skill

## Project goal — source: C:/Users/liamm/job-hunt
```
# Job Hunt / Recruiter Helper

A personal agent that runs my job search end to end — from sharpening my resume to
finding roles, tailoring applications, and pre-screening them the way a recruiter's ATS
would.

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

## Initial scope (v1)

The first build targets — each a discrete skill:

1. **Resume reviewer skill** — score/critique a resume against Google XYZ; propose rewrites.
2. **Job searcher skill** — surface ≥100 roles for a given title/location/salary.
3. **Resume customizer skill** — tailor the resume to a specific job description (XYZ).
4. **ATS scanner skill** — flag ATS-rejection risks in a tailored resume.
5. **Test on my current resume** — run the pipeline end to end on a real resume.

## Conventions / definitions

- **Google XYZ bullet:** "Accomplished [X], as measured by [Y], by doing [Z]." Every resume
  bullet should be expressible in this shape, with a quantified [Y].
- **Inputs:** my resume (source format TBD — e.g. Markdown/DOCX/plain text), and a target
  profile (title, location, salary) and/or a specific job description.
- **Human gates:** resume edits (goal 1) and job selection (goal 2) require my approval.

## Status

Just scoped. No code yet — the reviewer skill is first.
```

## Council refinement
**🔴 Contrarian** — "Build the resume reviewer skill" is a whole feature, not a branch-sized
task. It silently bundles four things: ingest a resume (which format? PDF/DOCX/MD are each a
different parsing problem), critique bullets vs XYZ, propose rewrites, and *implement edits
after approval*. And there's no test input — the README says the resume format is "TBD," so
the skill would be built against an imagined resume and break on the real one.

**🔵 First-Principles** — The atomic, verifiable core is: given resume *text*, judge each
bullet against the XYZ rubric and say what's missing. The rubric is the crux — action verb
(X), a **quantified** result (Y), a method (Z). File parsing and auto-editing are separate
concerns that can be deferred/stubbed.

**🟢 Expansionist** — The reviewer's rubric is the shared contract for the whole project: the
customizer (goal 3) and the ATS scanner (goal 4) both reuse "is this a strong XYZ bullet?"
Build it as a reusable scorer with **structured output** (per-bullet hasX/hasY/hasZ +
suggestion), and goals 3–4 inherit it.

**⚪ Outsider** — I just want it to read my resume and tell me which bullets are weak and how
to fix them — which means it needs my *actual* resume. If that's a PDF/DOCX, reading it is the
hard part. Start with the simplest input (paste text / a Markdown file) so we see it work.

**🟡 Executor** — v1 = take a Markdown/plain-text resume, split into bullets, score each
against XYZ, output a per-bullet report + a concrete rewrite. Defer file-format parsing and
defer auto-applying edits (suggestions only). Test on a real sample resume.

**Gap vs the goal:** the task bundles 4 sub-features and defines no resume input/format. The
README's own rubric (quantified XYZ) is the verifiable core — build that; defer the rest.

## Refined task spec
**Build a v1 resume reviewer that scores a Markdown/plain-text resume against the Google XYZ
rubric and suggests rewrites.**
- **Input:** a resume as Markdown / plain text (defer PDF/DOCX parsing to a later task).
- Split into bullets; for each, detect action verb (**X**), a **quantified** metric (**Y**),
  and a method (**Z**).
- **Output structured** per-bullet analysis (hasX/hasY/hasZ + one-line rewrite) plus a summary
  (e.g. "6/14 bullets fully XYZ"), so the customizer and ATS scanner can reuse it.
- **Do not auto-edit** the resume yet — suggestions only (approval + apply is a later task).

## Definition of done
- A runnable reviewer that takes a Markdown/text resume and prints a per-bullet XYZ scorecard
  + rewrite suggestions.
- On a **real sample resume**, weak bullets (missing a quantified Y, or no method) are
  correctly flagged and strong ones pass.
- Output is structured (JSON/Markdown) for downstream reuse.
- **Requires a real resume to validate** — sample needed (ties to initial goal 5).
