#!/usr/bin/env node
/**
 * Brainstorm Server
 *
 * A local dev server for previewing phone-mockup screens with live reload.
 * - Serves screen HTML files with hot-reload via SSE
 * - Watches the screen directory and pushes reload events on changes
 *
 * Usage:
 *   node server.cjs --project-dir /path/to/project [--port 3210] [--host 127.0.0.1]
 *
 * Returns JSON on startup:
 *   { "url": "http://localhost:3210", "screenDir": "...", "stateDir": "..." }
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// --- Args ---
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const PORT = parseInt(getArg('port', '3210'), 10);
const HOST = getArg('host', '127.0.0.1');
const PROJECT_DIR = getArg('project-dir', process.cwd());
const SESSION_ID = `${process.pid}-${Date.now()}`;
const SESSION_DIR = path.join(PROJECT_DIR, '.brainstorm', SESSION_ID);
const SCREEN_DIR = path.join(SESSION_DIR, 'screens');
const STATE_DIR = path.join(SESSION_DIR, 'state');
const ASSETS_DIR = path.resolve(__dirname, 'assets');
const PROFILE_DIR = path.resolve(__dirname, 'profile');
const PLATFORMS_DIR = path.resolve(__dirname, 'platforms');
const HELPER_PATH = path.join(__dirname, 'helper.js');

fs.mkdirSync(SCREEN_DIR, { recursive: true });
fs.mkdirSync(STATE_DIR, { recursive: true });

// --- SSE clients for live reload ---
const sseClients = new Set();

// --- Watch screen dir for changes ---
let debounceTimer;
fs.watch(SCREEN_DIR, { recursive: true }, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
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

// --- MIME types ---
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// --- Frame styles (extracted from frame-template.html, auto-injected into HTML) ---
const FRAME_TEMPLATE_PATH = path.join(ASSETS_DIR, 'frame-template.html');
let FRAME_STYLES_TAG = '';
try {
  const tmpl = fs.readFileSync(FRAME_TEMPLATE_PATH, 'utf8');
  const match = tmpl.match(/<style>([\s\S]*?)<\/style>/);
  if (match) {
    FRAME_STYLES_TAG = `<style>${match[1]}</style>`;
  }
} catch {}

// --- Presentation-only chrome, resolved from the active platform pack ---
// Nothing here knows what WeChat is: the tag is always <preview-chrome>, and
// which variants exist and what they render comes from the pack the profile
// selects. Swapping platform is a profile.json edit, not a code change.
const CHROME_TAG = 'preview-chrome';

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

const PROFILE = readJson(path.join(PROFILE_DIR, 'profile.json'), {});
const PLATFORM_NAME = PROFILE.platform || null;
const PLATFORM_DIR = PLATFORM_NAME ? path.join(PLATFORMS_DIR, PLATFORM_NAME) : null;
const PLATFORM = PLATFORM_DIR ? readJson(path.join(PLATFORM_DIR, 'platform.json'), null) : null;

if (PLATFORM_NAME && !PLATFORM) {
  console.error(`Unknown platform "${PLATFORM_NAME}" — no platforms/${PLATFORM_NAME}/platform.json. Check profile/profile.json.`);
  process.exit(1);
}

// variant name -> rendered snippet, loaded from the active pack.
const CHROME_VARIANTS = {};
if (PLATFORM && PLATFORM.variants) {
  for (const [variant, rel] of Object.entries(PLATFORM.variants)) {
    try {
      CHROME_VARIANTS[variant] = fs.readFileSync(path.resolve(PLATFORM_DIR, rel), 'utf8');
    } catch {
      console.error(`Platform "${PLATFORM_NAME}" declares variant "${variant}" but ${rel} is unreadable.`);
      process.exit(1);
    }
  }
}

const CHROME_CSS_URL = PLATFORM && PLATFORM.chrome
  ? `/platform/${String(PLATFORM.chrome).replace(/^\.\//, '')}`
  : null;

// URL prefix -> directory. `/assets/` is shared machinery, `/profile/` is the
// product profile, `/platform/` is the active platform pack. Screens name none
// of them by identity, so swapping either needs no edits to any screen.
const STATIC_MOUNTS = [
  { prefix: '/assets/', dir: ASSETS_DIR },
  { prefix: '/profile/', dir: PROFILE_DIR },
  ...(PLATFORM_DIR ? [{ prefix: '/platform/', dir: PLATFORM_DIR }] : []),
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseTagAttrs(rawAttrs) {
  const attrs = {};
  const attrRe = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match;
  while ((match = attrRe.exec(rawAttrs)) !== null) {
    attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function renderChrome(attrs) {
  const requested = attrs.variant || attrs.type;
  const variant = Object.prototype.hasOwnProperty.call(CHROME_VARIANTS, requested)
    ? requested
    : (PLATFORM && PLATFORM.defaultVariant) || null;
  const snippet = variant ? CHROME_VARIANTS[variant] : null;
  if (!snippet) return '';
  return snippet.replaceAll('{{title}}', escapeHtml(attrs.title || ''));
}

const CHROME_TAG_RE = new RegExp(
  `<${CHROME_TAG}\\b([^>]*)\\/?>\\s*(?:<\\/${CHROME_TAG}>)?`,
  'gi',
);

// A pack with no variants (or no platform at all) expands the tag to nothing,
// which is what a chrome-less product wants.
function expandChrome(html) {
  return html.replace(CHROME_TAG_RE, (_, rawAttrs) => renderChrome(parseTagAttrs(rawAttrs)));
}

function ensureStylesheet(html, href) {
  if (html.includes(href) || !html.includes('</head>')) return html;
  return html.replace('</head>', `  <link rel="stylesheet" href="${href}">\n</head>`);
}

// --- Helper script injection ---
const HELPER_SCRIPT = `
<script>
window.__BRAINSTORM_SSE_URL = '/api/events';
</script>
<script src="/helper.js"></script>
`;

function injectHelper(html) {
  html = expandChrome(html);
  html = ensureStylesheet(html, '/assets/reset.css');
  if (CHROME_CSS_URL) html = ensureStylesheet(html, CHROME_CSS_URL);
  // Inject frame styles before </head> (or before </body> as fallback)
  if (FRAME_STYLES_TAG) {
    if (html.includes('</head>')) {
      html = html.replace('</head>', FRAME_STYLES_TAG + '\n</head>');
    } else if (html.includes('<body')) {
      html = html.replace('<body', FRAME_STYLES_TAG + '\n<body');
    }
  }
  // Inject helper script before </body> or at the end
  if (html.includes('</body>')) {
    return html.replace('</body>', HELPER_SCRIPT + '</body>');
  }
  return html + HELPER_SCRIPT;
}

// --- HTTP Server ---
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // --- CORS preflight ---
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  // --- Serve helper.js ---
  if (pathname === '/helper.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(fs.readFileSync(HELPER_PATH, 'utf8'));
    return;
  }

  // --- Serve static mounts: /assets/ (shared) and /profile/ (the product) ---
  const mount = STATIC_MOUNTS.find(m => pathname.startsWith(m.prefix));
  if (mount) {
    const filePath = path.join(mount.dir, pathname.slice(mount.prefix.length));
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(mount.dir))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
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
        <link rel="stylesheet" href="/assets/reset.css">
        <link rel="stylesheet" href="/profile/tokens.css">
        <link rel="stylesheet" href="/profile/components.css">
        <link rel="stylesheet" href="/platform/chrome.css">
        <link rel="stylesheet" href="/assets/phone-mockup.css">
        <style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0f0f0;font-family:system-ui}</style>
        </head><body>
        <div style="text-align:center;color:#888">
          <h2 style="color:#333">Brainstorm</h2>
          <p>Waiting for the agent to generate screens...</p>
          <p style="font-size:13px">This page will auto-refresh when screens are ready.</p>
        </div></body></html>
      `));
      return;
    }
    filePath = path.join(SCREEN_DIR, newest);
  } else {
    filePath = path.join(SCREEN_DIR, pathname);
  }

  // Path traversal protection for screen files
  const resolvedScreen = path.resolve(filePath);
  if (!resolvedScreen.startsWith(path.resolve(SCREEN_DIR))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    let content = fs.readFileSync(filePath, 'utf8');
    if (ext === '.html') {
      content = injectHelper(content);
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
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
  const info = {
    type: 'server-started',
    url: `http://${HOST}:${PORT}`,
    host: HOST,
    port: PORT,
    screenDir: SCREEN_DIR,
    stateDir: STATE_DIR,
    assetsDir: ASSETS_DIR,
    sessionId: SESSION_ID,
  };
  // Write startup info for the agent to read
  fs.writeFileSync(path.join(STATE_DIR, 'server-info.json'), JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info));
});

// --- Graceful shutdown ---
function shutdown(reason) {
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
