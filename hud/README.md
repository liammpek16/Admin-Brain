# Admin Brain — Terminal HUD

A dark, phosphor-terminal **local web app** that is the "face" of the Admin Brain
vault. It reads your Obsidian-style Markdown vault and your machine's real system
vitals and renders them in a live, single-page heads-up display.

Zero npm dependencies — Node standard library only. No build step.

## Run

```bash
cd hud
npm start          # or:  node server.js
```

Then open the printed URL (default **http://127.0.0.1:4173/**).

### Environment variables

| Variable              | Default                              | Purpose                          |
| --------------------- | ------------------------------------ | -------------------------------- |
| `ADMIN_BRAIN_VAULT`   | `../vault` (relative to `hud/`)      | Path to the vault to read.       |
| `ADMIN_BRAIN_HUD_PORT`| `4173`                               | Port the HUD serves on.          |

Example (PowerShell):

```powershell
$env:ADMIN_BRAIN_VAULT = "C:\Users\liamm\Admin-Brain\vault"
node server.js
```

## API (served by the same process)

| Endpoint        | Returns                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| `GET /api/vault`   | `{ generated, projects[], metrics{}, inbox[] }` — parsed from the vault Markdown frontmatter, matching `docs/DATA-CONTRACT.md`. |
| `GET /api/vitals`  | Real system vitals from Node's `os` module: cpu (model/cores/usage/loadavg), memory, uptime, hostname, platform, and best-effort disk free. |
| `GET /api/schedule`| Today's Daily note body if present, else a flag so the UI shows a default day structure. |
| `GET /api/health`  | Liveness + resolved vault path.                                         |

The vault reader parses YAML frontmatter with a small hand-rolled parser
(no `js-yaml` / no installs) and emits field names **exactly** as defined in the
data contract.

## Panels

1. **SYSTEM VITALS** — CPU, memory, and disk gauges (bars + ASCII meters) plus
   host/platform/uptime/load. Live-updates every 3 seconds.
2. **COMMAND DECK** — a command line + quick buttons. Commands echo to a log pane;
   some call the API. Built-ins: `help`, `brief`, `metrics`, `refresh`, `vitals`,
   `plan <project>` (stub), `theme`, `speak`, `clear`. Designed so real skill
   wiring can replace the stubs later.
3. **SCHEDULE** — reads today's Daily note (`vault/Daily/<YYYY-MM-DD>.md`) if it
   exists; otherwise shows a placeholder default day structure.
4. **AUDIO I/O** — microphone dictation via the Web Speech API
   (`SpeechRecognition`) to fill the command input, and `speechSynthesis` to read
   the current brief aloud. Degrades gracefully with a clear message when the
   browser lacks support (see caveats).
5. **LIVE VAULT DATA** — project cards (name, status, color-coded health LED,
   progress bar, priority, and `next` action), the inbox list, and key metrics —
   all from `/api/vault`.

## Theme

Green-on-black phosphor by default, with an amber toggle (top-right button, the
`theme` command, or persisted via `localStorage`). Scanline + glow touches are CSS-only.

## Browser capability caveats

- **Web Speech dictation** (`SpeechRecognition`) is supported in Chrome and Edge
  (as `webkitSpeechRecognition`) and requires microphone permission. Firefox does
  not support it — the mic button disables itself and the panel shows a clear
  message. Because recognition uses a network service in Chrome, dictation needs
  an internet connection.
- **Speech synthesis** (`speechSynthesis`) is broadly supported; if absent, the
  Speak button disables with a message.

## Notes

- Serve/consume is same-origin, so no CORS config is needed.
- The disk-free figure on Windows uses `wmic`; if that is unavailable the vitals
  endpoint simply omits `disk` and the gauge shows `n/a`.
