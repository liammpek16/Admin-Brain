// Admin Brain HUD — tiny local gap-filler over the vault. Zero new deps (Node http).
// Reuses the existing skills for synthesis and SPAWNS them for the action deck.
// Bound to 127.0.0.1 only; runnable skills are a fixed allowlist (no arbitrary commands).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import { getProjects, healthCounts, needsAttention, getSessions, sessionsWithin, updateProjectField, projectGoals, setProjectNext, today } from '../skills/vault/vault.js';
import { openInbox, focusToday, summaryParagraph } from '../skills/inbox/inbox.js';
import { trend } from '../skills/trends/trends.js';
import { readFolder, readNote, upsertNote, vaultPath } from '../adapters/obsidian/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(__dirname, 'public');
const HOST = '127.0.0.1';
const PORT = Number(process.env.ADMIN_BRAIN_HUD_PORT) || 4173;

// Fixed allowlist — the ONLY things the deck can execute.
const RUNNABLE = {
  select: 'skills/select/select.js',
  metrics: 'skills/metrics/metrics.js',
  inbox: 'skills/inbox/inbox.js',
  brief: 'brief.js',
};

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => resolve(b));
  });
}

async function overview() {
  const projects = await getProjects();
  const inbox = openInbox();
  const count = (s) => projects.filter((p) => p.status === s).length;
  return {
    generated: new Date().toISOString().slice(0, 16).replace('T', ' '),
    date: today(),
    counts: {
      total: projects.length,
      active: count('active'),
      planned: count('planned'),
      blocked: count('blocked'),
      done: count('done'),
    },
    health: healthCounts(projects),
    summary: summaryParagraph(projects, inbox),
    focus: focusToday(projects, inbox),
    attention: needsAttention(projects),
    projects: projects.map((p) => ({
      name: p.name, status: p.status, health: p.health, priority: p.priority,
      next: p.next, daysSince: p.daysSince, activitySource: p.activitySource,
      milestones: p.milestones, progress: p.progress,
    })),
    sessionsThisWeek: sessionsWithin(7).length,
    recentSessions: getSessions().slice(0, 5).map((s) => ({ date: s.date, project: s.project, player: s.player, daysAgo: s.daysAgo })),
  };
}

function trendSeries(metric) {
  const series = readFolder('Metrics', 'metric-snapshot')
    .map((n) => ({ date: n.data.date, value: Number((n.data.metrics || {})[metric]) }))
    .filter((s) => s.date && Number.isFinite(s.value))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { metric, series, trend: trend(metric) };
}

// Spawn a project script with fixed args (never a shell). Returns {ok, code, output}.
function runNode(rel, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, rel), ...args], { cwd: ROOT, env: process.env });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ ok: code === 0, code, output: out.trim() }));
    child.on('error', (err) => resolve({ ok: false, output: String(err) }));
  });
}

function runSkill(name) {
  const rel = RUNNABLE[name];
  if (!rel) return Promise.resolve({ ok: false, output: `Unknown skill: ${name}` });
  return runNode(rel);
}

// ---- Feature loop (Plan 2) ----
// The deterministic stage scripts the deck may drive. The reasoning-heavy work inside REFINE/
// IMPLEMENT/VERIFY is done by Claude Code (the orchestrator) — the HUD runs the scaffolding and
// owns the human gates, so the server itself stays $0 / no-LLM.
const LOOP_STAGES = {
  select: 'skills/select/select.js',
  refine: 'skills/refine/refine.js',
  implement: 'skills/implement/implement.js',
  verify: 'skills/verify/verify.js',
};
const STAGE_ORDER = ['select', 'refine', 'implement', 'verify', 'review'];
const CYCLE_DONE = new Set(['done', 'abandoned']);

