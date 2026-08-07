// select skill (Plan 2, Phase A) — rank every project's next step and propose THE most
// important one, transparently. Deterministic, inspectable, $0. Writes a cycle note
// (status: awaiting-approval) for the human gate. No LLM, no network.

import { getProjects, needsAttention, today } from '../vault/vault.js';
import { upsertNote, isMain } from '../../adapters/obsidian/index.js';

// Tunable weights (plan_2 §9.4). All 1.0 for a transparent baseline.
const W = { priority: 1, health: 1, staleness: 1, attention: 1, stalled: 1 };
const PRIO = { high: 3, med: 2, low: 1 };
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const r2 = (n) => Math.round(n * 100) / 100;

/** Score + rank each project's next step from signals we already derive. */
export async function rankNextSteps() {
  const projects = await getProjects();
  const flags = needsAttention(projects);
  const flagged = (name) => flags.some((f) => f.startsWith(`${name}:`));

  return projects
    .filter((p) => p.next && !['done', 'archived'].includes(p.status))
    .map((p) => {
      const parts = {
        priority: (PRIO[p.priority] || 1) * W.priority,
        health: (p.status === 'blocked' || p.health === 'red' ? 3 : p.health === 'yellow' ? 1.5 : 0) * W.health,
        staleness: (p.status === 'active' ? (Math.min(p.daysSince, 14) / 14) * 3 : 0) * W.staleness,
        attention: (flagged(p.name) ? 2 : 0) * W.attention,
        stalled: (p.status === 'active' && p.progress != null && p.progress < 25 ? 1 : 0) * W.stalled,
      };
      const score = r2(Object.values(parts).reduce((a, b) => a + b, 0));
      const why = Object.entries(parts).filter(([, v]) => v > 0).map(([k, v]) => `${k} +${r2(v)}`).join(', ') || 'baseline';
      return { project: p.name, status: p.status, priority: p.priority, next: p.next, parts, score, why };
    })
    .sort((a, b) => b.score - a.score || a.project.localeCompare(b.project));
}

// CLI: rank, propose the top task, write the cycle note, print the ranking.
if (isMain(import.meta.url)) {
  const ranked = await rankNextSteps();
  if (!ranked.length) {
    console.log('No candidate next steps found (add a `next` to a project).');
    process.exit(0);
  }
  const top = ranked[0];
  const date = today();

  const rows = ranked
    .map((r, i) => `${i + 1}. [${r.score}] ${r.project} (${r.priority}/${r.status}) — ${r.next}\n      ↳ ${r.why}`)
    .join('\n');

  const body = [
    '## Proposed task of the day',
    `**${top.project}** — ${top.next}`,
    ``,
    `Score **${top.score}** · ${top.why}`,
    ``,
    '## Ranking (all candidates)',
    rows,
    ``,
    '## Approve?',
    'If this is the right task, set `status: approved` in the frontmatter above (or tell',
    'the board to proceed) to move this cycle to ② REFINE. Override by editing `task`.',
    '',
    '> Deterministic pick — weights are tunable in `skills/select/select.js` (plan_2 §9.4).',
  ].join('\n');

  const file = upsertNote(
    'Cycles',
    `${date}-${slugify(top.project)}`,
    { type: 'cycle', project: top.project, stage: 'select', status: 'awaiting-approval', task: top.next, score: top.score, started: date },
    body
  );

  console.log(`TASK OF THE DAY → ${top.project}: ${top.next}  [score ${top.score}]`);
  console.log(`  why: ${top.why}`);
  console.log(`\nRanking:\n${rows}`);
  console.log(`\nCycle note (awaiting approval) -> ${file}`);
}
