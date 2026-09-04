// usage skill — surface Claude usage-limit RESET TIMES from a declared local source, so the HUD can
// show a countdown and notify when a limit resets. Deterministic, $0, NO NETWORK: the reset times are
// ingested from a file (the source of truth), never scraped. `normalizeUsage` is pure + unit-tested;
// `readUsageResets` is the thin fs reader. Matches the brain-skill shape of metrics / inbox / trends.

import fs from 'node:fs';
import path from 'node:path';
import { vaultPath, isMain } from '../../adapters/obsidian/index.js';

const SOON_MS = 15 * 60 * 1000; // a reset within 15 min is "soon"

// Parse a timestamp: ISO string, or epoch (seconds < 1e12, else ms). Returns ms or null.
function toMs(v) {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v < 1e12 ? v * 1000 : v;
  const t = Date.parse(String(v));
  return Number.isNaN(t) ? null : t;
}

// Anthropic rate-limit HEADER shape: keys like `anthropic-ratelimit-<window>-reset` whose values
// come straight from Claude's API. Map each to a limit named `<window>`.
function fromAnthropicHeaders(raw) {
  const limits = [];
  for (const [k, v] of Object.entries(raw)) {
    const m = /^anthropic-ratelimit-(.+)-reset$/i.exec(k);
    if (m) limits.push({ name: m[1], resetsAt: v });
  }
  return limits;
}

/**
 * Pure. Normalize a raw usage payload into `{ configured, generatedAt, limits }`.
 * Accepts the native `{ limits: [{ name, resetsAt, used?, limit? }] }` OR an Anthropic-header object.
 * Each limit gains `msUntil` and a `status` (`reset` ≤ now · `soon` ≤ 15m · `ok`), sorted soonest-first.
 * Anything empty/invalid → `{ configured: false }` (never a fabricated time).
 */
export function normalizeUsage(raw, now = Date.now()) {
  const empty = { configured: false, generatedAt: new Date(now).toISOString(), limits: [] };
  if (!raw || typeof raw !== 'object') return empty;

  const source = Array.isArray(raw.limits)
    ? raw.limits.map((l) => ({ name: String((l && l.name) || 'limit'), resetsAt: l && l.resetsAt, used: l && l.used, limit: l && l.limit }))
    : fromAnthropicHeaders(raw);

  const limits = source
    .map((l) => {
      const ms = toMs(l.resetsAt);
      if (ms == null) return null;
      const msUntil = ms - now;
      const status = msUntil <= 0 ? 'reset' : msUntil <= SOON_MS ? 'soon' : 'ok';
      const out = { name: l.name, resetsAt: new Date(ms).toISOString(), msUntil, status };
      if (l.used != null) out.used = l.used;
      if (l.limit != null) out.limit = l.limit;
      return out;
    })
    .filter(Boolean)
    .sort((a, b) => a.msUntil - b.msUntil);

  return limits.length ? { configured: true, generatedAt: new Date(now).toISOString(), limits } : empty;
}

/**
 * Read the raw usage JSON from the declared source, or null. No network:
 *   1. `ADMIN_BRAIN_CLAUDE_USAGE` (a path), else
 *   2. `<vault>/State/claude-usage.json`.
 * This file is where reset times "pulled from Claude" land (hand-updated, or written by a future
 * updater / pasted Anthropic response headers).
 */
export function readUsageResets() {
  const candidates = [process.env.ADMIN_BRAIN_CLAUDE_USAGE, path.join(vaultPath(), 'State', 'claude-usage.json')].filter(Boolean);
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { /* unreadable/invalid → try next */ }
  }
  return null;
}

// CLI: `node skills/usage/usage.js` (or `npm run usage`) → print the normalized limits.
if (isMain(import.meta.url)) {
  const u = normalizeUsage(readUsageResets());
  if (!u.configured) {
    console.log('Claude usage: not configured.');
    console.log('  Set ADMIN_BRAIN_CLAUDE_USAGE to a JSON path, or add vault/State/claude-usage.json');
    console.log('  (see vault/State/claude-usage.example.json for the schema).');
    process.exit(0);
  }
  for (const l of u.limits) {
    const mins = Math.round(l.msUntil / 60000);
    const when = l.msUntil > 0 ? `in ~${mins}m` : `${Math.abs(mins)}m ago`;
    console.log(`${l.name.padEnd(14)} ${l.status.padEnd(5)} resets ${l.resetsAt} (${when})`);
  }
}
