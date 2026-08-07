// Admin Brain HUD — tiny local gap-filler over the vault. Zero new deps (Node http).
// Reuses the existing skills for synthesis and SPAWNS them for the action deck.
// Bound to 127.0.0.1 only; runnable skills are a fixed allowlist (no arbitrary commands).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import { getProjects, healthCounts, needsAttention, getSessions, sessionsWithin, today } from '../skills/vault/vault.js';
import { openInbox, focusToday, summaryParagraph } from '../skills/inbox/inbox.js';
import { trend } from '../skills/trends/trends.js';
import { readFolder } from '../adapters/obsidian/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(__dirname, 'public');
const HOST = '127.0.0.1';
const PORT = Number(process.env.ADMIN_BRAIN_HUD_PORT) || 4173;

// Fixed allowlist — the ONLY things the deck can execute.
const RUNNABLE = {
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

function runSkill(name) {
  return new Promise((resolve) => {
    const rel = RUNNABLE[name];
    if (!rel) return resolve({ ok: false, output: `Unknown skill: ${name}` });
    const child = spawn(process.execPath, [path.join(ROOT, rel)], { cwd: ROOT, env: process.env });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ ok: code === 0, code, output: out.trim() }));
    child.on('error', (err) => resolve({ ok: false, output: String(err) }));
  });
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
    if (req.method === 'GET') return serveStatic(req, res);
    res.writeHead(405);
    res.end('Method not allowed');
  } catch (e) {
    sendJson(res, 500, { error: String((e && e.message) || e) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Admin Brain HUD → http://${HOST}:${PORT}  (Ctrl+C to stop)`);
});
