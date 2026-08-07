// implement skill (Plan 2, stage ③ setup) — supervised implement, branch-only.
// Creates an `auto/<task>` branch in the TARGET project's local repo (never main),
// and advances the cycle note to stage:implement with a checkpoint log. The actual
// coding is done by the (supervised) agent on that branch; this harness sets the stage.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getProjects, today } from '../vault/vault.js';
import { vaultPath, readNote, upsertNote, isMain } from '../../adapters/obsidian/index.js';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const now = () => new Date().toISOString().slice(0, 16);

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const project = get('--project');
  const localPath = get('--path');
  const base = get('--base') || 'main';
  if (!project || !localPath) {
    console.error('Usage: node skills/implement/implement.js --project "<name>" --path "<local repo dir>" [--base main]');
    process.exit(1);
  }

  const proj = (await getProjects()).find((p) => p.name === project);
  if (!proj || !proj.next) { console.error(`Project not found or has no task: ${project}`); process.exit(2); }
  const cyclePath = path.join(vaultPath(), 'Cycles', `${today()}-${slugify(proj.next)}.md`);
  if (!fs.existsSync(cyclePath)) { console.error(`No cycle note for task "${proj.next}" at ${cyclePath}`); process.exit(2); }
  const cyc = readNote(cyclePath);
  if (cyc.data.status !== 'approved') {
    console.error(`Cycle status is '${cyc.data.status}', expected 'approved' — approve the refined spec first.`);
    process.exit(3);
  }
  if (!fs.existsSync(path.join(localPath, '.git'))) { console.error(`Not a git repo: ${localPath}`); process.exit(4); }

  const task = cyc.data.task || 'task';
  const branch = `auto/${slugify(task)}`;
  try {
    git(localPath, ['switch', '-c', branch, base]);
  } catch {
    try { git(localPath, ['switch', branch]); }
    catch (e) { console.error(`Could not create/switch branch ${branch}: ${e.message}`); process.exit(5); }
  }

  const body =
    `${cyc.body}\n\n## Implementation\n- branch: \`${branch}\` in \`${localPath}\` (off \`${base}\`) — never touches main\n- started: ${now()}\n\n### Checkpoint log\n- ${now()} — branch created; supervised implementation started.\n`;
  upsertNote('Cycles', path.basename(cyclePath, '.md'), { ...cyc.data, stage: 'implement', status: 'active', branch, target_path: localPath }, body);

  console.log(`IMPLEMENT set up for "${project}"`);
  console.log(`  branch: ${branch}  (in ${localPath}, off ${base}) — main untouched`);
  console.log(`  task:   ${task}`);
}
