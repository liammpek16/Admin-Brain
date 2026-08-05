#!/usr/bin/env node
/*
 * inbox.js — assemble the morning-brief source data (open inbox items +
 * project statuses + latest metric snapshot) and write a Morning Brief to
 * vault/Daily/<YYYY-MM-DD>.md (type: daily) per docs/DATA-CONTRACT.md.
 *
 * Reuses the vault skill's helper for all IO and parsing. Idempotent: re-running
 * the same day overwrites that day's Daily note.
 *
 * Usage:
 *   node inbox.js                 # brief for today
 *   node inbox.js 2026-08-05      # brief for a specific date
 *   node inbox.js --data          # print the assembled source JSON, don't write
 *
 * Env: ADMIN_BRAIN_VAULT (default C:\Users\liamm\Admin-Brain\vault)
 */

'use strict';

const path = require('path');
const vault = require(path.join(__dirname, '..', 'vault', 'vault.js'));

function nowLocal(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
    + `T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function todayISO(d = new Date()) { return nowLocal(d).slice(0, 10); }

const PRIORITY_RANK = { high: 0, med: 1, low: 2 };
const URGENCY_RANK = { high: 0, normal: 1, low: 2 };

// Assemble everything the brief is written from.
function assembleSources(date) {
  const projects = vault.getProjects();
  const openInbox = vault.listNotes({ type: 'inbox' })
    .filter((n) => n.data.status === 'open')
    .map((n) => ({
      text: (n.body || '').trim().split('\n').join(' ').trim(),
      urgency: n.data.urgency || 'normal',
      project: n.data.project || '',
      created: n.data.created || '',
      file: n.file,
    }))
    .sort((a, b) => (URGENCY_RANK[a.urgency] ?? 1) - (URGENCY_RANK[b.urgency] ?? 1));

  // latest metric snapshot on or before `date`
  const snaps = vault.listNotes({ type: 'metric-snapshot' })
    .filter((n) => n.data.date && n.data.date <= date)
    .sort((a, b) => (a.data.date < b.data.date ? 1 : -1));
  const latestMetrics = snaps.length ? snaps[0].data : null;

  const blockedProjects = projects.filter(
    (p) => p.status === 'blocked' || p.health === 'red');

  const activeProjects = projects
    .filter((p) => p.status === 'active')
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1));

  const highUrgencyInbox = openInbox.filter((i) => i.urgency === 'high');

  return {
    date, projects, activeProjects, openInbox, highUrgencyInbox,
    blockedProjects, latestMetrics,
  };
}

// Top-3 focus: high-urgency inbox first, then blocked/at-risk projects, then the
// highest-priority active projects' `next` actions. Deduped, capped at 3.
function topThree(s) {
  const picks = [];
  const push = (label) => { if (label && !picks.includes(label) && picks.length < 3) picks.push(label); };
  for (const i of s.highUrgencyInbox) push(`Triage: ${i.text}`);
  for (const p of s.blockedProjects) push(`Unblock ${p.name}: ${p.next || 'resolve blocker'}`);
  for (const p of s.activeProjects) push(`${p.name}: ${p.next || 'advance'}`);
  return picks;
}

// Items needing attention: blocked projects + high-urgency inbox.
function attentionItems(s) {
  const items = [];
  for (const p of s.blockedProjects) {
    const why = p.status === 'blocked' ? 'blocked' : 'health red';
    items.push(`[project] ${p.name} — ${why}. Next: ${p.next || '(none set)'}`);
  }
  for (const i of s.highUrgencyInbox) {
    items.push(`[inbox·high] ${i.text}${i.project ? ` (${i.project})` : ''}`);
  }
  return items;
}

function composeBrief(s) {
  const m = s.latestMetrics ? s.latestMetrics.metrics : null;
  const nActive = m ? m.projects_active : s.activeProjects.length;
  const nInbox = m ? m.inbox_count : s.openInbox.length;
  const nBlocked = m ? m.projects_blocked : s.blockedProjects.length;

  const parts = [];
  parts.push(`Good morning. ${nActive} active project(s), ${nInbox} open inbox `
    + `item(s), ${nBlocked} blocked.`);
  if (m) {
    parts.push(`Portfolio health: ${m.health_green} green / ${m.health_yellow} `
      + `yellow / ${m.health_red} red, average progress ${m.avg_progress}%.`);
  }
  if (s.blockedProjects.length) {
    parts.push(`Attention needed on: ${s.blockedProjects.map((p) => p.name).join(', ')}.`);
  } else {
    parts.push(`No projects are blocked — keep momentum on the highest-priority work.`);
  }
  if (s.highUrgencyInbox.length) {
    parts.push(`${s.highUrgencyInbox.length} high-urgency capture(s) await triage.`);
  }
  return parts.join(' ');
}

function buildDailyNote(s) {
  const brief = composeBrief(s);
  const focus = topThree(s);
  const attention = attentionItems(s);

  const lines = [];
  lines.push('## Morning Brief');
  lines.push(brief);
  lines.push('');
  lines.push('## Focus today');
  if (focus.length) focus.forEach((f) => lines.push(`- ${f}`));
  else lines.push('- (nothing pressing — pick the next highest-value task)');
  lines.push('');
  lines.push('## Needs attention');
  if (attention.length) attention.forEach((a) => lines.push(`- ${a}`));
  else lines.push('- Nothing flagged.');
  lines.push('');
  lines.push('## Notes');
  lines.push('');

  const data = {
    type: 'daily',
    date: s.date,
    brief_generated: nowLocal(),
  };
  return { data, body: lines.join('\n') };
}

function writeBrief(date) {
  const s = assembleSources(date);
  const { data, body } = buildDailyNote(s);
  const rel = path.join(vault.FOLDERS.daily, `${date}.md`);
  const res = vault.upsertNote(rel, data, body);
  return { res, sources: s, note: { data, body } };
}

function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
  const date = dateArg || todayISO();

  if (args.includes('--data')) {
    console.log(JSON.stringify(assembleSources(date), null, 2));
    return;
  }
  const { res, note } = writeBrief(date);
  console.log(`${res.created ? 'Created' : 'Updated'} daily brief ${date}`);
  console.log(`  -> ${res.path}`);
  console.log('---');
  console.log(vault.stringifyFrontmatter(note.data, note.body));
}

module.exports = { assembleSources, topThree, attentionItems, composeBrief, buildDailyNote, writeBrief };

if (require.main === module) main();
