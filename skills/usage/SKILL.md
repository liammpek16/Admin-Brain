---
name: usage
description: Surface Claude usage-limit RESET TIMES from a declared local source so the HUD can show a live countdown and notify when a limit resets. Deterministic, $0, no network — the reset times are ingested from a file (the source of truth), never scraped. Pure `normalizeUsage` + a thin fs reader.
---

# usage

Reads Claude usage-limit **reset times** from a declared local source and normalizes them for the
HUD's USAGE LIMITS panel (countdown + reset notification). No network, no new deps.

```bash
node skills/usage/usage.js     # or: npm run usage
```

## Source (no auto-scrape — reset times are ingested, honestly)
Claude Code exposes no stable local usage-reset file and the API rate-limit headers cost a key/quota,
so the reset times come from a **declared source**, read in order:

1. `ADMIN_BRAIN_CLAUDE_USAGE` — a path to a JSON file, else
2. `<vault>/State/claude-usage.json`.

The real file is gitignored; `vault/State/claude-usage.example.json` documents the schema.

## Accepted shapes
- **Native**: `{ "limits": [ { "name": "5h", "resetsAt": "2026-09-04T21:00:00Z", "used": 120, "limit": 200 } ] }`
- **Anthropic rate-limit headers**: `{ "anthropic-ratelimit-5h-reset": "2026-09-04T21:00:00Z", ... }`
  (the values come straight from Claude's API — paste them in, or have a future updater write them).

`normalizeUsage(raw, now)` is **pure**: each limit gains `msUntil` + a `status` (`reset` ≤ now ·
`soon` ≤ 15m · `ok`), sorted soonest-first. Empty/invalid → `{ configured: false }` (never a
fabricated time). The HUD serves it at `GET /api/usage` and fires one browser notification per reset.