// Given a cycle's frontmatter, describe the single next action and who owns it.
// kind: 'approve' (human gate) | 'run:<stage>' (deck button) | 'claude' (hand to orchestrator) | 'done'
function cycleNextAction(d) {
  const stage = d.stage, status = String(d.status || '');
  if (CYCLE_DONE.has(status)) return { kind: 'done', owner: 'you', label: 'Complete - review & merge the PR' };
  if (stage === 'select' && status === 'awaiting-approval') return { kind: 'approve', owner: 'you', label: 'Approve -> start REFINE' };
  if (stage === 'select' && status === 'approved') return { kind: 'run:refine', owner: 'hud', label: 'Run REFINE (assemble brief)' };
  if (stage === 'refine' && status === 'refining') return { kind: 'claude', owner: 'claude', label: 'Claude fills the council + spec, then Approve' };
  if (stage === 'refine' && status === 'awaiting-approval') return { kind: 'approve', owner: 'you', label: 'Approve spec -> IMPLEMENT' };
  if (stage === 'refine' && status === 'approved') return { kind: 'run:implement', owner: 'hud', label: 'Run IMPLEMENT (create branch)' };
  if (stage === 'implement' && status === 'active') return { kind: 'claude', owner: 'claude', label: 'Claude implements on the branch, then Run VERIFY' };
  if (stage === 'implement' && status === 'approved') return { kind: 'run:verify', owner: 'hud', label: 'Run VERIFY (scaffold report)' };
  if (stage === 'verify' && status === 'verifying') return { kind: 'claude', owner: 'claude', label: 'Claude runs the adversarial pass, then mark done' };
  return { kind: 'claude', owner: 'claude', label: `Continue (${stage}/${status})` };
}

// Human gates: approve the SELECT proposal, or the refined spec (refine, before implement).
function canApprove(d) {
  const s = String(d.status || '');
  return (d.stage === 'select' && s === 'awaiting-approval') ||
         (d.stage === 'refine' && (s === 'refining' || s === 'awaiting-approval'));
}

function listCycles() {
  const dir = path.join(vaultPath(), 'Cycles');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
  const cycles = files.map((f) => {
    const d = readNote(path.join(dir, f)).data;
    return {
      base: f.replace(/\.md$/, ''),
      project: d.project || '', task: d.task || '', stage: d.stage || '', status: String(d.status || ''),
      branch: d.branch || '', report: d.report || '', started: d.started || '',
      done: CYCLE_DONE.has(String(d.status)),
      next: cycleNextAction(d), canApprove: canApprove(d),
    };
  }).sort((a, b) => b.base.localeCompare(a.base));
  const active = cycles.filter((c) => !c.done);
  return { cycles, active, stageOrder: STAGE_ORDER };
}

// Run one loop stage for a project, composing the correct CLI args per stage.
async function runLoopStage(stage, project) {
  const rel = LOOP_STAGES[stage];
  if (!rel) return { ok: false, output: `Unknown stage: ${stage}` };
  if (stage === 'select') return runNode(rel, project ? ['--project', project] : []);
  if (!project) return { ok: false, output: `${stage} requires a project.` };
  if (stage === 'refine' || stage === 'verify') return runNode(rel, ['--project', project]);
  if (stage === 'implement') {
    const proj = (await getProjects()).find((p) => p.name === project);
    if (!proj) return { ok: false, output: `Project not found: ${project}` };
    if (!proj.localPath) return { ok: false, output: `No local_path set on "${project}". Add local_path to its project note so IMPLEMENT knows where the clone is.` };
    return runNode(rel, ['--project', project, '--path', proj.localPath, '--base', 'main']);
  }
  return { ok: false, output: `Unhandled stage: ${stage}` };
}

// Human gate: flip a cycle's status to 'approved' (only from a legit pending-approval state).
function approveCycle(base) {
  if (!base || /[\\/]/.test(base)) return { ok: false, output: 'Bad cycle id.' };
  const file = path.join(vaultPath(), 'Cycles', `${base}.md`);
  if (!fs.existsSync(file)) return { ok: false, output: 'Cycle not found.' };
  const note = readNote(file);
  if (!canApprove(note.data)) return { ok: false, output: `Cannot approve from ${note.data.stage}/${note.data.status}.` };
  upsertNote('Cycles', base, { ...note.data, status: 'approved' }, note.body);
  return { ok: true, output: `Approved "${note.data.task}" -> ${note.data.stage === 'select' ? 'ready to REFINE' : 'ready to IMPLEMENT'}.` };
}

// Projects that already have a cycle in flight (past select, not done) — the same condition
// `select` refuses to duplicate. Used to gate the goals board's Run buttons.
function inFlightProjects() {
  const dir = path.join(vaultPath(), 'Cycles');
  const set = new Set();
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!f.endsWith('.md')) continue;
    const d = readNote(path.join(dir, f)).data;
    if (d.type === 'cycle' && d.stage && d.stage !== 'select' && !CYCLE_DONE.has(String(d.status))) set.add(d.project);
  }
  return set;
}

// ---- Goals board (manual loop entry point) ----
// Every project's roadmap goals + whether a Run is currently possible.
async function goalsBoard() {
  const projects = await getProjects();
  const inflight = inFlightProjects();
  return projects.map((p) => ({
    name: p.name,
    status: p.status,
    hasOpenCycle: inflight.has(p.name),
    goals: projectGoals(p.name),
  }));
}

