---
type: cycle
project: Dota Coach
stage: done
status: done
verdict: pass-with-notes
commit: 851ab7c
pr: https://github.com/liammpek16/dota-projects/pull/24
merged: '2026-09-09 (PR #24 squash-merged to main)'
task: >-
  Fight playback fixes: post-death overlays, zoom-scaled hero icons, real
  minimap background, animated ability icons
started: '2026-09-09'
readme_source: 'https://github.com/liammpek16/dota-projects'
branch: auto/fight-playback-fixes-post-death-overlays-zoom-scaled-hero-ic
target_path: 'C:/Users/liamm/Scripts'
report: 2026-09-09-fight-playback-fixes-post-death-overlays-zoom-scaled-hero-ic
---

## Task (from SELECT)
Fight playback fixes: post-death overlays, zoom-scaled hero icons, real minimap background, animated ability icons

## Project goal — source: https://github.com/liammpek16/dota-projects
```
# dota-projects

A collection of personal Dota 2 analysis and coaching projects.

## Contents

| Path | Description |
|------|-------------|
| `dota_coach/` | Dota 2 coaching app — replay parsing, coaching/research agents, telemetry, dashboard, and a web app. |
| `Dota_Game_Summary.py` | Generates a summary report for a Dota match. |
| `dota_knowledge.py`, `dota_knowledge_ext.py` | Static Dota knowledge bases (heroes, items, mechanics). |
| `report_html.py` | Builds HTML match reports. |
| `run-webapp.ps1` | Launches the coaching web app. |
| `tools/manta_positions/` | Go tool for extracting positional data from replays. |

## Notes

Large or regenerable files are intentionally **not** tracked in git (see `.gitignore`):
Dota replay files (`*.dem`), per-match data dumps, the local `coach.db`, compiled
binaries, and Python caches. Reference data (`dota_coach/data/constants/`) is kept.

## Setup

```bash
# Python projects
cd dota_coach
pip install -r requirements.txt

# Go tool
cd tools/manta_positions
go build ./...
```

## Validation

`dota_coach/validate_constants.py` guards the knowledge layer the coaching interface relies
on, with two checks:

1. **Constants vs upstream** — diffs `data/constants/heroes.json` & `items.json` against the
   live OpenDota `/constants` (same upstream: `odota/dotaconstants`) over a bounded subset
   (hero name/roles/attack_type/primary_attr, item name/cost).
2. **Knowledge referential integrity** (local, no network) — every hero name used as a key in
   `dota_knowledge.py` / `dota_knowledge_ext.py` must exist in `heroes.json`. A stale or
   misspelled key is *silently skipped* by the coaching analysis, so this catches heroes whose
   coaching data quietly drops out (e.g. a rename mismatch).

Exit 0 = clean, 1 = discrepancies.

```bash
cd dota_coach
python validate_constants.py                 # both checks (constants needs network)
python validate_constants.py --knowledge     # only the local knowledge check (no network)
python validate_constants.py --offline       # skip upstream; knowledge only
python validate_constants.py --json          # machine-readable report
python validate_constants.py --upstream-dir DIR   # compare constants vs a pinned copy
python validate_constants.py --insecure      # workaround for broken local TLS chains
```

### Constants note

Two hero `localized_name`s in `data/constants/heroes.json` are **hand-corrected** to their
current in-game names — `Outworld Destroyer` (was the stale `Outworld Devourer`) and
`Ringmaster` (was `Ring Master`). The upstream `odota/dotaconstants` snapshot still carried the
old names, which silently dropped both heroes' coaching data (their knowledge keys use the
current names). If `heroes.json` is ever regenerated from a stale upstream, these can revert —
`python validate_constants.py --knowledge` is the regression net that catches it (exit 1 on any
dangling hero reference).
```

## Council refinement

