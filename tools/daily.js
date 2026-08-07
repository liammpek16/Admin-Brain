// daily — the once-a-morning routine, run by Windows Task Scheduler.
// Runs metrics (snapshot → builds trend history) then inbox (writes the morning brief).
// Deterministic, $0, local. Spawns each skill so output/behavior matches the CLI exactly.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const steps = ['skills/metrics/metrics.js', 'skills/inbox/inbox.js'];

for (const rel of steps) {
  console.log(`\n=== ${rel} @ ${new Date().toISOString()} ===`);
  await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, rel)], { cwd: ROOT, stdio: 'inherit' });
    child.on('close', resolve);
  });
}
