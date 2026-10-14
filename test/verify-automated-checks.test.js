import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const tempVault = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-brain-vault-'));
process.env.ADMIN_BRAIN_VAULT = tempVault;

const { runAutomatedChecks, automatedChecksSection, OUTPUT_TAIL_LINES } = await import('../skills/verify/verify.js');
const { createProject, getProjects } = await import('../skills/vault/vault.js');

const node = JSON.stringify(process.execPath);
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-brain-checks-'));

test.after(() => {
  fs.rmSync(tempVault, { recursive: true, force: true });
  fs.rmSync(workDir, { recursive: true, force: true });
});

test('no verify_cmd means no automated checks', async () => {
  assert.equal(await runAutomatedChecks({ name: 'x', verifyCmd: '' }), null);
  assert.match(automatedChecksSection(null).join('\n'), /None configured/);
});

test('a passing command is recorded as PASS with its output, run in local_path', async () => {
  const r = await runAutomatedChecks({ verifyCmd: `${node} -e "console.log(process.cwd())"`, localPath: workDir });
  assert.equal(r.ok, true);
  assert.equal(r.code, 0);
  assert.equal(fs.realpathSync(r.tail.trim()), fs.realpathSync(workDir));
  assert.match(automatedChecksSection(r).join('\n'), /\*\*PASS\*\*/);
});

test('a failing command is FAIL with its exit code and only the output tail', async () => {
  const script = `for (let i = 0; i < ${OUTPUT_TAIL_LINES + 20}; i++) console.log('line ' + i); process.exit(3)`;
  const r = await runAutomatedChecks({ verifyCmd: `${node} -e "${script}"`, localPath: workDir });
  assert.equal(r.ok, false);
  assert.equal(r.code, 3);
  const lines = r.tail.split('\n');
  assert.equal(lines.length, OUTPUT_TAIL_LINES);
  assert.equal(lines.at(-1), `line ${OUTPUT_TAIL_LINES + 19}`);
  assert.match(automatedChecksSection(r).join('\n'), /FAIL \(exit 3\)/);
});

test('a missing local_path fails without running anything', async () => {
  const r = await runAutomatedChecks({ verifyCmd: 'echo hi', localPath: path.join(workDir, 'nope') });
  assert.equal(r.ok, false);
  assert.match(r.tail, /local_path not found/);
});

test('a hung command times out as FAIL and its whole process tree is killed', async () => {
  const pidFile = path.join(workDir, 'hung.pid');
  const script = `require('fs').writeFileSync('hung.pid', String(process.pid)); setTimeout(() => {}, 60000)`;
  const r = await runAutomatedChecks({ verifyCmd: `${node} -e "${script}"`, localPath: workDir }, { timeoutMs: 1500 });
  assert.equal(r.ok, false);
  assert.equal(r.timedOut, true);
  assert.match(automatedChecksSection(r).join('\n'), /timed out/);
  // The grandchild (node under the shell) must be gone, not orphaned.
  const pid = Number(fs.readFileSync(pidFile, 'utf8'));
  await new Promise((done) => setTimeout(done, 300));
  assert.throws(() => process.kill(pid, 0), /ESRCH/);
});

test('code fences in output cannot break out of the report block', async () => {
  const r = await runAutomatedChecks({ verifyCmd: `${node} -e "console.log('a\`\`\`b')"`, localPath: workDir });
  const section = automatedChecksSection(r).join('\n');
  assert.equal(section.match(/```/g).length, 2);
});

test('verify_cmd is read from the project note and accepted on create', async () => {
  fs.mkdirSync(path.join(tempVault, 'Projects'), { recursive: true });
  assert.equal(createProject({ name: 'Game', local_path: workDir, verify_cmd: 'npm test' }).ok, true);
  const proj = (await getProjects()).find((p) => p.name === 'Game');
  assert.equal(proj.verifyCmd, 'npm test');
  assert.equal(proj.localPath, workDir);
  assert.equal(createProject({ name: 'Bad', verify_cmd: 'a\nb' }).ok, false);
});
