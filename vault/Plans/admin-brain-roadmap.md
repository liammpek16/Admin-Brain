---
type: plan
kind: roadmap
created: 2026-08-07
project: "Admin Brain"
horizon: quarter
status: active
---

## Goal
Make Admin Brain a self-hosting command center: run its own feature loop, reach every
project from one place, capture notes without leaving it, and eventually drive it by voice.

## Steps
- [ ] Run the feature loop from inside the Admin Brain (HUD-triggered SELECT→VERIFY cycles) — near · high
- [ ] Add the ability to navigate to each project's webapp when applicable (e.g. the Dota coaching webapp) — near · high
- [ ] Add the ability to capture notes into the vault from within the Admin Brain (quick-note in the HUD) — near · high
- [ ] Improve the HUD for aesthetic reasons — mid · low (longer-term)
- [ ] Voice-activation module for the Admin Brain and all commands — long · low (stretch goal)

## Risks
- Running the full loop from the HUD means long-running, token-spending stages behind a web
  button — needs the human approval gates (SELECT approval, PR review) to stay in front, not
  be clicked away by accident.
- Per-project webapp launch depends on each project declaring a runnable entry point/URL;
  projects without a webapp should degrade gracefully (no dead button).
- Voice activation is heavy and low-priority — keep it a stretch goal, never a blocker.

> Tick a box in Obsidian to mark a goal done — Admin Brain's progress % updates automatically
> across the brief, HUD, and metrics. Order here is a suggestion; reorder freely.
