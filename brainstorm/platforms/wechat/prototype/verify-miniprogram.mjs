#!/usr/bin/env node

/**
 * WeChat Mini Program demo verifier.
 *
 * Usage:
 *   node verify-miniprogram.mjs <projectDir>
 *
 * Two layers:
 *   1. STATIC (always runs, zero dependencies, no network, no DevTools):
 *      - app.json parses and lists pages
 *      - every page has .wxml / .js / .json (.wxss warned if missing)
 *      - every `usingComponents` path (app + pages + components, recursively)
 *        resolves to real component files
 *      - tabBar pages exist in `pages`; tabBar icon files exist
 *      - .wxml uses Mini Program tags, not web tags (<div>/<span>/<img>/…)
 *      - .wxss does not use `100vh` inside the custom page wrapper
 *      - .js does not call browser-only globals (document/window/localStorage)
 *   2. LIVE (best-effort, optional): if `miniprogram-automator` is installed AND
 *      the WeChat DevTools CLI is found, launch the project (a real compile) and
 *      screenshot the first page. Missing tooling is reported, never fatal.
 *
 * Exit code is non-zero only when STATIC errors are found.
 */

import fs from 'node:fs';
import path from 'node:path';

// --- Mini Program built-in tags (no registration needed). ---------------------
const BUILTIN_TAGS = new Set([
  'view', 'scroll-view', 'swiper', 'swiper-item', 'movable-area', 'movable-view',
  'cover-view', 'cover-image', 'text', 'rich-text', 'progress', 'button', 'checkbox',
  'checkbox-group', 'form', 'input', 'label', 'picker', 'picker-view',
  'picker-view-column', 'radio', 'radio-group', 'slider', 'switch', 'textarea',
  'navigator', 'functional-page-navigator', 'image', 'video', 'camera', 'live-player',
  'live-pusher', 'map', 'canvas', 'open-data', 'web-view', 'ad', 'official-account',
  'block', 'slot', 'template', 'import', 'include', 'wxs', 'navigation-bar',
  'page-meta', 'match-media', 'root-portal', 'share-element', 'voip-room',
]);

// Web-only tags that do not render in a Mini Program.
const WEB_ONLY_TAGS = [
  'div', 'span', 'p', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'section', 'header', 'footer', 'nav', 'table', 'tr', 'td', 'th', 'img', 'br', 'hr',
  'main', 'article', 'aside', 'select', 'option',
];

const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function loadJson(file, label) {
  try {
    return JSON.parse(readText(file));
  } catch (e) {
    err(`${label}: cannot parse JSON (${e.message})`);
    return null;
  }
}

function exists(p) {
  return fs.existsSync(p);
}

// Resolve a `usingComponents` value to an extensionless base path.
// Absolute ("/components/x") is relative to the project root; otherwise relative
// to the directory of the declaring file. Bare npm refs are reported, not resolved.
function resolveComponentBase(ref, declaringDir, root) {
  if (ref.startsWith('/')) return { base: path.join(root, ref), npm: false };
  if (ref.startsWith('./') || ref.startsWith('../')) {
    return { base: path.resolve(declaringDir, ref), npm: false };
  }
  return { base: null, npm: true };
}

// Check that a component/page base has its required files. Returns the parsed
// .json (or null). `kind` is "page" or "component" for messages.
function checkUnitFiles(base, kind, rel) {
  let ok = true;
  for (const ext of ['.json', '.wxml', '.js']) {
    if (!exists(base + ext)) {
      err(`${kind} "${rel}" is missing ${path.basename(base + ext)}`);
      ok = false;
    }
  }
  if (!exists(base + '.wxss')) warn(`${kind} "${rel}" has no .wxss (optional, but most ${kind}s style themselves)`);
  if (!ok || !exists(base + '.json')) return null;
  return loadJson(base + '.json', `${kind} ${rel}.json`);
}

function customTagsInWxml(wxmlPath) {
  const text = readText(wxmlPath);
  const tags = new Set();
  for (const m of text.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)[\s/>]/g)) {
    tags.add(m[1].toLowerCase());
  }
  return tags;
}

