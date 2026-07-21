#!/usr/bin/env node

/**
 * WeChat Mini Program live screen capturer (Rung-6 loop, implementation half).
 *
 * Drives WeChat DevTools via `miniprogram-automator` to launch a demo project and
 * screenshot each page (screen-only, no phone chrome) into the conformance workdir.
 * These impl PNGs are paired with design refs by basename and fed to
 * conform-to-design.mjs.
 *
 * Usage:
 *   node capture-miniprogram.mjs <projectDir> [--out <dir>] [--pages all|p1,p2,...] [--cli <devtoolsCliPath>]
 *
 *   --out    output dir for impl PNGs   (default <projectDir>/.conform/impl)
 *   --pages  "all" or comma-list of app.json page paths to capture (default all)
 *   --cli    WeChat DevTools CLI path    (default $WX_DEVTOOLS_CLI or the macOS path)
 *
 * Each captured page becomes <out>/<slug>.png where slug = page path with "/" → "-"
 * (e.g. "pages/home/index" → "pages-home-index.png").
 *
 * Exit codes: 0 success, 1 usage/env/launch failure, 2 unexpected top-level crash.
 */

import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CLI = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';

function exists(p) {
  return fs.existsSync(p);
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

// Parse argv into { projectDir, out, pages, cli }. `pages` is "all" or a string[].
// Unknown flags are reported; missing flag values fail fast.
function parseArgs(argv) {
  let projectDir = null;
  let out = null;
  let pages = 'all';
  let cli = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') {
      out = argv[++i];
      if (out == null) throw new Error('--out requires a directory path');
    } else if (arg === '--pages') {
      const val = argv[++i];
      if (val == null) throw new Error('--pages requires "all" or a comma-separated list');
      pages = val === 'all' ? 'all' : val.split(',').map((p) => p.trim()).filter(Boolean);
    } else if (arg === '--cli') {
      cli = argv[++i];
      if (cli == null) throw new Error('--cli requires a path to the DevTools CLI');
    } else if (arg.startsWith('--')) {
      throw new Error(`unknown flag: ${arg}`);
    } else if (projectDir == null) {
      projectDir = arg;
    } else {
      throw new Error(`unexpected argument: ${arg}`);
    }
  }

  if (!projectDir) throw new Error('missing <projectDir>');
  return { projectDir, out, pages, cli };
}

// Read app.json and return its pages[]. Errors (no app.json / unparseable / empty
// pages) print an actionable message and exit 1.
function loadPages(root) {
  const appPath = path.join(root, 'app.json');
  if (!exists(appPath)) {
    console.error(`app.json not found at ${appPath} — point <projectDir> at the Mini Program project root.`);
    process.exit(1);
  }
  let app;
  try {
    app = JSON.parse(readText(appPath));
  } catch (e) {
    console.error(`Cannot parse app.json: ${e.message}`);
    process.exit(1);
  }
  const pages = Array.isArray(app.pages) ? app.pages.filter((p) => typeof p === 'string') : [];
  if (pages.length === 0) {
    console.error('app.json lists no pages — nothing to capture.');
    process.exit(1);
  }
  return pages;
}

// Resolve which pages to capture from --pages. Unknown entries warn and are skipped.
// Exits 1 if the selection leaves nothing to capture.
function selectPages(allPages, requested) {
  if (requested === 'all') return allPages;
  const known = new Set(allPages);
  const targets = [];
  for (const p of requested) {
    if (known.has(p)) targets.push(p);
    else console.warn(`⚠ --pages: "${p}" is not in app.json pages — skipping`);
  }
  if (targets.length === 0) {
    console.error('None of the requested --pages match app.json pages — nothing to capture.');
    process.exit(1);
  }
  return targets;
}

// Resolve the DevTools CLI path: --cli, then $WX_DEVTOOLS_CLI, then the macOS default.
// If the resolved path is missing on disk, print install/enable guidance and exit 1.
function resolveCliPath(cliArg) {
  const cliPath = cliArg || process.env.WX_DEVTOOLS_CLI || DEFAULT_CLI;
  if (!exists(cliPath)) {
    console.error(`WeChat DevTools CLI not found at ${cliPath}.`);
    console.error('  Fix one of the following:');
    console.error('  • Install WeChat DevTools (微信开发者工具).');
    console.error('  • Enable 设置 → 安全设置 → CLI/HTTP 调用 (the service the CLI talks to).');
    console.error('  • Pass --cli <path>, or set WX_DEVTOOLS_CLI to the cli binary.');
    process.exit(1);
  }
  return cliPath;
}

// Lazy-load miniprogram-automator from the demo project. Missing dependency prints
// an install hint and exits 1.
async function loadAutomator() {
  let mod;
  try {
    mod = await import('miniprogram-automator');
  } catch {
    console.error('miniprogram-automator is not installed.');
    console.error('  Run `npm i -D miniprogram-automator` in the demo project to enable live capture.');
    process.exit(1);
  }
  return mod.default || mod;
}

// page path → screen slug (basename used for ref/impl pairing).
function slugFor(page) {
  return page.replaceAll('/', '-');
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`Usage: node capture-miniprogram.mjs <projectDir> [--out <dir>] [--pages all|p1,p2,...] [--cli <path>]`);
    console.error(`  ${e.message}`);
    process.exit(1);
  }

  const root = path.resolve(args.projectDir);
  if (!exists(root) || !fs.statSync(root).isDirectory()) {
    console.error(`Not a directory: ${root}`);
    process.exit(1);
  }

  const allPages = loadPages(root);
  const targets = selectPages(allPages, args.pages);
  const cliPath = resolveCliPath(args.cli);
  const automator = await loadAutomator();

  const outDir = args.out ? path.resolve(args.out) : path.join(root, '.conform', 'impl');
  fs.mkdirSync(outDir, { recursive: true });

  let mp;
  const captured = [];
  try {
    mp = await automator.launch({ projectPath: root, cliPath });
    for (const page of targets) {
      const slug = slugFor(page);
      await mp.reLaunch('/' + page);
      await mp.screenshot({ path: path.join(outDir, slug + '.png') });
      captured.push({ slug, page });
    }
  } catch (e) {
    console.error(`Capture failed: ${e.message}`);
    console.error('  This is either an env/port issue OR a real compile error — open the project in WeChat DevTools to check.');
    try { if (mp) await mp.close(); } catch { /* ignore */ }
    process.exit(1);
  } finally {
    try { if (mp) await mp.close(); } catch { /* ignore */ }
  }

  console.log(`Captured ${captured.length} screen(s) → ${outDir}`);
  for (const { slug, page } of captured) {
    console.log(`  ${slug}.png  ←  /${page}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(`capture crashed: ${e.message}`);
  process.exit(2);
});
