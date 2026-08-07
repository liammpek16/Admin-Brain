// verify skill (Plan 2, stage ④) — INDEPENDENT verification. Scaffolds a report note and
// advances the cycle to stage:verify. The adversarial testing (try to break the feature)
// and the findings are produced by a separate pass — never the implementer rubber-stamping
// its own work. The report gates the merge/review decision.

import fs from 'node:fs';
import path from 'node:path';
import { getProjects, today } from '../vault/vault.js';
import { vaultPath, readNote, upsertNote, isMain } from '../../adapters/obsidian/index.js';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const project = get('--project');
  if (!project) { console.error('Usage: node skills/verify/verify.js --project "<name>"'); process.exit(1); }

  const proj = (await getProjects()).find((p) => p.name === project);
  if (!proj || !proj.next) { console.error(`Project not found or has no task: ${project}`); process.exit(2); }
  const cyclePath = path.join(vaultPath(), 'Cycles', `${today()}-${slugify(proj.next)}.md`);
  if (!fs.existsSync(cyclePath)) { console.error(`No cycle note for task "${proj.next}"`); process.exit(2); }
  const cyc = readNote(cyclePath);
  const reportName = `${today()}-${slugify(cyc.data.task || project)}`;

  const body = [
    `# Verification report — ${cyc.data.project}`,
    '',
    `**Task:** ${cyc.data.task || ''}`,
    `**Branch:** \`${cyc.data.branch || ''}\``,
    '',
    '## What was tested',
    '_Adversarial checks against the definition of done — edge cases, bad input, failure modes._',
    '',
    '## Findings (weaknesses / what broke)',
    '_Honest — what an attacker or bad input exposes._',
    '',
    '## Improvements',
    '_Concrete, prioritized recommendations._',
    '',
    '## Verdict',
    '_pass | pass-with-notes | fails-DoD._',
  ].join('\n');

  const file = upsertNote(
    'Reports',
    reportName,
    { type: 'report', project: cyc.data.project, task: cyc.data.task || '', date: today(), cycle: path.basename(cyclePath, '.md') },
    body
  );
  upsertNote('Cycles', path.basename(cyclePath, '.md'), { ...cyc.data, stage: 'verify', status: 'verifying', report: reportName }, cyc.body);

  console.log(`Verification report scaffold -> ${file}`);
  console.log('Cycle advanced to stage: verify. Run the adversarial pass and fill the report.');
}
