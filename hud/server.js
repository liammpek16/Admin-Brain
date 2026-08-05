#!/usr/bin/env node
/*
 * Admin Brain HUD — zero-dependency Node backend.
 * Serves a static dark terminal HUD and two live-data endpoints:
 *   GET /api/vault  -> parsed vault notes in the DATA-CONTRACT JSON shape
 *   GET /api/vitals -> real system vitals from Node's os module
 *
 * Node standard library only. No build step. No npm install.
 */

'use strict';

const http = require('http');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PORT = process.env.ADMIN_BRAIN_HUD_PORT || 4173;
const HOST = '127.0.0.1';
const VAULT = process.env.ADMIN_BRAIN_VAULT ||
  path.join(__dirname, '..', 'vault');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------------------------------------------------------------------------
// Minimal YAML frontmatter parser (hand-rolled, no deps)
// Handles: key: scalar, quoted strings, inline lists [a, b], nested one-level
// maps (e.g. metrics:, custom:) via indentation. Good enough for this vault.
// ---------------------------------------------------------------------------
function stripQuotes(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function coerce(raw) {
  const s = raw.trim();
  if (s === '' ) return '';
  // inline list: [a, b, c]
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((x) => coerce(x));
  }
  // quoted string -> string (do not number-coerce)
  if ((s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))) {
    return stripQuotes(s);
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  // integer / float
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  return s;
}

/**
 * Parse YAML frontmatter block between leading `---` fences.
 * Returns { data, body }.
 */
function parseFrontmatter(text) {
  const data = {};
  let body = text;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data, body };
  const yaml = m[1];
  body = m[2] || '';

  const lines = yaml.split(/\r?\n/);
  let parentKey = null; // for one-level nested maps
  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    const indent = line.length - line.replace(/^\s+/, '').length;
    const trimmed = line.trim();
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;

    const key = trimmed.slice(0, colon).trim();
    const valueRaw = trimmed.slice(colon + 1).trim();

    if (indent === 0) {
      if (valueRaw === '') {
        // start of a nested map
        parentKey = key;
        data[key] = {};
      } else {
        parentKey = null;
        data[key] = coerce(valueRaw);
      }
    } else if (parentKey && data[parentKey] && typeof data[parentKey] === 'object' &&
               !Array.isArray(data[parentKey])) {
      // nested key under the current parent map
      data[parentKey][key] = coerce(valueRaw);
    }
  }
  return { data, body };
}

// ---------------------------------------------------------------------------
// Vault reading -> DATA-CONTRACT JSON shape
// ---------------------------------------------------------------------------
function readDir(dir) {
  try {
    return fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md'));
  } catch (e) {
    return [];
  }
}

