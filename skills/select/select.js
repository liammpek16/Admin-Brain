// select skill (Plan 2, Phase A) — rank every project's next step and propose THE most
// important one, transparently. Deterministic, inspectable, $0. Writes a cycle note
// (status: awaiting-approval) for the human gate. No LLM, no network.

import fs from 'node:fs';
import path from 'node:path';
import { getProjects, needsAttention, today } from '../vault/vault.js';
import { vaultPath, readNote, upsertNote, isMain } from '../../adapters/obsidian/index.js';

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

  const date = today();
  const rows = ranked
    .map((r, i) => `${i + 1}. [${r.score}] ${r.project} (${r.priority}/${r.status}) — ${r.next}\n      ↳ ${r.why}`)
    .join('\n');

  // A project has a cycle "in flight" if it owns a cycle note that has advanced PAST select
  // (refine/implement/verify) and isn't done/abandoned. A fresh select-stage proposal is NOT
  // in flight — it's just the current proposal and stays refreshable. Keyed by project, so a
  // task-slug rename (project.next moved on) can't hide an existing in-flight cycle.
  const DONE = new Set(['done', 'abandoned']);
  const cycleDir = path.join(vaultPath(), 'Cycles');
  const inFlight = new Map(); // project -> {base, data}
  for (const f of fs.existsSync(cycleDir) ? fs.readdirSync(cycleDir) : []) {
    if (!f.endsWith('.md')) continue;
    const note = readNote(path.join(cycleDir, f));
    const d = note.data;
    if (d.type === 'cycle' && d.stage && d.stage !== 'select' && !DONE.has(String(d.status))) {
      inFlight.set(d.project, { base: f.replace(/\.md$/, ''), data: d });
    }
  }

  // Optional human override: `--project "<name>"` opens the cycle for a task you've already
  // decided on, instead of the auto-ranked #1. Bare `select` auto-picks the top-ranked project
  // that DOESN'T already have a cycle in flight, so it never proposes a duplicate.
  const pArg = process.argv.indexOf('--project');
  let top;
  if (pArg !== -1) {
    const want = (process.argv[pArg + 1] || '').toLowerCase();
    top = ranked.find((r) => r.project.toLowerCase() === want);
    if (!top) {
      console.log(`No ranked next step for project "${process.argv[pArg + 1]}". Candidates: ${ranked.map((r) => r.project).join(', ')}`);
      process.exit(1);
    }
  } else {
    top = ranked.find((r) => !inFlight.has(r.project));
    if (!top) {
      console.log(`Ranking:\n${rows}`);
      console.log(`\n✓ Every candidate already has a cycle in flight — nothing new to propose. Advance or finish an open cycle.`);
      process.exit(0);
    }
  }

  // Guard: refuse to open a second cycle for a project that already has one in flight
  // (only reachable via an explicit --project on such a project; bare select skipped it above).
  if (inFlight.has(top.project)) {
    const { base, data: d } = inFlight.get(top.project);
    console.log(`Ranking:\n${rows}`);
    console.log(`\n⚠ "${top.project}" already has an OPEN cycle: "${d.task}" (stage '${d.stage}', status '${d.status}').`);
    console.log(`   Finish or abandon ${base}.md before starting a new one.`);
    process.exit(0);
  }

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
    `${date}-${slugify(top.next)}`,
    { type: 'cycle', project: top.project, stage: 'select', status: 'awaiting-approval', task: top.next, score: top.score, started: date },
    body
  );

  console.log(`TASK OF THE DAY → ${top.project}: ${top.next}  [score ${top.score}]`);
  console.log(`  why: ${top.why}`);
  console.log(`\nRanking:\n${rows}`);
  console.log(`\nCycle note (awaiting approval) -> ${file}`);
}
