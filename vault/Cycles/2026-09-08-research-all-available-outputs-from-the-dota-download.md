---
type: cycle
project: Dota Coach
stage: done
status: done
task: Research all available outputs from the dota download
started: '2026-09-08'
readme_source: "https://github.com/liammpek16/dota-projects"
report: 2026-09-08-research-all-available-outputs-from-the-dota-download
kind: research
---

## Task (from SELECT)
Research all available outputs from the dota download

## Council refinement
5-persona read: the literal task is an audit, not a build. **First-Principles** — "the
download" is really four upstream fetches (OpenDota API, Valve replay, manta parse,
constants/CDN); catalogue by provenance, not just by file. **Contrarian** — don't just
list files; call out what's *under-used* so it feeds the next tasks. **Executor** — this
is research-only: SELECT → REFINE → inventory report, no PR. **Expansionist** — note the
missing elevation (Z) channel because the very next task (LOS fight vision) depends on it.
**Outsider** — a newcomer needs the schema of each output, not the code.

## Refined task spec
Produce a complete inventory of every artifact the download pipeline writes under
`dota_coach/data/` — for each: what writes it, whether downloaded or derived, and its
schema — plus the upstream sources. Explicitly surface the fight/vision data and flag gaps
that block the roadmap's next steps.

## Definition of done
- Every output file type catalogued with provenance + schema. ✓
- Upstream sources enumerated. ✓
- Fight/vision structures detailed (ward x,y, key_fights, fights_vision, warding). ✓
- Gaps flagged for downstream tasks (no Z/elevation; flat-radius local vision; no terrain
  asset). ✓

## Result
See report → [[2026-09-08-research-all-available-outputs-from-the-dota-download]].
Verdict **complete**. Directly enables the fight-vision LOS task (next).