function readNote(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    return parseFrontmatter(text);
  } catch (e) {
    return { data: {}, body: '' };
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function localISO() {
  // YYYY-MM-DDTHH:mm:ss (local time)
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
         `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function buildVault() {
  // Projects
  const projDir = path.join(VAULT, 'Projects');
  const projects = readDir(projDir).map((f) => {
    const { data } = readNote(path.join(projDir, f));
    return {
      name: data.name || path.basename(f, '.md'),
      status: data.status || 'active',
      health: data.health || 'green',
      progress: typeof data.progress === 'number' ? data.progress : 0,
      priority: data.priority || 'med',
      next: data.next || '',
      updated: data.updated || '',
    };
  }).sort((a, b) => {
    const pr = { high: 0, med: 1, low: 2 };
    return (pr[a.priority] ?? 1) - (pr[b.priority] ?? 1);
  });

  // Metrics: newest snapshot by filename (YYYY-MM-DD)
  const metricDir = path.join(VAULT, 'Metrics');
  const metricFiles = readDir(metricDir).sort();
  let metrics = {};
  if (metricFiles.length) {
    const latest = metricFiles[metricFiles.length - 1];
    const { data } = readNote(path.join(metricDir, latest));
    metrics = Object.assign({}, data.metrics || {});
    if (data.custom && typeof data.custom === 'object') {
      metrics = Object.assign(metrics, data.custom);
    }
  }

  // Inbox
  const inboxDir = path.join(VAULT, 'Inbox');
  const inbox = readDir(inboxDir).map((f) => {
    const { data, body } = readNote(path.join(inboxDir, f));
    return {
      text: body.trim().split(/\r?\n/).filter(Boolean)[0] || '',
      urgency: data.urgency || 'normal',
      created: data.created || '',
      status: data.status || 'open',
      project: data.project || '',
    };
  }).sort((a, b) => {
    const ur = { high: 0, normal: 1, low: 2 };
    return (ur[a.urgency] ?? 1) - (ur[b.urgency] ?? 1);
  });

  return { generated: localISO(), projects, metrics, inbox };
}

// ---------------------------------------------------------------------------
// Schedule (Daily note) reading
// ---------------------------------------------------------------------------
function buildSchedule() {
  const dailyDir = path.join(VAULT, 'Daily');
  const today = todayISO();
  const file = path.join(dailyDir, `${today}.md`);
  if (fs.existsSync(file)) {
    const { data, body } = readNote(file);
    return { date: data.date || today, present: true, body: body.trim() };
  }
  return { date: today, present: false, body: '' };
}

// ---------------------------------------------------------------------------
// System vitals from os module
// ---------------------------------------------------------------------------
let lastCpu = cpuTimes();

function cpuTimes() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const c of cpus) {
    for (const t in c.times) total += c.times[t];
    idle += c.times.idle;
  }
  return { idle, total };
}

function cpuUsagePct() {
  const now = cpuTimes();
  const idleDiff = now.idle - lastCpu.idle;
  const totalDiff = now.total - lastCpu.total;
  lastCpu = now;
  if (totalDiff <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - idleDiff / totalDiff) * 100)));
}

function diskFree(cb) {
  // Best-effort Windows disk-free for the vault drive. Falls back gracefully.
  if (process.platform !== 'win32') {
    return cb(null);
  }
  const drive = (path.parse(VAULT).root || 'C:\\').slice(0, 2); // e.g. "C:"
  const letter = drive.replace(':', '');
  // Primary: PowerShell Get-PSDrive (works on modern Win11 where wmic is gone).
  const ps = `$d = Get-PSDrive -Name ${letter} -ErrorAction Stop; ` +
    `Write-Output ("{0},{1}" -f $d.Free, ($d.Free + $d.Used))`;
  execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps],
    { timeout: 3000, windowsHide: true }, (err, stdout) => {
      if (!err && stdout) {
        const parts = stdout.trim().split(',');
        const free = parseInt(parts[0], 10);
        const size = parseInt(parts[1], 10);
        if (!isNaN(free) && !isNaN(size) && size > 0) {
          return cb({ drive, free, size });
        }
      }
      // Fallback: legacy wmic (older Windows).
      execFile('cmd', ['/c', `wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace,Size /format:csv`],
        { timeout: 2500, windowsHide: true }, (err2, out2) => {
          if (err2 || !out2) return cb(null);
          try {
            const lines = out2.trim().split(/\r?\n/).filter((l) => l.includes(','));
            const last = lines[lines.length - 1].split(',');
            const free = parseInt(last[1], 10);
            const size = parseInt(last[2], 10);
            if (isNaN(free) || isNaN(size)) return cb(null);
            return cb({ drive, free, size });
          } catch (e) {
            return cb(null);
          }
        });
    });
}

function buildVitals(cb) {
  const cpus = os.cpus();
  const total = os.totalmem();
  const free = os.freemem();
  const base = {
    generated: localISO(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    uptime: Math.round(os.uptime()),
    cpu: {
      model: cpus.length ? cpus[0].model.trim() : 'unknown',
      cores: cpus.length,
      usage: cpuUsagePct(),
      loadavg: os.loadavg(), // [1,5,15] — 0s on Windows, sent anyway
    },
    memory: {
      total,
      free,
      used: total - free,
      usedPct: total ? Math.round(((total - free) / total) * 100) : 0,
    },
  };
  diskFree((disk) => {
    if (disk) {
      base.disk = {
        drive: disk.drive,
        free: disk.free,
        size: disk.size,
        usedPct: disk.size ? Math.round(((disk.size - disk.free) / disk.size) * 100) : 0,
      };
    }
    cb(base);
  });
}

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  // prevent path traversal
  const safe = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function sendJSON(res, obj, code = 200) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  try {
    if (url === '/api/vault') {
      return sendJSON(res, buildVault());
    }
    if (url === '/api/vitals') {
      return buildVitals((v) => sendJSON(res, v));
    }
    if (url === '/api/schedule') {
      return sendJSON(res, buildSchedule());
    }
    if (url === '/api/health') {
      return sendJSON(res, { ok: true, vault: VAULT });
    }
    return serveStatic(req, res);
  } catch (e) {
    return sendJSON(res, { error: String(e && e.message || e) }, 500);
  }
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}/`;
  process.stdout.write(
    '\n  ADMIN BRAIN HUD online\n' +
    `  URL   : ${url}\n` +
    `  Vault : ${VAULT}\n` +
    `  API   : /api/vault  /api/vitals  /api/schedule\n\n`
  );
});

module.exports = { parseFrontmatter, buildVault }; // exported for potential tests
