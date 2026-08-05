/* Admin Brain HUD — frontend controller (vanilla JS, no framework) */
'use strict';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};

function bytes(n) {
  if (n == null || isNaN(n)) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0)} ${u[i]}`;
}

function fmtUptime(sec) {
  if (sec == null) return '—';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const parts = [];
  if (d) parts.push(d + 'd');
  if (h || d) parts.push(h + 'h');
  parts.push(m + 'm');
  return parts.join(' ');
}

function asciiGauge(pct, width = 12) {
  const filled = Math.round((pct / 100) * width);
  return '[' + '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled)) + ']';
}

function barClass(pct) {
  if (pct >= 90) return 'crit';
  if (pct >= 70) return 'warn';
  return '';
}

let state = { vault: null, vitals: null, schedule: null };

// ---------------------------------------------------------------------------
// Logging to command deck
// ---------------------------------------------------------------------------
function log(text, kind = 'out') {
  const pane = $('cmd-log');
  const line = el('div', kind);
  const ts = new Date().toLocaleTimeString('en-GB');
  line.textContent = kind === 'in' ? `${ts} > ${text}` : `${ts}   ${text}`;
  pane.appendChild(line);
  pane.scrollTop = pane.scrollHeight;
}

function setStatus(msg) { $('status-msg').textContent = msg; }

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------
async function fetchJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

async function refreshVault() {
  try {
    state.vault = await fetchJSON('/api/vault');
    renderVault(state.vault);
    $('conn').className = 'pill pill-ok';
    $('conn').textContent = 'LINK';
    return state.vault;
  } catch (e) {
    $('conn').className = 'pill pill-bad';
    $('conn').textContent = 'DOWN';
    log('vault fetch failed: ' + e.message, 'err');
  }
}

async function refreshVitals() {
  try {
    state.vitals = await fetchJSON('/api/vitals');
    renderVitals(state.vitals);
    return state.vitals;
  } catch (e) {
    log('vitals fetch failed: ' + e.message, 'err');
  }
}

async function refreshSchedule() {
  try {
    state.schedule = await fetchJSON('/api/schedule');
    renderSchedule(state.schedule);
    return state.schedule;
  } catch (e) {
    log('schedule fetch failed: ' + e.message, 'err');
  }
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------
function renderVitals(v) {
  $('vitals-host').textContent = 'host: ' + (v.hostname || '—');
  const cpuPct = v.cpu ? v.cpu.usage : 0;
  const memPct = v.memory ? v.memory.usedPct : 0;

  $('cpu-pct').textContent = cpuPct + '%';
  $('mem-pct').textContent = memPct + '%';
  const cpuBar = $('cpu-bar'); cpuBar.style.width = cpuPct + '%'; cpuBar.className = 'bar-fill ' + barClass(cpuPct);
  const memBar = $('mem-bar'); memBar.style.width = memPct + '%'; memBar.className = 'bar-fill ' + barClass(memPct);
  $('cpu-ascii').textContent = asciiGauge(cpuPct);
  $('mem-ascii').textContent = asciiGauge(memPct);

  if (v.disk) {
    const dp = v.disk.usedPct;
    $('disk-pct').textContent = dp + '%';
    const db = $('disk-bar'); db.style.width = dp + '%'; db.className = 'bar-fill ' + barClass(dp);
    $('disk-ascii').textContent = asciiGauge(dp);
  } else {
    $('disk-pct').textContent = 'n/a';
    $('disk-ascii').textContent = '[ n/a      ]';
  }

  $('v-cpu').textContent = v.cpu ? v.cpu.model : '—';
  $('v-cpu').title = v.cpu ? v.cpu.model : '';
  $('v-cores').textContent = v.cpu ? v.cpu.cores : '—';
  $('v-mem').textContent = v.memory ? `${bytes(v.memory.used)} / ${bytes(v.memory.total)}` : '—';
  $('v-uptime').textContent = fmtUptime(v.uptime);
  $('v-plat').textContent = `${v.platform || '—'} ${v.arch || ''}`;
  const la = v.cpu && v.cpu.loadavg ? v.cpu.loadavg.map((x) => x.toFixed(2)).join(' ') : '—';
  $('v-load').textContent = la;
}

function renderSchedule(s) {
  $('sched-date').textContent = s.date || '—';
  const list = $('agenda');
  list.innerHTML = '';
  if (s.present && s.body) {
    // Show the daily note body lines as agenda entries
    const lines = s.body.split(/\r?\n/).filter((l) => l.trim());
    lines.forEach((l) => {
      const li = el('li');
      li.appendChild(el('span', 'what', l.replace(/^[-#*]\s*/, '')));
      list.appendChild(li);
    });
    if (!lines.length) placeholderAgenda(list);
  } else {
    placeholderAgenda(list);
  }
}

function placeholderAgenda(list) {
  const note = el('li');
  note.appendChild(el('span', 'what placeholder', 'No Daily note for today — default day structure:'));
  list.appendChild(note);
  const blocks = [
    ['08:00', 'Morning brief + inbox triage'],
    ['09:00', 'Deep work — top project'],
    ['12:00', 'Break'],
    ['13:00', 'Meetings / comms'],
    ['15:00', 'Deep work — secondary'],
    ['17:00', 'Metrics snapshot + wrap-up'],
  ];
  blocks.forEach(([t, w]) => {
    const li = el('li');
    li.appendChild(el('span', 'time', t));
    li.appendChild(el('span', 'what', w));
    list.appendChild(li);
  });
}

function renderVault(data) {
  $('vault-gen').textContent = 'gen: ' + (data.generated || '—');

  // projects
  const pl = $('project-list');
  pl.innerHTML = '';
  (data.projects || []).forEach((p) => {
    const card = el('div', 'project-card');
    const head = el('div', 'pc-head');
    head.appendChild(el('span', 'health-led health-' + (p.health || 'green')));
    head.appendChild(el('span', 'pc-name', p.name));
    const meta = el('div', 'pc-meta');
    meta.appendChild(el('span', 'tag', (p.status || '').toUpperCase()));
    meta.appendChild(el('span', 'tag prio-' + (p.priority || 'med'), (p.priority || '').toUpperCase()));
    head.appendChild(meta);
    card.appendChild(head);

    const prog = el('div', 'pc-progress');
    const fill = el('div', 'pc-progress-fill');
    fill.style.width = (p.progress || 0) + '%';
    prog.appendChild(fill);
    card.appendChild(prog);

    const next = el('div', 'pc-next');
    next.appendChild(el('span', 'lbl', `next [${p.progress || 0}%]: `));
    next.appendChild(document.createTextNode(p.next || '—'));
    card.appendChild(next);

    card.appendChild(el('div', 'pc-updated', 'updated ' + (p.updated || '—')));
    pl.appendChild(card);
  });

  // metrics
  const mg = $('metrics-grid');
  mg.innerHTML = '';
  const metrics = data.metrics || {};
  Object.keys(metrics).forEach((k) => {
    const cell = el('div', 'metric-cell');
    cell.appendChild(el('div', 'mv', String(metrics[k])));
    cell.appendChild(el('div', 'mk', k.replace(/_/g, ' ')));
    mg.appendChild(cell);
  });

  // inbox
  const il = $('inbox-list');
  il.innerHTML = '';
  (data.inbox || []).forEach((item) => {
    const li = el('li');
    li.appendChild(el('span', 'urg urg-' + (item.urgency || 'normal'), (item.urgency || 'norm').slice(0, 4).toUpperCase()));
    li.appendChild(el('span', 'inbox-text', item.text || '(empty)'));
    il.appendChild(li);
  });

  setStatus(`vault synced — ${(data.projects || []).length} projects, ${(data.inbox || []).length} inbox`);
  if (data.__vaultPath) $('status-vault').textContent = 'vault: ' + data.__vaultPath;
}

// ---------------------------------------------------------------------------
// Brief generation (for command + speech)
// ---------------------------------------------------------------------------
function buildBriefText() {
  const v = state.vault;
  if (!v) return 'No vault data loaded yet.';
  const m = v.metrics || {};
  const lines = [];
  lines.push(`Admin Brain brief. ${(v.projects || []).length} projects tracked.`);
  (v.projects || []).forEach((p) => {
    lines.push(`${p.name}: ${p.status}, health ${p.health}, ${p.progress} percent. Next: ${p.next}.`);
  });
  if (m.inbox_count != null) lines.push(`Inbox has ${m.inbox_count} open items.`);
  if (m.avg_progress != null) lines.push(`Average progress ${m.avg_progress} percent.`);
  const high = (v.inbox || []).filter((i) => i.urgency === 'high');
  if (high.length) lines.push(`High urgency: ${high.map((i) => i.text).join('; ')}.`);
  return lines.join(' ');
}

// ---------------------------------------------------------------------------
// Command deck
// ---------------------------------------------------------------------------
const COMMANDS = {
  help() {
    log('available commands:', 'sys');
    log('  brief            — summarize projects + inbox (also speakable)', 'sys');
    log('  metrics          — print current key metrics', 'sys');
    log('  refresh          — re-fetch vault + vitals from server', 'sys');
    log('  vitals           — print current system vitals', 'sys');
    log('  plan <project>   — stub: acknowledges a plan request', 'sys');
    log('  theme            — toggle green/amber phosphor', 'sys');
    log('  speak            — read the brief aloud', 'sys');
    log('  clear            — clear this log', 'sys');
  },
  async refresh() {
    log('re-fetching vault + vitals…');
    await Promise.all([refreshVault(), refreshVitals(), refreshSchedule()]);
    log('done.');
  },
  brief() {
    const t = buildBriefText();
    t.split('. ').forEach((s) => { if (s.trim()) log(s.trim() + '.'); });
  },
  metrics() {
    const m = (state.vault && state.vault.metrics) || {};
    if (!Object.keys(m).length) { log('no metrics loaded.', 'err'); return; }
    Object.keys(m).forEach((k) => log(`  ${k.padEnd(18)} ${m[k]}`));
  },
  vitals() {
    const v = state.vitals;
    if (!v) { log('no vitals loaded.', 'err'); return; }
    log(`  cpu    ${v.cpu.usage}%  (${v.cpu.model})`);
    log(`  mem    ${v.memory.usedPct}%  ${bytes(v.memory.used)}/${bytes(v.memory.total)}`);
    log(`  uptime ${fmtUptime(v.uptime)}`);
    if (v.disk) log(`  disk   ${v.disk.usedPct}% used on ${v.disk.drive}`);
  },
  plan(arg) {
    if (!arg) { log('usage: plan <project>', 'err'); return; }
    log(`[stub] plan requested for "${arg}". Skill wiring drops in here.`, 'sys');
  },
  theme() { toggleTheme(); },
  speak() { speakBrief(); },
  clear() { $('cmd-log').innerHTML = ''; },
};

function runCommand(raw) {
  const line = raw.trim();
  if (!line) return;
  log(line, 'in');
  const [cmd, ...rest] = line.split(/\s+/);
  const arg = rest.join(' ');
  const fn = COMMANDS[cmd.toLowerCase()];
  if (fn) {
    try { fn(arg); } catch (e) { log('error: ' + e.message, 'err'); }
  } else {
    log(`unknown command: ${cmd}. type "help".`, 'err');
  }
}

// ---------------------------------------------------------------------------
// Theme toggle
// ---------------------------------------------------------------------------
function toggleTheme() {
  const root = document.documentElement;
  const next = root.getAttribute('data-theme') === 'green' ? 'amber' : 'green';
  root.setAttribute('data-theme', next);
  $('themeToggle').textContent = 'THEME: ' + next.toUpperCase();
  try { localStorage.setItem('ab-hud-theme', next); } catch (e) {}
  log('theme -> ' + next, 'sys');
}

// ---------------------------------------------------------------------------
// Audio I/O — Web Speech API (recognition + synthesis), graceful fallback
// ---------------------------------------------------------------------------
let recognition = null;
let recognizing = false;

function initAudio() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const status = $('audio-status');

  if (!SR) {
    $('mic-btn').disabled = true;
    $('mic-btn').textContent = '🎙 MIC: N/A';
    status.textContent = 'SpeechRecognition not supported in this browser. Use Chrome/Edge for dictation.';
    status.className = 'audio-status err';
  } else {
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      recognizing = true;
      $('mic-btn').classList.add('active');
      $('mic-btn').textContent = '🎙 MIC: ON';
      status.textContent = 'Listening…';
      status.className = 'audio-status live';
    };
    recognition.onerror = (e) => {
      status.textContent = 'Mic error: ' + e.error;
      status.className = 'audio-status err';
    };
    recognition.onend = () => {
      recognizing = false;
      $('mic-btn').classList.remove('active');
      $('mic-btn').textContent = '🎙 MIC: OFF';
      if (status.className.indexOf('err') === -1) {
        status.textContent = 'Idle.';
        status.className = 'audio-status';
      }
    };
    recognition.onresult = (event) => {
      let interim = '', finalTxt = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTxt += t; else interim += t;
      }
      $('transcript').textContent = (finalTxt || interim);
      $('cmd-input').value = (finalTxt || interim).trim();
      if (finalTxt) {
        status.textContent = 'Heard: "' + finalTxt.trim() + '" — press RUN or say again.';
      }
    };
  }

  if (!('speechSynthesis' in window)) {
    $('speak-btn').disabled = true;
    $('speak-btn').textContent = '🔊 N/A';
    if (SR) { /* keep mic status */ }
  }
}

function toggleMic() {
  if (!recognition) return;
  if (recognizing) recognition.stop();
  else {
    $('transcript').textContent = '';
    try { recognition.start(); } catch (e) { /* already started */ }
  }
}

function speakBrief() {
  const status = $('audio-status');
  if (!('speechSynthesis' in window)) {
    status.textContent = 'speechSynthesis not supported in this browser.';
    status.className = 'audio-status err';
    return;
  }
  const text = buildBriefText();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0; u.pitch = 1.0;
  u.onstart = () => { status.textContent = 'Speaking brief…'; status.className = 'audio-status live'; };
  u.onend = () => { status.textContent = 'Idle.'; status.className = 'audio-status'; };
  window.speechSynthesis.speak(u);
}

function stopSpeak() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  $('audio-status').textContent = 'Idle.';
  $('audio-status').className = 'audio-status';
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------
function tickClock() {
  $('clock').textContent = new Date().toLocaleTimeString('en-GB');
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function boot() {
  // restore theme
  try {
    const saved = localStorage.getItem('ab-hud-theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      $('themeToggle').textContent = 'THEME: ' + saved.toUpperCase();
    }
  } catch (e) {}

  // wire events
  $('themeToggle').addEventListener('click', toggleTheme);
  $('cmd-run').addEventListener('click', () => { runCommand($('cmd-input').value); $('cmd-input').value = ''; });
  $('cmd-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { runCommand($('cmd-input').value); $('cmd-input').value = ''; }
  });
  $('cmd-buttons').addEventListener('click', (e) => {
    const c = e.target.getAttribute('data-cmd');
    if (c) runCommand(c);
  });
  $('mic-btn').addEventListener('click', toggleMic);
  $('speak-btn').addEventListener('click', speakBrief);
  $('stop-speak-btn').addEventListener('click', stopSpeak);

  initAudio();

  // fetch health to show vault path in status bar
  fetchJSON('/api/health').then((h) => { if (h.vault) $('status-vault').textContent = 'vault: ' + h.vault; }).catch(() => {});

  log('ADMIN BRAIN HUD initialized. type "help" for commands.', 'sys');

  // initial + polling
  refreshVault();
  refreshVitals();
  refreshSchedule();
  tickClock();
  setInterval(tickClock, 1000);
  setInterval(refreshVitals, 3000);   // live vitals
  setInterval(refreshVault, 15000);   // periodic vault sync
}

document.addEventListener('DOMContentLoaded', boot);
