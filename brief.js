// brief — deterministic project overview. No LLM, no network, $0.
// Answers "how are my projects doing?" from the vault. Prints to stdout.

import { getProjects } from './skills/vault/vault.js';

const HEALTH = { green: '🟢', yellow: '🟡', red: '🔴', gray: '⚪' };
const PRIO = { high: 0, med: 1, low: 2 };

const icon = (h) => HEALTH[h] || '⚪';
const ago = (d) => (d === 0 ? 'today' : d === 1 ? '1d ago' : `${d}d ago`);
const byPriorityThenStale = (a, b) =>
  (PRIO[a.priority] ?? 1) - (PRIO[b.priority] ?? 1) || b.daysSince - a.daysSince;

function projectLine(p) {
  return `  ${icon(p.health)} ${p.name} — ${p.priority} — next: ${p.next || '(none set)'}`;
}

function needsAttention(projects) {
  const flags = [];
  for (const p of projects) {
    if (p.status === 'blocked') {
      flags.push(`${p.name}: blocked — ${p.next || 'no next action set'}`);
    } else if (p.status === 'active' && (p.health === 'red' || p.health === 'yellow')) {
      flags.push(`${p.name}: health ${p.health}${p.next ? ` — ${p.next}` : ''}`);
    } else if (p.status === 'active' && p.daysSince > 7) {
      flags.push(`${p.name}: stale — no activity in ${p.daysSince}d`);
    }
    if (p.status === 'planned' && p.priority === 'high') {
      flags.push(`${p.name}: high priority, not started yet`);
    }
  }
  return flags;
}

const projects = await getProjects();
const today = new Date().toISOString().slice(0, 10);

const active = projects.filter((p) => p.status === 'active').sort(byPriorityThenStale);
const planned = projects.filter((p) => p.status === 'planned').sort(byPriorityThenStale);
const other = projects
  .filter((p) => !['active', 'planned'].includes(p.status))
  .sort(byPriorityThenStale);

const hc = { green: 0, yellow: 0, red: 0, gray: 0 };
for (const p of projects) hc[p.health] = (hc[p.health] || 0) + 1;

const L = [];
L.push(`ADMIN BRAIN — PROJECT BRIEF   ${today}`);
L.push('='.repeat(46));
L.push(
  `Portfolio: ${projects.length} projects · ${active.length} active · ${planned.length} planned` +
    (other.length ? ` · ${other.length} other` : '')
);
L.push(`Health:  🟢 ${hc.green}   🟡 ${hc.yellow}   🔴 ${hc.red}   ⚪ ${hc.gray}`);
L.push('');

if (active.length) {
  L.push('ACTIVE');
  for (const p of active) {
    const src = p.activitySource === 'git' ? 'last commit' : 'updated';
    L.push(`${projectLine(p)}   (${src} ${ago(p.daysSince)})`);
  }
  L.push('');
}
if (planned.length) {
  L.push('PLANNED (not started)');
  for (const p of planned) L.push(projectLine(p));
  L.push('');
}
if (other.length) {
  L.push('OTHER');
  for (const p of other) L.push(`${projectLine(p)}   [${p.status}]`);
  L.push('');
}

const attn = needsAttention(projects);
L.push('NEEDS ATTENTION');
if (attn.length) for (const a of attn) L.push(`  ⚠ ${a}`);
else L.push('  ✓ nothing urgent');
L.push('');
L.push(`(deterministic · $0 · generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')})`);

console.log(L.join('\n'));