**Grounding (from code — follow-up to the merged playback batch, PR #22/#23):**
- Player: `webapp/index.html` `setupFightAnim` runs a 40ms `setInterval` time clock over
  `[frames[0].time, frames[last].time]`; each tick calls `fightSceneSVG(t, f, frames, view)`.
  `heroesAt(t)` interpolates each hero's `{x,y,hp,mana,alive}` between real samples;
  `renderSceneSVG(scene, view)` draws the map. `view={x0,y0,side}` from `faViewBox(zoom)`;
  `k = view.side/100` currently makes every glyph **screen-constant** (`4.4*k`, `2.0*k`, …).
- **Overlay positions**: `renderSceneSVG` builds `posOf` from **every** hero with x/y —
  *including dead ones* (line ~1358) — then draws casts/dmg/disables at `posOf[hero]`. That is
  the reported bug: a `dmg`/`cast` event's animation window (`FA_DMG_FADE`/`FA_CAST_ANIM` ≈0.9s)
  can outlive the hero, so a number/ring lingers on a corpse.
- **Casts** carry only `{hero, abil}` (prettified name) — no icon. Server `_attach_frame_overlays`
  (replay.py ~617) folds combat-log casts onto the nearest frame; it has the raw ability key
  (`e["abil"]`). `Dota_Game_Summary.image_url(path)` + a `_cached_constants("abilities", …)`
  fetch would yield an icon URL, exactly like heroes/items already do.
- **Background**: `mapBackgroundSVG()` draws a stylized SVG minimap and overlays a real
  `/static/dota_map.png` **iff** one is served (probed once). No such file ships today, so the
  stylized fallback is always what shows.

- **First-Principles** — Three of the four are pure front-end render tweaks over the existing
  time-clock; only the ability-icon (#4) needs a data field (the icon URL) plumbed from the
  server. The overlay bug (#1) and icon-scaling (#2) are both about how `renderSceneSVG` maps
  hero state → geometry, so fix them in that one function.
- **Contrarian** — Don't over-scale. "Icon scales with zoom" must stay bounded: an unclamped
  world-fixed icon at 5× zoom swallows the map. Cap the growth. And the "real minimap" ask
  collides with a hard constraint: **Valve's minimap PNG is copyrighted — do not download or
  commit it.** The honest $0 move is (a) sharpen the procedural SVG minimap and (b) keep the
  already-built `/static/dota_map.png` overlay so the user can drop in a licensed image. Flag
  this in the report; don't silently ship someone else's art.
- **Executor** — Reuse: gate overlays behind an `alive` set built from `heroesAt` (one-line
  cause fix, no new data). Add a `hero`-glyph scale `hs` separate from the screen-constant `k`
  so #2 is a localized change to the hero portrait/ring/bars/dead-marker only. For #4, add
  `abil_img` to cast events server-side and draw an `<image>` that scales-in + fades over the
  existing `FA_CAST_ANIM` window, falling back to today's ring+label when no icon.
- **Expansionist** — While gating post-death overlays, also drop the **disable badge** for dead
  heroes (same corpse-artifact class). Optional: a faint "killed" pop when a hero transitions to
  dead — skip for v1, keep scope tight.
- **Outsider (safety)** — Degrade cleanly: no icon URL → keep ring+label; `_cached_constants`
  offline → no crash (falls back like heroes/items); reduced-motion still yields a static first
  frame + working scrub; single-frame / no-frame fights still render; the icon-scale clamp keeps
  the map usable. Copyright: **procedural SVG only**, real PNG stays user-supplied. No new deps,
  $0, no LLM. Don't touch coaching-read verdict, `replay_status`, or ward-vision fallback.

## Refined task spec
Branch `auto/<task-slug>` in `C:/Users/liamm/Scripts` (off `main`). Four goals, one branch
(they all touch `renderSceneSVG`/`_attach_frame_overlays` — separate branches self-conflict).

**Goal 1 — post-death overlays (front-end, `renderSceneSVG`)**
- Build an **alive set** from the resolved scene (`heroesAt` already returns `alive`); render
  cast rings/labels, floating damage numbers, **and disable badges** only for heroes alive at
  `t`. A hero whose `alive === false` shows only its faded ✕ marker — no lingering number/ring.
- Simplest cause fix: populate `posOf` (used by every overlay) from **alive heroes only**, so
  each overlay's existing `if (!p) continue` drops corpse artifacts for free.

**Goal 2 — hero icon scales with zoom (front-end, `renderSceneSVG`)**
- Today `k = side/100` makes the hero portrait screen-constant (`4.4*k`). Introduce a **hero
  glyph scale** that *grows with zoom* instead: e.g. `hs = k * clamp(zoom, 1, ZCAP)` (world-ish
  size, so the on-screen icon enlarges as you zoom in), clamped so it never dominates the map.
- Apply `hs` to the hero **portrait, ring, dead-marker, HP/mana bars, and disable-badge
  offset/size** so the whole hero unit scales together. Floating **text** (damage, ability
  label) stays screen-constant (`k`) for legibility. At zoom = 1 the render is **unchanged**.

**Goal 3 — Dota-minimap background (front-end + static, `mapBackgroundSVG`)**
- Upgrade the procedural SVG minimap to read clearly as the Dota minimap: Radiant SW (green) /
  Dire NE (red) halves, teal river on the anti-diagonal, three lanes with tower ticks,
  jungle/tree shading, Roshan pit, base/ancient markers, fountains — inline SVG only.
- Keep the existing real-`/static/dota_map.png` overlay path. Update `static/README.txt` so the
  user knows dropping a **licensed** minimap PNG there yields the pixel-real background.
- **Copyright guard:** do not download or commit Valve's minimap image.

**Goal 4 — animated ability icon (server + front-end)**
- Server: add `fetch_ability_constants()` to `Dota_Game_Summary.py` (mirror
  `fetch_item_constants`, `_cached_constants("abilities", "{API_BASE}/constants/abilities")`).
  In `_attach_frame_overlays`, attach `abil_img = image_url(ab_consts.get(_canonical_ability(
  raw), {}).get("img"))` to each cast (keep the existing `abil` label). `attach_frames` passes
  the ability constants through.
- Front-end: `flattenFightEvents` carries `abil_img`; in the cast overlay draw the **ability
  icon `<image>`** at the caster that **scales up + fades** over `FA_CAST_ANIM` (a brief "pop"),
  with a subtle ring behind it. If `abil_img` is missing, fall back to today's ring + text label.

Constraints (all goals): $0, no LLM, no new deps; front-end stays `webapp/index.html`; server
change stays `replay.py` + `Dota_Game_Summary.py` (+ `static/README.txt`). Do not alter the
coaching-read verdict, `replay_status`, or the ward-vision fallback. `main` untouched.

## Definition of done
- **Goal 1:** at any `t`, a hero with `alive === false` shows **no** floating damage number,
  cast ring/label, or disable badge — only its faded ✕. Unit check: given a scene with a dead
  hero carrying a queued dmg + cast event, `renderSceneSVG` output contains no dmg/cast markup
  anchored to that hero.
- **Goal 2:** zooming in visibly **enlarges** the hero icons (portrait + ring + bars scale
  together) up to the clamp; at zoom = 1 the SVG output is byte-identical to before; the clamp
  keeps the largest icon well under the map size. Floating text stays legible (screen-constant).
- **Goal 3:** the background reads as the Dota minimap (Radiant/Dire halves, river, 3 lanes,
  Roshan, bases) in default and zoomed views; if a real `/static/dota_map.png` is present it
  overlays as before; README documents the licensed-image path. No copyrighted asset committed.
- **Goal 4:** casting an ability shows the **actual ability icon** popping + fading at the
  caster (with a ring); a cast lacking an icon URL still renders the old ring + label (no
  broken image); ability constants fetch degrades offline without error.
- **No regression:** coaching read card, spell panel, ward vision, death list, positions /
  `replay_status` fallback unchanged; DEMO mode still plays; reduced-motion still yields a static
  first frame + working scrub.
- Verified by `node --test` (pure fns: alive-gating, hero-scale clamp, cast-icon fallback) +
  Python check on the ability-constants fetch/attach + a real-browser drive with no console
  errors. Draft PR only after the user approves; `main` untouched throughout.

## Implementation
- branch: `auto/fight-playback-fixes-post-death-overlays-zoom-scaled-hero-ic` in `C:/Users/liamm/Scripts` (off `main`) — never touches main
- started: 2026-09-09T21:09

### Checkpoint log
- 2026-09-09T21:09 — branch created; supervised implementation started.
- 2026-09-09 — `c517a0d` — all 4 goals on `auto/fight-playback-fixes-…`:
  - **G1** `renderSceneSVG` builds `posOf` from **alive** heroes only → casts/damage/disable
    overlays no longer linger on a corpse; dead hero shows just the faded ✕.
  - **G2** new `hs = min(1, FA_HERO_ZOOM_CAP*k)` scales the hero portrait/ring/bars/dead-marker
    + disable-badge offset **up with zoom** (capped 3×); labels stay screen-constant; zoom-1 is
    byte-identical.
  - **G3** `mapBackgroundSVG()` redrawn as a richer Dota minimap (Radiant/Dire gradient halves,
    teal river, lanes+tower ticks, jungle tree texture, Roshan, glowing ancients); real-PNG
    overlay kept + `static/README.txt` documents the licensed-image path (no Valve art bundled).
  - **G4** server `Dota_Game_Summary.fetch_ability_constants()` + `image_url()` attach `abil_img`
    to casts in `replay._attach_frame_overlays`; client pops the **actual ability icon**
    (scale-in + fade) at the caster, falling back to the ring+label when no icon.
  - files: `dota_coach/replay.py`, `Dota_Game_Summary.py`, `dota_coach/webapp/index.html`,
    `dota_coach/webapp/static/README.txt`.
- 2026-09-09 — `2f6a9ec` — user review round 1 (ability animation approved):
  - **Hero scaling reversed** — portraits are now **screen-constant** (`hs = k`): they scale
    down in world units as you zoom so they stay a constant on-screen size, consistent with the
    zoomed map (the earlier grow-with-zoom ballooned them). Verified 8.8% on-screen at 1× and 5×.
  - **Minimap** — when a real `/static/dota_map.png` is supplied it is now the **full
    background** (the user attached the real Dota minimap; drop it in to use it). Procedural
    fallback recolored to match: grassy green Radiant, rocky grey Dire, blue river, tan lanes.
    `.gitignore`'d the local png so the copyrighted art stays local, never committed.
  - Tests re-run: 9/9 JS (G2 now asserts screen-constant) + map-color live probe.

## Verify
Verdict **PASS-WITH-NOTES** — independent pass: 9/9 JS (extraction unit tests over the real
render fns), 4/4 Python (ability-icon attach + offline degradation), and a live `--demo`
real-browser drive (minimap + river render, dead hero shows ✕ with no lingering damage number,
hero on-screen size grows 8.8%→26.4% zoom 1→5×, cast label fallback + injected-icon pop, no
console errors). Notes are scope/aesthetic, not failures: the "real minimap" is a copyright-safe
procedural map with a user-supplied-PNG path; the killing-blow number is intentionally suppressed
with the corpse artifacts. No regression to coaching read / spell panel / ward vision /
`replay_status`. Full report: [[2026-09-09-fight-playback-fixes-post-death-overlays-zoom-scaled-hero-ic]] (Reports).

## Review (human gate)
Draft PR **NOT** yet opened — awaiting user approval to publish (publish gate). On approval:
push `auto/fight-playback-fixes-post-death-overlays-zoom-scaled-hero-ic` and open a draft PR into
`main`. Open review decisions for the user:
1. Approve the copyright-safe procedural minimap, or supply a licensed `dota_map.png` for the
   pixel-real background (plumbing already in place)?
2. Punch up the minimap contrast (currently dark/subdued)?
3. Keep the killing-blow damage number suppressed on death (current), or let it show one final tick?
