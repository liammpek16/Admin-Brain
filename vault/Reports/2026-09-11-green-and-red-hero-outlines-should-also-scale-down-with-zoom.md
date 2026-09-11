---
type: report
project: Dota Coach
task: green and red hero outlines should also scale down with zoom like hero icons
date: '2026-09-11'
cycle: 2026-09-11-green-and-red-hero-outlines-should-also-scale-down-with-zoom
---

# Verification report — Dota Coach

**Task:** green and red hero outlines should also scale down with zoom like hero icons
**Branch:** `auto/green-and-red-hero-outlines-should-also-scale-down-with-zoom`

## What was tested
Independent extraction test of the changed `imgMarker` / `svgNum` logic and the two
call-site stroke expressions (`1.1*hs` hero, `1.1*k` ward, `hs===k`), driven with
adversarial inputs rather than the happy path:
- **A/B/C — regression at 1× and static.** Hero at `hs=1`, the `strokeWidth`-less
  default (the static `fightMapSVG` callers), and the dashed default all emit
  `stroke-width="1.1"` and dash `2 1.5` — byte-identical to pre-change output.
- **D — extreme zoom (8×).** stroke resolves to `0.138`; no degenerate/blank value.
- **E/F — degenerate params.** `strokeWidth=0 → "0"` (harmless); `strokeWidth=NaN →
  "NaN"` (an invalid SVG attribute — see findings).
- **G/H — ratio invariance.** hero `stroke/radius` = 0.25 and ward = 0.55, held
  constant across zoom 1×→8× (the DoD's "no ballooning" property).
- Dead-hero standalone ring: `stroke-dasharray` formula `svgNum(2*hs) svgNum(1.5*hs)`
  → `2 1.5` at 1×, `0.5 0.375` at 4× (scales as intended).

## Findings (weaknesses / what broke)
- **[low] No guard against a non-finite `strokeWidth`.** `svgNum(NaN)` emits
  `stroke-width="NaN"`, which the browser rejects (ring would fall back to default
  rendering). Not reachable through the current call sites — `hs = view.side/100`
  is always finite and `renderSceneSVG` defaults `view` when falsy — so this is a
  latent fragility, not a live bug. `svgNum(0.5*hs)` etc. are all safe.
- **[low · cosmetic] Rounding drift at deep zoom.** `svgNum` rounds to 3 dp, so the
  stroke/radius ratio wanders <1% at very high zoom (0.2509 vs 0.25 at 8×). Sub-pixel;
  invisible in practice, and the 3-dp rounding is exactly what preserves the 1×
  byte-identity, so it's the right trade.
- **[low · pre-existing, not from this change] Raw `r` in `imgMarker`.** The ring
  `<circle r="${r}">` is emitted unrounded (e.g. `0.8800000000000001` at 5×), unlike
  the image x/y/d which use `toFixed(2)`. Pre-existing; this change didn't touch it.
- No functional breakage: 1× output unchanged, wards and heroes scale identically,
  dead-ring dashes scale, HP/mana bars + cast rings + damage numbers + disable badges
  untouched (they already keyed off `k`/`hs`).

## Improvements
1. _(optional, robustness)_ Clamp/guard in `svgNum` — `Number.isFinite(n) ? … : "0"` —
   so a future caller passing a bad value can't emit `stroke-width="NaN"`.
2. _(optional, consistency)_ While here, round the `imgMarker` circle `r` with `toFixed(2)`
   to match the image attributes and shrink the emitted SVG slightly (pre-existing nit).

## Verdict
**pass.** All DoD criteria hold: 1× is byte-identical, hero and ward outlines track their
icons (constant stroke/radius) across zoom, and the dead-hero dash pattern scales. The two
findings are trivial (an unreachable NaN path and sub-pixel rounding); no blocker for merge.
