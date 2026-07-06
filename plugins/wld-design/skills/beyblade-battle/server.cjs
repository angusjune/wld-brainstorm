#!/usr/bin/env node
/**
 * beyblade-battle Server
 *
 * A local static server that hosts the screen-beyblade battle arena.
 * - Serves the arena page + engine from this skill's assets/
 * - Serves the battle config and screenshots the agent writes into the battle dir
 *
 * Usage:
 *   node server.cjs --project-dir /path/to/project [--port 4321] [--host 127.0.0.1]
 *   node server.cjs --battle-dir /explicit/dir     [--port 4321]
 *
 * Returns JSON on startup:
 *   { "type": "server-started", "url": "...", "battleDir": "...", "configPath": "...", "screensDir": "..." }
 *
 * The agent writes:
 *   <battleDir>/battle-config.json
 *   <battleDir>/screens/<image>.png
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

const PORT = parseInt(getArg('port', '4321'), 10);
const HOST = getArg('host', '127.0.0.1');
const PROJECT_DIR = getArg('project-dir', process.cwd());
const SESSION_ID = `${process.pid}-${Date.now()}`;
const BATTLE_DIR = path.resolve(getArg('battle-dir', path.join(PROJECT_DIR, '.wld-beyblade', SESSION_ID)));
const SCREENS_DIR = path.join(BATTLE_DIR, 'screens');
const CONFIG_PATH = path.join(BATTLE_DIR, 'battle-config.json');
const ASSETS_DIR = path.resolve(__dirname, 'assets');

fs.mkdirSync(SCREENS_DIR, { recursive: true });

// --- MIME types ---
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(filePath));
}

// Serve a file from a base dir with path-traversal protection.
function serveFrom(res, baseDir, relPath) {
  const filePath = path.join(baseDir, relPath);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(baseDir))) { res.writeHead(403); res.end('Forbidden'); return true; }
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) { sendFile(res, resolved); return true; }
  return false;
}

// --- HTTP Server ---
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // arena page
  if (pathname === '/' || pathname === '/index.html') {
    if (serveFrom(res, ASSETS_DIR, 'arena.html')) return;
    res.writeHead(500); res.end('arena.html missing'); return;
  }

  // battle config (from battle dir)
  if (pathname === '/battle-config.json') {
    if (fs.existsSync(CONFIG_PATH)) { sendFile(res, CONFIG_PATH); return; }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'battle-config.json not found', battleDir: BATTLE_DIR }));
    return;
  }

  // screenshots (from battle dir)
  if (pathname.startsWith('/screens/')) {
    if (serveFrom(res, SCREENS_DIR, pathname.slice('/screens/'.length))) return;
    res.writeHead(404); res.end('Not found'); return;
  }

  // static assets (arena.css, engine.js) from this skill's assets/
  const assetName = pathname.replace(/^\//, '');
  if (/^[\w.-]+\.(css|js)$/.test(assetName)) {
    if (serveFrom(res, ASSETS_DIR, assetName)) return;
  }

  res.writeHead(404); res.end('Not found');
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
    battleDir: BATTLE_DIR,
    screensDir: SCREENS_DIR,
    configPath: CONFIG_PATH,
    assetsDir: ASSETS_DIR,
    sessionId: SESSION_ID,
  };
  try { fs.writeFileSync(path.join(BATTLE_DIR, 'server-info.json'), JSON.stringify(info, null, 2)); } catch {}
  console.log(JSON.stringify(info));
});

// --- Graceful shutdown ---
function shutdown(reason) {
  try { fs.writeFileSync(path.join(BATTLE_DIR, 'server-stopped'), reason || ''); } catch {}
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