function scanWxmlForWebTags(wxmlPath, rel) {
  const text = readText(wxmlPath);
  for (const tag of WEB_ONLY_TAGS) {
    const re = new RegExp(`<${tag}[\\s/>]`, 'i');
    if (re.test(text)) {
      err(`${rel}: uses web-only tag <${tag}> — Mini Program needs <view>/<text>/<image>/<navigator> instead`);
    }
  }
}

// Flag 100vh in containers wrapped inside the profile's page shell. Globally
// registered shell components may own 100vh and are exempted by the caller.
function scanWxssFor100vh(wxssPath, rel) {
  const lines = readText(wxssPath).split('\n');
  lines.forEach((line, i) => {
    if (/100vh/.test(line) && !line.trim().startsWith('/*')) {
      warn(`${rel}:${i + 1}: a container inside the page shell uses 100vh — use height:100% (the shell already owns the viewport height, nav offset, and safe area; 100vh overflows it)`);
    }
  });
}

function scanJsForWebGlobals(jsPath, rel) {
  const lines = readText(jsPath).split('\n');
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '');
    if (/\b(document|localStorage|sessionStorage)\b\s*\./.test(code) || /\bwindow\s*\./.test(code)) {
      warn(`${rel}:${i + 1}: references a browser-only global (document/window/localStorage) — use Mini Program (wx.*) APIs instead`);
    }
  });
}

// Walk a unit (page or component): verify files, then recurse into its
// usingComponents. `availableTags` accumulates registered component tag names.
function walkUnit(base, kind, rel, root, visited) {
  if (visited.has(base)) return;
  visited.add(base);

  const json = checkUnitFiles(base, kind, rel);
  const dir = path.dirname(base);
  const using = (json && json.usingComponents) || {};
  const registered = new Set(Object.keys(using).map((k) => k.toLowerCase()));

  if (exists(base + '.wxml')) {
    scanWxmlForWebTags(base + '.wxml', rel + '.wxml');
    // Unregistered custom-component tags (heuristic, warning only).
    for (const tag of customTagsInWxml(base + '.wxml')) {
      if (BUILTIN_TAGS.has(tag)) continue;
      if (!tag.includes('-')) continue; // plain unknown tags are likely typos elsewhere
      if (!registered.has(tag) && !GLOBAL_COMPONENTS.has(tag)) {
        warn(`${rel}.wxml: <${tag}> is not declared in usingComponents (here or app.json)`);
      }
    }
  }
  if (exists(base + '.wxss') && !globalShellBases.has(base)) {
    scanWxssFor100vh(base + '.wxss', rel + '.wxss');
  }
  if (exists(base + '.js')) scanJsForWebGlobals(base + '.js', rel + '.js');

  for (const [name, ref] of Object.entries(using)) {
    const { base: cBase, npm } = resolveComponentBase(ref, dir, root);
    if (npm) {
      warn(`${rel}: component "${name}" -> "${ref}" looks like an npm package component (not statically verified)`);
      continue;
    }
    const cRel = path.relative(root, cBase) || ref;
    walkUnit(cBase, 'component', cRel, root, visited);
  }
}

// Globally-registered components (from app.json) are usable in every wxml.
const GLOBAL_COMPONENTS = new Set();
// Resolved bases of those global components — including the profile's page shell,
// which legitimately uses 100vh, so the 100vh check is skipped for them.
const globalShellBases = new Set();

async function liveVerify(projectPath, firstPagePath) {
  let mod;
  try {
    mod = await import('miniprogram-automator');
  } catch {
    return { status: 'skipped', detail: 'miniprogram-automator not installed — run `npm i -D miniprogram-automator` and install WeChat DevTools to enable a real compile + screenshot' };
  }
  const automator = mod.default || mod;
  const cliPath = process.env.WX_DEVTOOLS_CLI
    || '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';
  if (!exists(cliPath)) {
    return { status: 'skipped', detail: `WeChat DevTools CLI not found at ${cliPath} — set WX_DEVTOOLS_CLI, install DevTools, and enable 设置 → 安全设置 → CLI/HTTP 调用` };
  }
  try {
    const mp = await automator.launch({ projectPath, cliPath });
    let shot = null;
    try {
      if (typeof mp.screenshot === 'function') {
        shot = path.join(projectPath, '.verify-screenshot.png');
        await mp.screenshot({ path: shot });
      }
    } catch { /* screenshot is best-effort */ }
    try { await mp.close(); } catch { /* ignore */ }
    return { status: 'ok', detail: shot ? `compiled in DevTools; screenshot → ${shot}` : 'compiled and launched in DevTools' };
  } catch (e) {
    return { status: 'failed', detail: `DevTools launch failed: ${e.message}. This is either an env/port issue OR a real compile error — open the project in WeChat DevTools to check.` };
  }
}

