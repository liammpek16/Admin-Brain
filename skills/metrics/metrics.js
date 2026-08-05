#!/usr/bin/env node
/*
 * metrics.js — compute today's metric-snapshot from current vault state and
 * write vault/Metrics/<YYYY-MM-DD>.md per docs/DATA-CONTRACT.md.
 *
 * Idempotent: re-running the same day overwrites (updates) that day's file
 * rather than duplicating. Reuses the vault skill's helper for all IO.
 *
 * Usage:
 *   node metrics.js               # snapshot for today (local date)
 *   node metrics.js 2026-08-05    # snapshot for a specific date
 *   node metrics.js --dry         # print computed metrics, do not write
 *
 * Env: ADMIN_BRAIN_VAULT (default C:\Users\liamm\Admin-Brain\vault)
 */

'use strict';

const path = require('path');
const vault = require(path.join(__dirname, '..', 'vault', 'vault.js'));

function todayISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// tasks_done_today (best-effort): count of "## Log" bullet lines across all
// project notes whose leading date equals the snapshot date. A log line looks
// like "- 2026-08-05 — did the thing". Documented in SKILL.md.
function countTasksDoneToday(projects, date) {
  let n = 0;
  for (const p of projects) {
    const body = p._body || '';
    const logMatch = body.match(/##\s*Log([\s\S]*?)(?:\n##\s|\s*$)/i);
    const logSection = logMatch ? logMatch[1] : '';
    const re = new RegExp('^\\s*[-*]\\s*' + date + '\\b', 'gm');
    const hits = logSection.match(re);
    if (hits) n += hits.length;
  }
  return n;
}

function computeMetrics(date) {
  const projects = vault.getProjects();
  const active = projects.filter((p) => p.status === 'active');
  const blocked = projects.filter((p) => p.status === 'blocked');

  const progresses = active
    .map((p) => Number(p.progress))
    .filter((x) => Number.isFinite(x));
  const avg_progress = progresses.length
    ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length)
    : 0;

  const inbox = vault.listNotes({ type: 'inbox' });
  const inbox_count = inbox.filter((n) => n.data.status === 'open').length;

  // health counts across ALL non-archived/non-done projects (live portfolio).
  const live = projects.filter(
    (p) => p.status !== 'archived' && p.status !== 'done');
  const health_green = live.filter((p) => p.health === 'green').length;
  const health_yellow = live.filter((p) => p.health === 'yellow').length;
  const health_red = live.filter((p) => p.health === 'red').length;

  return {
    projects_active: active.length,
    projects_blocked: blocked.length,
    avg_progress,
    inbox_count,
    tasks_done_today: countTasksDoneToday(projects, date),
    health_green,
    health_yellow,
    health_red,
  };
}

function writeSnapshot(date, metrics, custom) {
  const rel = path.join(vault.FOLDERS['metric-snapshot'], `${date}.md`);
  // Preserve any existing `custom:` block on re-run so hand-added numbers stick.
  const existing = vault.readNote(rel);
  const mergedCustom = Object.assign(
    { revenue_mtd: 0 },
    (existing && existing.data && existing.data.custom) || {},
    custom || {});
  const data = {
    type: 'metric-snapshot',
    date,
    metrics,
    custom: mergedCustom,
  };
  return vault.upsertNote(rel, data, '');
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const dateArg = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
  const date = dateArg || todayISO();

  const metrics = computeMetrics(date);
  if (dry) {
    console.log(JSON.stringify({ date, metrics }, null, 2));
    return;
  }
  const { path: full, created } = writeSnapshot(date, metrics);
  console.log(`${created ? 'Created' : 'Updated'} snapshot ${date}`);
  console.log(`  -> ${full}`);
  console.log(JSON.stringify(metrics, null, 2));
}

module.exports = { computeMetrics, writeSnapshot, countTasksDoneToday, todayISO };

if (require.main === module) main();
