#!/usr/bin/env node
/*
 * trends.js — read the series of metric-snapshots across vault/Metrics/*.md,
 * compute direction (up/down/flat) and change_pct over a window for a chosen
 * metric, and write vault/Trends/<YYYY-MM-DD>-<metric>.md per the contract.
 *
 * Reuses the vault skill's helper for all IO and parsing.
 *
 * Usage:
 *   node trends.js                          # avg_progress, 14-day window
 *   node trends.js inbox_count 7            # metric + window(days)
 *   node trends.js avg_progress 14 --dry    # compute, don't write
 *
 * Time-series math (dependency-free):
 *   - Collect snapshots whose date is within [asOf - window, asOf].
 *   - first = earliest in window, last = latest in window.
 *   - change_pct = round((last - first) / |first| * 100)  (0 if first == 0
 *     and last == 0; if first == 0 and last != 0, treat as +/-100).
 *   - direction: flat if |change_pct| < FLAT_THRESHOLD (default 2), else
 *     up/down by sign. Fewer than 2 in-window points => flat + insufficient data.
 *
 * Env: ADMIN_BRAIN_VAULT (default C:\Users\liamm\Admin-Brain\vault)
 */

'use strict';

const path = require('path');
const vault = require(path.join(__dirname, '..', 'vault', 'vault.js'));

const FLAT_THRESHOLD = 2; // percent

function todayISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function daysBetween(a, b) {
  // a, b are ISO date strings; returns b - a in whole days
  const da = new Date(a + 'T00:00'); const db = new Date(b + 'T00:00');
  return Math.round((db - da) / 86400000);
}

// Pull one metric's value out of a snapshot (checks metrics then custom).
function metricValue(data, metric) {
  if (data.metrics && metric in data.metrics) return Number(data.metrics[metric]);
  if (data.custom && metric in data.custom) return Number(data.custom[metric]);
  return undefined;
}

function series(metric) {
  return vault.listNotes({ type: 'metric-snapshot' })
    .map((n) => ({ date: n.data.date, value: metricValue(n.data, metric) }))
    .filter((p) => p.date && Number.isFinite(p.value))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function analyze(metric, windowDays, asOf) {
  const all = series(metric);
  const inWindow = all.filter(
    (p) => p.date <= asOf && daysBetween(p.date, asOf) <= windowDays);

  const result = {
    metric, window_days: windowDays, date: asOf,
    direction: 'flat', change_pct: 0,
    points: inWindow.length, insufficient: false,
    first: null, last: null,
  };

  if (inWindow.length < 2) {
    result.insufficient = true;
    result.direction = 'flat';
    if (inWindow.length === 1) { result.first = inWindow[0]; result.last = inWindow[0]; }
    return result;
  }

  const first = inWindow[0];
  const last = inWindow[inWindow.length - 1];
  let change_pct;
  if (first.value === 0) {
    change_pct = last.value === 0 ? 0 : (last.value > 0 ? 100 : -100);
  } else {
    change_pct = Math.round((last.value - first.value) / Math.abs(first.value) * 100);
  }
  let direction = 'flat';
  if (Math.abs(change_pct) >= FLAT_THRESHOLD) direction = change_pct > 0 ? 'up' : 'down';

  result.direction = direction;
  result.change_pct = change_pct;
  result.first = first;
  result.last = last;
  return result;
}

function proseFor(r) {
  if (r.insufficient) {
    return `Insufficient data: only ${r.points} snapshot(s) fall within the `
      + `${r.window_days}-day window ending ${r.date}, so no trend can be `
      + `established yet. Direction reported as flat by convention. Collect more `
      + `daily metric snapshots (run the metrics skill each day) to enable trend `
      + `detection.`;
  }
  const arrow = r.direction === 'up' ? 'increased' : r.direction === 'down'
    ? 'decreased' : 'held roughly flat';
  return `Over the ${r.window_days}-day window ending ${r.date}, ${r.metric} `
    + `${arrow} from ${r.first.value} (${r.first.date}) to ${r.last.value} `
    + `(${r.last.date}) across ${r.points} snapshot(s) — a change of `
    + `${r.change_pct >= 0 ? '+' : ''}${r.change_pct}%. Direction: ${r.direction}.`;
}

function writeTrend(r) {
  const rel = path.join(vault.FOLDERS.trend, `${r.date}-${r.metric}.md`);
  const data = {
    type: 'trend',
    date: r.date,
    metric: r.metric,
    window_days: r.window_days,
    direction: r.direction,
    change_pct: r.change_pct,
  };
  return vault.upsertNote(rel, data, proseFor(r) + '\n');
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const positional = args.filter((a) => !a.startsWith('--'));
  const metric = positional[0] || 'avg_progress';
  const windowDays = positional[1] ? parseInt(positional[1], 10) : 14;
  const asOf = positional.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) || todayISO();

  const r = analyze(metric, windowDays, asOf);
  if (dry) { console.log(JSON.stringify(r, null, 2)); return; }
  const { path: full, created } = writeTrend(r);
  console.log(`${created ? 'Created' : 'Updated'} trend ${r.date}-${r.metric}`);
  console.log(`  -> ${full}`);
  console.log(`  direction=${r.direction} change_pct=${r.change_pct} points=${r.points}`
    + (r.insufficient ? ' (insufficient data)' : ''));
  console.log(`  ${proseFor(r)}`);
}

module.exports = { analyze, series, writeTrend, proseFor };

if (require.main === module) main();
