// verify skill (Plan 2, stage ④) — INDEPENDENT verification. Scaffolds a report note and
// advances the cycle to stage:verify. The adversarial testing (try to break the feature)
// and the findings are produced by a separate pass — never the implementer rubber-stamping
// its own work. The report gates the merge/review decision.
//
// If the project note sets `verify_cmd` (run in `local_path`), the harness runs those
// automated checks first and records the result in the report, so the adversarial pass
// starts from a known baseline. A failing check makes the verdict at best fails-DoD.

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { getProjects, today } from '../vault/vault.js';
import { vaultPath, readNote, upsertNote, isMain } from '../../adapters/obsidian/index.js';

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export const CHECK_TIMEOUT_MS = 15 * 60 * 1000;
export const OUTPUT_TAIL_LINES = 40;

/** Kill a shell and everything it started (a timed-out check must not leave game processes running). */
function killTree(child) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  else try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
}

/**
 * Run a project's automated checks (`verify_cmd` in `local_path`).
 * Resolves null when the project has no verify_cmd; otherwise
 * { command, cwd, ok, code, timedOut, seconds, tail }.
 */
export async function runAutomatedChecks(proj, { timeoutMs = CHECK_TIMEOUT_MS } = {}) {
  if (!proj || !proj.verifyCmd) return null;
  const cwd = proj.localPath || process.cwd();
  const base = { command: proj.verifyCmd, cwd, ok: false, code: null, timedOut: false, seconds: 0 };
  if (!fs.existsSync(cwd)) return { ...base, tail: `local_path not found: ${cwd}` };
  const started = Date.now();
  const lines = [];
  let partial = '';
  const collect = (chunk) => {
    const parts = (partial + chunk).split(/\r?\n/);
    partial = parts.pop();
    for (const l of parts) if (l.trim()) { lines.push(l); if (lines.length > OUTPUT_TAIL_LINES) lines.shift(); }
  };
  const result = await new Promise((resolve) => {
    const child = spawn(proj.verifyCmd, { cwd, shell: true, windowsHide: true, detached: process.platform !== 'win32' });
    child.stdout.setEncoding('utf8').on('data', collect);
    child.stderr.setEncoding('utf8').on('data', collect);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; killTree(child); }, timeoutMs);
    child.on('error', (err) => { clearTimeout(timer); collect(`\n${err.message}\n`); resolve({ code: null, timedOut }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, timedOut }); });
  });
  collect('\n'); // flush the last partial line
  return {
    ...base,
    ok: !result.timedOut && result.code === 0,
    code: result.code,
    timedOut: result.timedOut,
    seconds: Math.round((Date.now() - started) / 1000),
    tail: lines.join('\n'),
  };
}

// Output and commands are shown inside markdown code; neutralise backticks so they can't break out.
const noFence = (s) => String(s).replace(/`/g, "'");

/** Markdown section for the report. */
export function automatedChecksSection(result) {
  if (!result) return ['## Automated checks', '_None configured (no `verify_cmd` on the project note)._'];
  const status = result.timedOut ? 'FAIL (timed out)' : result.ok ? 'PASS' : `FAIL (exit ${result.code})`;
  return [
    '## Automated checks',
    `**${status}** · \`${noFence(result.command)}\` in \`${noFence(result.cwd)}\` · ${result.seconds} s`,
    '',
    '```',
    noFence(result.tail),
    '```',
  ];
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const project = get('--project');
  if (!project) { console.error('Usage: node skills/verify/verify.js --project "<name>" [--no-checks]'); process.exit(1); }

  const proj = (await getProjects()).find((p) => p.name === project);
  if (!proj || !proj.next) { console.error(`Project not found or has no task: ${project}`); process.exit(2); }
  const cyclePath = path.join(vaultPath(), 'Cycles', `${today()}-${slugify(proj.next)}.md`);
  if (!fs.existsSync(cyclePath)) { console.error(`No cycle note for task "${proj.next}"`); process.exit(2); }
  const cyc = readNote(cyclePath);
  const reportName = `${today()}-${slugify(cyc.data.task || project)}`;

  let checks = null;
  if (!args.includes('--no-checks') && proj.verifyCmd) {
    console.log(`Running automated checks: ${proj.verifyCmd} (in ${proj.localPath || process.cwd()}) ...`);
    checks = await runAutomatedChecks(proj);
    console.log(`Automated checks: ${checks.ok ? 'PASS' : 'FAIL'} (${checks.seconds} s)`);
  }

  const body = [
    `# Verification report — ${cyc.data.project}`,
    '',
    `**Task:** ${cyc.data.task || ''}`,
    `**Branch:** \`${cyc.data.branch || ''}\``,
    '',
    ...automatedChecksSection(checks),
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

  const reportData = { type: 'report', project: cyc.data.project, task: cyc.data.task || '', date: today(), cycle: path.basename(cyclePath, '.md') };
  if (checks) reportData.automated_checks = checks.ok ? 'pass' : 'fail';
  const file = upsertNote('Reports', reportName, reportData, body);
  upsertNote('Cycles', path.basename(cyclePath, '.md'), { ...cyc.data, stage: 'verify', status: 'verifying', report: reportName }, cyc.body);

  console.log(`Verification report scaffold -> ${file}`);
  console.log('Cycle advanced to stage: verify. Run the adversarial pass and fill the report.');
}
