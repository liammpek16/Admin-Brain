---
type: plan
kind: roadmap
created: 2026-08-07T00:00:00.000Z
project: Dota Coach
horizon: quarter
status: active
---

## Goal
Grow Dota Coach into a reliable, trustworthy, revenue-generating coaching platform.

## Steps
- [x] Reduce error in the information shared in the coaching interface — near · high
- [x] Real-time per-fight coaching feedback: target prioritization, missed spells, positioning — mid · high
  - _Delivered (PR #4): deterministic "Coaching read" per fight in the webapp (target priority / missed spells / positioning), no LLM. Live in-game version remains a separate future goal._
- [ ] Clean up the interface — mid · med
- [ ] Determine feasibility of moving API calls to a known script — mid · med
- [ ] Land the first paying subscription (first revenue) — mid · high
- [ ] Per-fight video playback — long · low (stretch goal)
- [ ] Add security to the webapp before launching live
- [x] Harden heroes.json hand-corrections so a constants refresh can't silently revert them — near · high
  - _Delivered (PR #5): id-keyed canonical overlay re-applied on every hero-constants refresh (fetch + offline-fallback); a stale upstream can no longer revert Outworld Destroyer / Ringmaster. Validator stays the net._
- [ ] create a new button for the parser to occur before the coaching analysis

## Risks
- Real-time accuracy is hard, and errors erode coaching trust — milestone 1 de-risks everything after it.
- Video playback is technically heavy; keep it a long-term stretch, not a blocker.
- Revenue depends on the product feeling reliable first — milestones 1–2 gate the subscription milestone.

> Tick a box in Obsidian to mark a milestone done — the project's progress % updates
> automatically across the brief, HUD, and metrics. Reorder freely; order here is a suggestion.