// Manually run a specific roadmap goal through the loop: validate it, set the project's `next`,
// then open a cycle via the deterministic `select --project`. The alternative to auto-ranking.
async function selectGoal(project, goal) {
  if (!project || !goal) return { ok: false, output: 'project and goal are required.' };
  const goals = projectGoals(project);
  if (!goals.length) return { ok: false, output: `No roadmap goals found for "${project}".` };
  const match = goals.find((g) => g.text === goal);
  if (!match) return { ok: false, output: `"${goal}" is not a roadmap goal of ${project}.` };
  if (match.done) return { ok: false, output: `That goal is already marked done.` };
  if (inFlightProjects().has(project)) return { ok: false, output: `${project} already has a cycle in flight — finish or abandon it first.` };
  if (!setProjectNext(project, goal)) return { ok: false, output: `Project note not found: ${project}` };
  const r = await runNode(LOOP_STAGES.select, ['--project', project]);
  return { ok: r.ok, output: r.output };
}

function serveStatic(req, res) {
  let rel = req.url.split('?')[0];
  if (rel === '/') rel = '/index.html';
  const file = path.join(PUBLIC, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file)) {
    res.writeHead(404);
    return res.end('Not found');
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (req.method === 'GET' && url.pathname === '/api/overview') return sendJson(res, 200, await overview());
    if (req.method === 'GET' && url.pathname === '/api/trends')
      return sendJson(res, 200, trendSeries(url.searchParams.get('metric') || 'projects_active'));
    if (req.method === 'POST' && url.pathname.startsWith('/api/run/'))
      return sendJson(res, 200, await runSkill(url.pathname.slice('/api/run/'.length)));
    if (req.method === 'GET' && url.pathname === '/api/cycles') return sendJson(res, 200, listCycles());
    if (req.method === 'GET' && url.pathname === '/api/goals') return sendJson(res, 200, await goalsBoard());
    if (req.method === 'POST' && url.pathname === '/api/loop/select-goal') {
      let r = { ok: false, output: 'Bad request.' };
      try {
        const { project, goal } = JSON.parse((await readBody(req)) || '{}');
        r = await selectGoal(project ? String(project) : '', goal ? String(goal) : '');
      } catch (e) { r = { ok: false, output: String((e && e.message) || e) }; }
      return sendJson(res, 200, r);
    }
    if (req.method === 'POST' && url.pathname === '/api/loop/run') {
      let r = { ok: false, output: 'Bad request.' };
      try {
        const { stage, project } = JSON.parse((await readBody(req)) || '{}');
        r = await runLoopStage(String(stage || ''), project ? String(project) : '');
      } catch (e) { r = { ok: false, output: String((e && e.message) || e) }; }
      return sendJson(res, 200, r);
    }
    if (req.method === 'POST' && url.pathname === '/api/cycle/approve') {
      let r = { ok: false, output: 'Bad request.' };
      try {
        const { base } = JSON.parse((await readBody(req)) || '{}');
        r = approveCycle(String(base || ''));
      } catch (e) { r = { ok: false, output: String((e && e.message) || e) }; }
      return sendJson(res, r.ok ? 200 : 400, r);
    }
    if (req.method === 'POST' && url.pathname === '/api/project/update') {
      let ok = false;
      try {
        const { project, field, value } = JSON.parse((await readBody(req)) || '{}');
        ok = updateProjectField(project, field, value);
      } catch {}
      return sendJson(res, ok ? 200 : 400, { ok });
    }
    if (req.method === 'GET') return serveStatic(req, res);
    res.writeHead(405);
    res.end('Method not allowed');
  } catch (e) {
    sendJson(res, 500, { error: String((e && e.message) || e) });
  }
});

// Fail friendly instead of throwing an unhandled 'error' with a stack trace.
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} is already in use — the HUD is probably already running.`);
    console.error(`Open it at  http://${HOST}:${PORT}`);
    console.error(`Or free the port and retry:`);
    console.error(`  PowerShell:  Get-NetTCPConnection -LocalPort ${PORT} -State Listen | Select -Expand OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }`);
    console.error(`  (or set a different port:  $env:ADMIN_BRAIN_HUD_PORT=4174; npm run hud )\n`);
    process.exit(1);
  }
  console.error(`HUD server error: ${err && err.message ? err.message : err}`);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Admin Brain HUD → http://${HOST}:${PORT}  (Ctrl+C to stop)`);
});
