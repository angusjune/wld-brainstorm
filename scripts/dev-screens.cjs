#!/usr/bin/env node
'use strict';

/**
 * Screen corpus dev server
 *
 * A repo dev tool, not part of the publishable skill: it previews the product
 * profile's production screen templates so they can be edited by hand with live
 * feedback. The skill's own `scripts/serve-preview.cjs` serves generated session
 * screens instead, and is left alone.
 *
 * Usage:
 *   node scripts/dev-screens.cjs [--port 3311] [--host 127.0.0.1]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { loadChrome, readProfileConfig } = require('../skills/brainstorm/scripts/lib/chrome.cjs');
const { renderScreenDocument, renderGalleryDocument } = require('./lib/screen-render.cjs');

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const PORT = parseInt(getArg('port', '3311'), 10);
const HOST = getArg('host', '127.0.0.1');

const SKILL_DIR = path.resolve(__dirname, '..', 'skills', 'brainstorm');
const ASSETS_DIR = path.join(SKILL_DIR, 'assets');
const PROFILE_DIR = path.join(SKILL_DIR, 'profile');
const SCREEN_DIR = path.join(PROFILE_DIR, 'screens');
const PLATFORMS_DIR = path.join(SKILL_DIR, 'platforms');

if (!fs.existsSync(SCREEN_DIR)) {
  console.error(`No screen corpus at ${SCREEN_DIR}`);
  process.exit(1);
}

const PROFILE = readProfileConfig(PROFILE_DIR);
if (!PROFILE.pageClass) {
  console.error(
    `No pageClass in the frontmatter of ${path.join(PROFILE_DIR, 'PROFILE.md')} — ` +
    'screens cannot be sized to the phone viewport without it.',
  );
  process.exit(1);
}

const PLATFORM_NAME = PROFILE.platform || null;
const PLATFORM_DIR = PLATFORM_NAME ? path.join(PLATFORMS_DIR, PLATFORM_NAME) : null;

if (PLATFORM_DIR && !fs.existsSync(PLATFORM_DIR)) {
  console.error(
    `Unknown platform "${PLATFORM_NAME}" — no platforms/${PLATFORM_NAME}/ directory. ` +
    'Check the frontmatter in profile/PROFILE.md.',
  );
  process.exit(1);
}

// Chrome is re-read per request so edits to the platform pack show up too.
function chrome() {
  return loadChrome(PLATFORM_DIR);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const STATIC_MOUNTS = [
  { prefix: '/assets/', dir: ASSETS_DIR },
  { prefix: '/profile/', dir: PROFILE_DIR },
  ...(PLATFORM_DIR ? [{ prefix: '/platform/', dir: PLATFORM_DIR }] : []),
];

function listScreens() {
  return fs.readdirSync(SCREEN_DIR)
    .filter(file => file.endsWith('.html'))
    .sort((a, b) => a.localeCompare(b, 'zh'))
    .map(file => ({ file, name: path.basename(file, '.html') }));
}

function send(res, status, contentType, body) {
  res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  res.end(body);
}

// --- Live reload ---
const sseClients = new Set();

function broadcastReload() {
  for (const res of sseClients) {
    try { res.write('data: reload\n\n'); } catch { sseClients.delete(res); }
  }
}

// Screens, the design system they link, and the platform chrome all affect what
// is on screen, so all three are watched.
const WATCH_DIRS = [PROFILE_DIR, ASSETS_DIR, ...(PLATFORM_DIR ? [PLATFORM_DIR] : [])];
let debounceTimer;
for (const dir of WATCH_DIRS) {
  try {
    fs.watch(dir, { recursive: true }, () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(broadcastReload, 120);
    });
  } catch (error) {
    console.error(`Cannot watch ${dir}: ${error.message}`);
  }
}

function serveStatic(pathname, res) {
  const mount = STATIC_MOUNTS.find(m => pathname.startsWith(m.prefix));
  if (!mount) return false;

  const filePath = path.resolve(path.join(mount.dir, pathname.slice(mount.prefix.length)));
  if (!filePath.startsWith(path.resolve(mount.dir))) {
    send(res, 403, 'text/plain', 'Forbidden');
    return true;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;

  send(res, 200, MIME[path.extname(filePath)] || 'text/plain', fs.readFileSync(filePath));
  return true;
}

function serveScreen(pathname, url, res) {
  const file = pathname.slice('/screen/'.length);
  const filePath = path.resolve(path.join(SCREEN_DIR, file));
  if (!filePath.startsWith(path.resolve(SCREEN_DIR)) || !fs.existsSync(filePath)) {
    send(res, 404, 'text/plain; charset=utf-8', `找不到页面：${file}`);
    return;
  }
  const document = renderScreenDocument({
    fragment: fs.readFileSync(filePath, 'utf8'),
    chrome: chrome(),
    title: path.basename(file, '.html'),
    pageClass: PROFILE.pageClass,
    liveReload: !url.searchParams.has('embed'),
  });
  send(res, 200, MIME['.html'], document);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('data: connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (pathname === '/' || pathname === '/index.html') {
    send(res, 200, MIME['.html'], renderGalleryDocument({
      screens: listScreens(),
      screenDir: path.relative(process.cwd(), SCREEN_DIR),
    }));
    return;
  }

  if (pathname.startsWith('/screen/')) {
    serveScreen(pathname, url, res);
    return;
  }

  if (serveStatic(pathname, res)) return;

  send(res, 404, 'text/plain', 'Not found');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try: npm run screens:dev -- --port ${PORT + 1}`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, HOST, () => {
  const screens = listScreens();
  console.log(`页面样例预览：http://${HOST}:${PORT}`);
  console.log(`  平台：${PLATFORM_NAME || '(none)'} · ${screens.length} 个页面`);
  console.log(`  编辑 ${path.relative(process.cwd(), SCREEN_DIR)}/*.html 后浏览器自动刷新`);
});

function shutdown() {
  for (const res of sseClients) {
    try { res.end(); } catch {}
  }
  sseClients.clear();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