async function main() {
  const projectArg = process.argv[2];
  if (!projectArg) {
    console.error('Usage: node verify-miniprogram.mjs <projectDir>');
    process.exitCode = 2;
    return;
  }
  const root = path.resolve(projectArg);
  if (!exists(root) || !fs.statSync(root).isDirectory()) {
    console.error(`Not a directory: ${root}`);
    process.exitCode = 2;
    return;
  }

  const appPath = path.join(root, 'app.json');
  if (!exists(appPath)) {
    err('app.json not found at project root');
  }
  const app = exists(appPath) ? loadJson(appPath, 'app.json') : null;

  // project.config.json
  const pcfgPath = path.join(root, 'project.config.json');
  if (!exists(pcfgPath)) warn('project.config.json not found (needed to import into WeChat DevTools)');
  else {
    const pcfg = loadJson(pcfgPath, 'project.config.json');
    if (pcfg && !pcfg.appid) warn('project.config.json has no "appid" (use a 测试号 / test AppID in DevTools)');
  }

  const visited = new Set();

  if (app) {
    // Global components.
    for (const [name, ref] of Object.entries(app.usingComponents || {})) {
      GLOBAL_COMPONENTS.add(name.toLowerCase());
      const { base, npm } = resolveComponentBase(ref, root, root);
      if (npm) { warn(`app.json: global component "${name}" -> "${ref}" is an npm component (not verified)`); continue; }
      globalShellBases.add(base);
      walkUnit(base, 'component', path.relative(root, base) || ref, root, visited);
    }

    // Pages.
    const pages = Array.isArray(app.pages) ? app.pages : [];
    if (pages.length === 0) err('app.json lists no pages');
    let firstPage = null;
    for (const page of pages) {
      const base = path.join(root, page);
      if (!firstPage) firstPage = page;
      walkUnit(base, 'page', page, root, visited);
    }

    // tabBar.
    const tabs = app.tabBar && Array.isArray(app.tabBar.list) ? app.tabBar.list : [];
    for (const tab of tabs) {
      if (tab.pagePath && !pages.includes(tab.pagePath)) {
        err(`tabBar page "${tab.pagePath}" is not in app.json "pages"`);
      }
      for (const iconKey of ['iconPath', 'selectedIconPath']) {
        if (tab[iconKey] && !exists(path.join(root, tab[iconKey]))) {
          warn(`tabBar ${iconKey} "${tab[iconKey]}" file not found`);
        }
      }
    }

    // --- Live (optional) ---
    const live = await liveVerify(root, firstPage);
    report(live);
    return;
  }

  report({ status: 'skipped', detail: 'app.json invalid — live verification not attempted' });
}

function report(live) {
  console.log('='.repeat(72));
  console.log('Mini Program demo verification');
  console.log('='.repeat(72));

  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}, non-fatal):`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
  if (errors.length) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) console.log(`  ✗ ${e}`);
  }

  const liceLabel = { ok: '✓ ran', skipped: '– skipped', failed: '✗ failed' }[live.status] || live.status;
  console.log(`\nLive compile (miniprogram-automator): ${liceLabel}`);
  console.log(`  ${live.detail}`);

  console.log('');
  if (errors.length === 0) {
    console.log(`Static verification PASSED (${warnings.length} warning(s)).`);
    process.exitCode = 0;
  } else {
    console.log(`Static verification FAILED: ${errors.length} error(s), ${warnings.length} warning(s).`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(`verifier crashed: ${e.message}`);
  process.exitCode = 2;
});
