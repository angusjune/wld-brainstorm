#!/usr/bin/env node
/**
 * Brainstorm preview server
 *
 * A local dev server for previewing phone-mockup screens with live reload.
 * - Serves screen HTML files with hot-reload via SSE
 * - Watches the screen directory and pushes reload events on changes
 *
 * Usage:
 *   node scripts/serve-preview.cjs --project-dir /path/to/project --run-label account-detail-redesign [--use-bundled-profile] [--port 3210] [--host 127.0.0.1]
 *   node scripts/serve-preview.cjs --project-dir /path/to/project --run-dir /path/to/existing/run [--port 3210] [--host 127.0.0.1]
 *
 * Returns JSON on startup:
 *   { "url": "http://localhost:3210", "runDir": "...", "screenDir": "...", "stateDir": "...", "annotationsPath": "..." }
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { EVENT_FILE, EVENTS, appendSessionEvent } = require('./lib/session-telemetry.cjs');
const {
  WORKSPACE_PROFILE_DIRNAME,
  inspectProfile,
  resolveProfile,
} = require('./lib/profile-selection.cjs');
const {
  createRunDirectory,
  openRunDirectory,
  validateRunLabel,
} = require('./lib/run-directory.cjs');
const {
  ANNOTATION_FILE,
  annotationNumber,
  appendAnnotation,
  normalizeAnnotation,
  readEntries,
} = require('./lib/annotations.cjs');
const { expandChrome, loadChrome, readProfileConfig } = require('./lib/chrome.cjs');
const { contentTypeFor, isReadableFile, isWithinRoot } = require('./lib/static-files.cjs');

// --- Args ---
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const PORT = parseInt(getArg('port', '3210'), 10);
const HOST = getArg('host', '127.0.0.1');
const PROJECT_DIR = path.resolve(getArg('project-dir', process.cwd()));
const SERVER_STARTED_AT_MS = Date.now();
const SESSION_ID = `${process.pid}-${SERVER_STARTED_AT_MS}`;
const RESUME_RUN_DIR = getArg('run-dir');
const RUN_LABEL_ARG = getArg('run-label');
const USE_BUNDLED_PROFILE = args.includes('--use-bundled-profile');
if (RESUME_RUN_DIR && RUN_LABEL_ARG) {
  console.error('--run-dir and --run-label are mutually exclusive');
  process.exit(2);
}
if (RESUME_RUN_DIR && USE_BUNDLED_PROFILE) {
  console.error('--use-bundled-profile cannot change the profile of an existing run');
  process.exit(2);
}

let run;
try {
  run = RESUME_RUN_DIR
    ? openRunDirectory({ projectDir: PROJECT_DIR, runDir: RESUME_RUN_DIR })
    : {
        ...createRunDirectory({
          projectDir: PROJECT_DIR,
          runLabel: validateRunLabel(RUN_LABEL_ARG),
          startedAtMs: SERVER_STARTED_AT_MS,
        }),
        startedAtMs: SERVER_STARTED_AT_MS,
      };
} catch (error) {
  console.error(`Run selection failed: ${error.message}`);
  process.exit(RESUME_RUN_DIR ? 1 : 2);
}
const RESUMED = Boolean(RESUME_RUN_DIR);
const RUN_DIR = run.runDir;
const RUN_NAME = run.runName;
const RUN_LABEL = run.runLabel;
const RUN_STARTED_AT_MS = run.startedAtMs;
const SCREEN_DIR = path.join(RUN_DIR, 'screens');
const STATE_DIR = path.join(RUN_DIR, 'state');
const SKILL_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(SKILL_DIR, 'assets');

function restoreProfileSelection(info) {
  const expectedProfileDir = info.profileSource === 'workspace'
    ? path.join(PROJECT_DIR, WORKSPACE_PROFILE_DIRNAME)
    : path.join(SKILL_DIR, 'profile');
  if (path.resolve(info.profileDir) !== expectedProfileDir) {
    throw new Error(`saved ${info.profileSource} profile path does not match this project`);
  }
  const inspection = inspectProfile(expectedProfileDir);
  if (!inspection.isDirectory) {
    throw new Error(`saved profile is unavailable: ${expectedProfileDir}`);
  }
  return {
    profileDir: expectedProfileDir,
    source: info.profileSource,
    complete: inspection.complete,
    issues: inspection.issues,
    inspection,
  };
}

let profileSelection;
try {
  profileSelection = RESUMED
    ? restoreProfileSelection(run.info)
    : resolveProfile({
        projectDir: PROJECT_DIR,
        skillDir: SKILL_DIR,
        useBundled: USE_BUNDLED_PROFILE,
      });
} catch (error) {
  console.error(`Profile selection failed: ${error.message}`);
  process.exit(1);
}
const PROFILE_DIR = profileSelection.profileDir;
const PLATFORMS_DIR = path.join(SKILL_DIR, 'platforms');
const PROFILE = readProfileConfig(PROFILE_DIR);
const PROFILE_ISSUES = [...profileSelection.issues];
for (const field of ['platform', 'pageClass']) {
  if (!PROFILE[field]) PROFILE_ISSUES.push(`PROFILE.md frontmatter is missing ${field}`);
}
const PLATFORM_NAME = PROFILE.platform || null;
let PLATFORM_DIR = PLATFORM_NAME ? path.join(PLATFORMS_DIR, PLATFORM_NAME) : null;
if (PLATFORM_DIR && !fs.existsSync(PLATFORM_DIR)) {
  PROFILE_ISSUES.push(`platform pack does not exist: platforms/${PLATFORM_NAME}`);
  PLATFORM_DIR = null;
}
const PROFILE_COMPLETE = PROFILE_ISSUES.length === 0;

fs.mkdirSync(SCREEN_DIR, { recursive: true });
fs.mkdirSync(STATE_DIR, { recursive: true });

function recordEvent(event, details = {}) {
  return appendSessionEvent(STATE_DIR, event, details, {
    startedAtMs: RUN_STARTED_AT_MS,
    sessionId: SESSION_ID,
  });
}

recordEvent(EVENTS.SESSION_STARTED, {
  projectDir: PROJECT_DIR,
  runDir: RUN_DIR,
  runName: RUN_NAME,
  runLabel: RUN_LABEL,
  resumed: RESUMED,
  profileDir: PROFILE_DIR,
  profileSource: profileSelection.source,
  profileComplete: PROFILE_COMPLETE,
  profileIssues: PROFILE_ISSUES,
});

// --- SSE clients for live reload ---
const sseClients = new Set();
const screenVersions = new Map();

if (RESUMED) {
  let content = '';
  try { content = fs.readFileSync(path.join(STATE_DIR, EVENT_FILE), 'utf8'); } catch {}
  for (const line of content.split('\n')) {
    if (!line) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event?.event !== EVENTS.SCREEN_WRITTEN
      || typeof event.file !== 'string'
      || path.basename(event.file) !== event.file
      || !Number.isInteger(event.revision)
      || event.revision < 1) continue;
    const filePath = path.join(SCREEN_DIR, event.file);
    const previous = screenVersions.get(filePath);
    if (!previous || event.revision > previous.revision) {
      screenVersions.set(filePath, { signature: event.signature, revision: event.revision });
    }
  }
}

let annotationCounter = readEntries(STATE_DIR).reduce((highest, entry) => {
  if (entry?.type !== 'annotation') return highest;
  return Math.max(highest, annotationNumber(entry.id) || 0);
}, 0);

function captureScreenWrite(filePath) {
  if (path.extname(filePath) !== '.html' || !fs.existsSync(filePath)) return;
  let stat;
  try { stat = fs.statSync(filePath); } catch { return; }
  const signature = `${stat.size}:${stat.mtimeMs}`;
  const previous = screenVersions.get(filePath);
  if (previous?.signature === signature) return;
  const revision = (previous?.revision || 0) + 1;
  screenVersions.set(filePath, { signature, revision });
  recordEvent(EVENTS.SCREEN_WRITTEN, {
    file: path.relative(SCREEN_DIR, filePath),
    revision,
    bytes: stat.size,
    signature,
  });
}

function captureScreenWrites() {
  let files = [];
  try { files = fs.readdirSync(SCREEN_DIR); } catch { return; }
  for (const file of files) captureScreenWrite(path.join(SCREEN_DIR, file));
}

if (RESUMED) captureScreenWrites();

// --- Watch screen dir for changes ---
let debounceTimer;
fs.watch(SCREEN_DIR, { recursive: true }, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    captureScreenWrites();
    for (const res of sseClients) {
      try { res.write(`data: reload\n\n`); } catch {}
    }
  }, 200);
});

// --- Find newest HTML file in screen dir ---
function getNewestScreen() {
  try {
    const files = fs.readdirSync(SCREEN_DIR)
      .filter(f => f.endsWith('.html'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(SCREEN_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    return files[0]?.name || null;
  } catch { return null; }
}

// --- Preview frame stylesheet (auto-linked into served HTML) ---
const FRAME_STYLESHEET_PATH = path.join(ASSETS_DIR, 'frame.css');
if (!fs.existsSync(FRAME_STYLESHEET_PATH)) {
  console.error('Missing assets/frame.css — the preview frame cannot render.');
  process.exit(1);
}
const FRAME_STYLESHEET_TAG = '<link rel="stylesheet" href="/assets/frame.css" data-bs-frame>';

// --- Presentation-only chrome, resolved from the active platform pack ---
// Chrome expansion lives in lib/chrome.cjs so this server and the repo's
// screen-corpus dev server render a screen identically.
const { style: CHROME_STYLE_TAG, markup: CHROME_MARKUP } = loadChrome(PLATFORM_DIR);

// URL prefix -> directory. `/assets/` is shared machinery, `/profile/` is the
// product profile, `/platform/` is the active platform pack. Screens name none
// of them by identity, so swapping either needs no edits to any screen.
const STATIC_MOUNTS = [
  { prefix: '/assets/', dir: ASSETS_DIR },
  { prefix: '/profile/', dir: PROFILE_DIR },
  ...(PLATFORM_DIR ? [{ prefix: '/platform/', dir: PLATFORM_DIR }] : []),
];

// --- Helper script injection ---
function helperScript(screenBasename) {
  return `
<script>
window.__BRAINSTORM_SSE_URL = '/api/events';
window.__BRAINSTORM_SCREEN_FILE = ${JSON.stringify(screenBasename)};
</script>
<script src="/assets/live-reload.js"></script>
<script src="/assets/annotate.js"></script>
`;
}

function injectHelper(html, screenBasename) {
  html = expandChrome(html, CHROME_MARKUP);
  // Inject the pack's chrome styles + preview-frame stylesheet before </head>
  // (or before <body> as fallback).
  const headTags = [CHROME_STYLE_TAG, FRAME_STYLESHEET_TAG].filter(Boolean).join('\n');
  if (headTags) {
    if (html.includes('</head>')) {
      html = html.replace('</head>', headTags + '\n</head>');
    } else if (html.includes('<body')) {
      html = html.replace('<body', headTags + '\n<body');
    }
  }
  // Inject helper script before </body> or at the end
  const helper = helperScript(screenBasename);
  if (html.includes('</body>')) {
    return html.replace('</body>', helper + '</body>');
  }
  return html + helper;
}

function jsonResponse(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(payload));
}

// --- HTTP Server ---
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // --- CORS preflight ---
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // --- API: SSE for live reload ---
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`data: connected\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // --- API: append click annotations ---
  if (pathname === '/api/annotations' && req.method === 'POST') {
    const chunks = [];
    let bytes = 0;
    let finished = false;
    req.on('data', (chunk) => {
      if (finished) return;
      bytes += chunk.length;
      if (bytes > 64 * 1024) {
        finished = true;
        jsonResponse(res, 413, { ok: false, error: '批注内容过大' });
        res.once('finish', () => req.destroy());
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (finished) return;
      let payload;
      try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {
        jsonResponse(res, 400, { ok: false, error: 'JSON 格式无效' });
        return;
      }

      let normalized;
      try { normalized = normalizeAnnotation(payload); } catch (error) {
        jsonResponse(res, 400, { ok: false, error: error.message });
        return;
      }

      const resolvedFile = path.resolve(SCREEN_DIR, normalized.file);
      const screenRoot = `${path.resolve(SCREEN_DIR)}${path.sep}`;
      const insideScreenDir = resolvedFile.startsWith(screenRoot);
      let fileExists = false;
      if (insideScreenDir) {
        try { fileExists = fs.statSync(resolvedFile).isFile(); } catch {}
      }
      if (!insideScreenDir || !fileExists) {
        jsonResponse(res, 404, { ok: false, error: '找不到对应页面' });
        return;
      }

      const number = annotationCounter + 1;
      const id = `a${number}`;
      try {
        appendAnnotation(STATE_DIR, normalized, {
          id,
          sessionId: SESSION_ID,
          atMs: Date.now(),
        });
      } catch (error) {
        jsonResponse(res, 500, { ok: false, error: error.message });
        return;
      }
      annotationCounter = number;
      jsonResponse(res, 200, { ok: true, id });
    });
    return;
  }

  // --- Serve static mounts: /assets/ (shared) and /profile/ (the product) ---
  const mount = STATIC_MOUNTS.find(m => pathname.startsWith(m.prefix));
  if (mount) {
    const filePath = path.join(mount.dir, pathname.slice(mount.prefix.length));
    const resolved = path.resolve(filePath);
    if (!isWithinRoot(mount.dir, resolved)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (isReadableFile(filePath)) {
      res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
      res.end(fs.readFileSync(filePath));
      return;
    }
  }

  // --- Serve screen files ---
  let filePath;
  if (pathname === '/' || pathname === '/index.html') {
    const newest = getNewestScreen();
    if (!newest) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(injectHelper(`
        <!DOCTYPE html><html><head><meta charset="UTF-8">
        <link rel="stylesheet" href="/profile/design-system/tokens.css">
        <link rel="stylesheet" href="/profile/design-system/components.css">
        <style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0f0f0;font-family:system-ui}</style>
        </head><body>
        <div style="text-align:center;color:#888">
          <h2 style="color:#333">Brainstorm</h2>
          <p>Waiting for the agent to generate screens...</p>
          <p style="font-size:13px">This page will auto-refresh when screens are ready.</p>
        </div></body></html>
      `, null));
      return;
    }
    filePath = path.join(SCREEN_DIR, newest);
  } else {
    filePath = path.join(SCREEN_DIR, pathname);
  }

  // Path traversal protection for screen files
  const resolvedScreen = path.resolve(filePath);
  if (!isWithinRoot(SCREEN_DIR, resolvedScreen)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (isReadableFile(filePath)) {
    const ext = path.extname(filePath);
    if (ext === '.html') {
      captureScreenWrite(filePath);
      const version = screenVersions.get(filePath);
      recordEvent(EVENTS.SCREEN_SERVED, {
        file: path.relative(SCREEN_DIR, filePath),
        revision: version?.revision || null,
        requestPath: pathname,
      });
    }
    let content = ext === '.html'
      ? fs.readFileSync(filePath, 'utf8')
      : fs.readFileSync(filePath);
    if (ext === '.html') {
      content = injectHelper(content, path.basename(filePath));
    }
    res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
    res.end(content);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(JSON.stringify({ error: 'EADDRINUSE', host: HOST, port: PORT, message: `Port ${PORT} is already in use`, suggestion: `Try --port ${PORT + 1}` }));
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  if (RESUMED) fs.rmSync(path.join(STATE_DIR, 'server-stopped'), { force: true });
  const info = {
    type: 'server-started',
    url: `http://${HOST}:${PORT}`,
    host: HOST,
    port: PORT,
    runDir: RUN_DIR,
    runName: RUN_NAME,
    runLabel: RUN_LABEL,
    resumed: RESUMED,
    screenDir: SCREEN_DIR,
    stateDir: STATE_DIR,
    assetsDir: ASSETS_DIR,
    profileDir: PROFILE_DIR,
    profileSource: profileSelection.source,
    profileComplete: PROFILE_COMPLETE,
    profileIssues: PROFILE_ISSUES,
    sessionId: SESSION_ID,
    startedAt: new Date(RUN_STARTED_AT_MS).toISOString(),
    startedAtMs: RUN_STARTED_AT_MS,
    serverStartedAt: new Date(SERVER_STARTED_AT_MS).toISOString(),
    serverStartedAtMs: SERVER_STARTED_AT_MS,
    telemetryPath: path.join(STATE_DIR, EVENT_FILE),
    annotationsPath: path.join(STATE_DIR, ANNOTATION_FILE),
  };
  // Write startup info for the agent to read
  fs.writeFileSync(path.join(STATE_DIR, 'server-info.json'), JSON.stringify(info, null, 2));
  recordEvent(EVENTS.SERVER_LISTENING, { url: info.url, port: PORT });
  console.log(JSON.stringify(info));
});

// --- Graceful shutdown ---
let stopping = false;
function shutdown(reason) {
  if (stopping) return;
  stopping = true;
  recordEvent(EVENTS.SESSION_STOPPED, { reason: reason || '' });
  try { fs.writeFileSync(path.join(STATE_DIR, 'server-stopped'), reason || ''); } catch {}
  for (const res of sseClients) {
    try { res.end(); } catch {}
  }
  sseClients.clear();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Auto-shutdown after 30min of inactivity
let inactivityTimer;
function resetInactivity() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => shutdown('idle-timeout'), 30 * 60 * 1000);
}
resetInactivity();
server.on('request', resetInactivity);
