---
type: report
project: Admin Brain
cycle: 2026-09-05-phone-app-feasibility
kind: feasibility
verdict: feasible
date: '2026-09-05'
---

# Feasibility — connecting a custom-made phone app to Admin Brain

## TL;DR
**Feasible, cheap, and on-ethos.** The HUD already exposes a clean JSON HTTP API, so a phone client
is just another consumer of it. Only two real things stand in the way: (1) the server is loopback-only
today, and (2) it has **no authentication** — which is fine while it's `127.0.0.1`-only but unsafe the
moment it's reachable from a phone. Recommended path: install the existing HUD as a **PWA** on the
phone, reach the PC over **Tailscale** (free, private, encrypted), gated by a **shared-secret token**.
No cloud, no paid service, data never leaves your control — stays $0 / local-first. A separate native
app is possible but unnecessary for v1.

## What "connecting a phone app" actually requires
The HUD is a Node `http` server bound to `127.0.0.1:4173` serving JSON (`/api/overview`, `/api/goals`,
`/api/cycles`, `/api/usage`, plus POST actions: add/edit/delete/reorder goals, run loop stages, launch
webapps). Any phone client — PWA or native — just calls that API. Three gaps to close:

1. **Reachability** — `127.0.0.1` is loopback-only; the phone can't see it.
2. **Auth** — there is currently **no authentication**; the loopback bind is the *only* thing guarding
   the write endpoints. Exposing it to any network without auth is unsafe (those endpoints add/delete
   goals and even spawn processes via the webapp launcher).
3. **Client** — something on the phone that renders the data and calls the API.

## Reachability options
| Option | What it is | Cost | Privacy | Effort | Notes |
|---|---|---|---|---|---|
| LAN bind | bind HUD to `0.0.0.0`, phone on same Wi-Fi hits `http://<pc-ip>:4173` | $0 | same-LAN only | S | HTTP not HTTPS; anyone on the LAN can reach it → needs auth + a firewall rule |
| **Tailscale** ⭐ | free WireGuard mesh VPN; PC + phone get private `100.x` IPs | $0 | private, encrypted, no public exposure | S–M | works off-LAN (cellular too); still add a token |
| Cloudflare Tunnel / ngrok | public URL tunneled to localhost | $0–$ | public endpoint (risky) | M | internet-exposed — only with strong auth; against the local-first ethos |
| Cloud relay / sync | push vault state to a hosted API | $ | data leaves the machine | L | breaks $0 / local-first — **rejected** |

## Client options
| Client | What | Effort | Notes |
|---|---|---|---|
| **PWA** ⭐ | add a web manifest + service worker to the existing HUD → "Add to Home Screen" = an installable app icon | S | reuses ALL the existing HUD UI; one codebase; offline shell; the "custom app" with the least new code |
| Thin native / React Native | a small app hitting the JSON API | M–L | native feel + push notifications, but a whole new codebase + dev-cert/store friction |
| Responsive HUD only | just make the HUD mobile-friendly, open in the phone browser | XS | simplest, but not "an app" |

## Security — the real gating item
The instant the server binds beyond `127.0.0.1`, it needs a gate:
- Add `ADMIN_BRAIN_HUD_TOKEN`; require `Authorization: Bearer <token>` (or `?token=`) on `/api/*`.
  Loopback can stay exempt so the desktop keeps working with no token.
- Keep the bind configurable via `ADMIN_BRAIN_HUD_HOST` (default `127.0.0.1`) so exposure is **opt-in**.
- Prefer **Tailscale** (encrypted, private) over a public tunnel; if using LAN, scope a Windows Firewall
  rule to the subnet.
- Never expose the loop-run / webapp-launch endpoints publicly — they spawn processes.

## Recommended path (cheapest, safest, on-ethos)
1. Make the HUD a **PWA** (manifest + service worker + a responsive/mobile layout) — front-end only.
2. Add **`ADMIN_BRAIN_HUD_HOST` bind config + shared-secret token auth** on `/api/*` — server only; the
   prerequisite for *any* phone access.
3. Reach the PC via **Tailscale** — zero code, just install on both devices.
4. *(optional later)* a native wrapper or web-push for reset/attention notifications.

**Verdict: FEASIBLE** in a few small cycles, $0, nothing leaves your machine. The only hard prerequisite
is adding auth before the server leaves loopback — do not skip it.

## Proposed follow-up goals (added to the roadmap)
- Make the HUD a mobile-installable PWA (manifest + service worker + responsive layout)
- Add a configurable bind host + shared-secret token auth to the HUD API (prereq for phone access)
- Reach the HUD from the phone over Tailscale (setup doc + smoke test)
