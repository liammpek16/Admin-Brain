---
type: report
project: Dota Coach
task: >-
  Fight playback fixes: post-death overlays, zoom-scaled hero icons, real
  minimap background, animated ability icons
date: '2026-09-09'
cycle: 2026-09-09-fight-playback-fixes-post-death-overlays-zoom-scaled-hero-ic
---

# Verification report — Dota Coach

**Task:** Fight playback fixes: post-death overlays, zoom-scaled hero icons, real minimap background, animated ability icons
**Branch:** `auto/fight-playback-fixes-post-death-overlays-zoom-scaled-hero-ic`

## What was tested
An **independent** pass (extraction-based unit tests over the real functions pulled from
`webapp/index.html`, a Python test of the server plumbing, and a live real-browser drive in
`--demo` mode) — not the implementer re-confirming its own edits.

- **JS (`node --test`, 9/9 pass):** built synthetic scenes and drove `renderSceneSVG` /
  `fightSceneSVG` / `heroesAt` / `flattenFightEvents` directly:
  - G1 — a scene with a **dead** hero carrying queued dmg + cast + disable events → asserted the
    output has **no** damage number / cast ring / disable badge anchored to that hero, only its ✕;
    a **live** hero's overlays still render.
  - G2 — zoom = 1 output keeps the legacy `4.4` world radius (`width="8.80"`, byte-identical);
    zoom 5× clamps the hero icon to `width="5.28"` (larger on-screen: 26.4% vs 8.8% of the box).
  - G4 — a cast **with** `abil_img` emits an `<image>`; **without** one falls back to the text
    label; `flattenFightEvents` carries `abil_img` through.
  - Edges — single-frame fight renders without throwing; `heroesAt` on empty frames → `[]`.
- **Python (4/4 pass):** `_ability_icon` folds `_release`, falls back to the raw key, returns
  `None` for unknown/empty and for empty constants; `attach_frames` wires `abil_img` onto casts;
  **offline** (constants `{}`) degrades to `abil_img=None` with no crash; the **no-events** path
  never calls the ability-constants fetch (verified by making the fetch raise).
- **Live drive (`--demo`, real browser):** loaded a fight, loaded hero positions, played back.
  DOM probe confirmed: minimap gradient + river render; 9 hero portraits + HP/mana bars; a dead
  hero shows the ✕ and **no** lingering damage number; hero on-screen size grows 8.8%→26.4% from
  zoom 1→5×; demo casts (no icon) show the label fallback; an injected `abil_img` renders the
  animated `<image>`. No JS console errors.

## Findings (weaknesses / what broke)
- **[low] One expected 404 for `/static/dota_map.png`.** The one-time image probe fires a single
  request when no licensed map PNG is present; it is caught (`_mapImgOk=false`) and never retried
  per-tick (that flood was already fixed in #23). Cosmetic console noise only — **by design**,
  not a regression.
- **[med · scope/expectations] "Real minimap" is a stylized SVG, not Valve's actual image.** The
  DoD was deliberately set this way by the council (copyright): the app now draws a richer
  procedural Dota minimap and still overlays a real `/static/dota_map.png` **iff the user supplies
  one**. If the user literally wanted the pixel-accurate Valve minimap shipped in-repo, that is a
  licensing decision only they can make — the plumbing for it is done.
- **[low · aesthetic] The procedural minimap is dark/subdued.** Base `#0c1a12` with low-opacity
  territory tints reads as "Dota-like" but muted; some users may want punchier lane/territory
  contrast. Trivial to dial up (opacity constants) if desired at review.
- **[low · G1 nuance] The killing-blow number is also suppressed.** Gating overlays to
  alive-at-`t` means the very damage instance that drops a hero to 0 stops rendering the tick it
  dies (the hero is now `alive===false`). This is the intended fix (no corpse artifacts) and reads
  cleanly, but it does mean you don't see the final "-X" that secured the kill. Acceptable per the
  bug report; flagged for awareness.
- No functional breakage found: reduced-motion, single/zero-frame fights, missing icon URLs, and
  offline ability constants all degrade cleanly.

## Improvements
1. _(optional, aesthetic)_ If the minimap should pop more, raise the territory-polygon and
   gradient opacities and the lane stroke alpha — one-line constant tweaks in `mapBackgroundSVG`.
2. _(optional)_ If the killing-blow number matters, allow a dmg event to render for one extra tick
   at the moment of death (render dmg for a hero that was alive at the event time even if dead now)
   — a small, targeted relaxation of the alive gate scoped to `dmg` only.
3. _(nice-to-have)_ Commit the extraction-based JS tests + the Python test into the repo (currently
   run from the scratchpad) so this playback surface has a standing regression net.

## Verdict
**pass-with-notes.** All four goals meet the definition of done and are verified independently
(13/13 automated + live drive, no regressions). The notes are scope/aesthetic judgments for the
human review gate (⑤), not failures: the "real minimap" is intentionally a copyright-safe
procedural map with a user-supplied-PNG path, and the two G1/G3 nuances are deliberate, flagged
trade-offs. Draft PR **not** opened — awaiting user approval to publish (publish gate).
