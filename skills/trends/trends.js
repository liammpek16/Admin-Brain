// trends skill — read the Metrics snapshot series and compute direction + change
// for a metric over a window, writing vault/Trends/<date>-<metric>.md. No LLM, $0.
// Needs accumulated history (cold-start): with <2 snapshots it reports insufficient data.

import { today } from '../vault/vault.js';
import { readFolder, upsertNote, isMain } from '../../adapters/obsidian/index.js';

const DAY = 86_400_000;

/** Compute a trend for `metric` over the last `windowDays` up to `date`. */
export function trend(metric = 'projects_active', windowDays = 14, date = today()) {
  const end = new Date(`${date}T00:00:00`);
  const series = readFolder('Metrics', 'metric-snapshot')
    .map((n) => ({ date: n.data.date, value: Number((n.data.metrics || {})[metric]) }))
    .filter((s) => s.date && Number.isFinite(s.value))
    .filter((s) => {
      const d = new Date(`${s.date}T00:00:00`);
      return d <= end && (end - d) / DAY <= windowDays;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (series.length < 2) {
    return { metric, windowDays, direction: 'flat', change_pct: 0, points: series.length, insufficient: true };
  }
  const first = series[0].value;
  const last = series[series.length - 1].value;
  const change = first === 0 ? (last === 0 ? 0 : 100) : ((last - first) / Math.abs(first)) * 100;
  const change_pct = Math.round(change);
  const direction = Math.abs(change_pct) < 2 ? 'flat' : change_pct > 0 ? 'up' : 'down';
  return { metric, windowDays, direction, change_pct, points: series.length, first, last, insufficient: false };
}

// CLI: `node skills/trends/trends.js [metric] [--window N]`
if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const metric = args.find((a) => !a.startsWith('--')) || 'projects_active';
  const wi = args.indexOf('--window');
  const windowDays = wi >= 0 ? Number(args[wi + 1]) : 14;
  const t = trend(metric, windowDays);
  const body = t.insufficient
    ? `Insufficient data: only ${t.points} snapshot(s) in the ${t.windowDays}-day window ending ${today()}. ` +
      `Direction reported as flat by convention. Run the metrics skill daily to build history.`
    : `${metric} moved from ${t.first} to ${t.last} across ${t.points} snapshots ` +
      `(${t.windowDays}-day window): ${t.direction} ${t.change_pct >= 0 ? '+' : ''}${t.change_pct}%.`;
  const file = upsertNote(
    'Trends',
    `${today()}-${metric}`,
    { type: 'trend', date: today(), metric, window_days: t.windowDays, direction: t.direction, change_pct: t.change_pct },
    body
  );
  console.log(`Wrote trend -> ${file}`);
  console.log(`  ${body}`);
}
