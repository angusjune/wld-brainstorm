#!/usr/bin/env node

/**
 * Brainstorm QA Gate
 *
 * Deterministic checker for generated brainstorm screen HTML. Codifies the
 * mechanical checks of the SKILL.md "Pre-user QA gate" and Common Mistakes
 * table so they are enforced (and measurable) instead of self-assessed.
 *
 * Usage:
 *   node scripts/run-qa-gate.mjs [--json] [--profile <dir>] <file-or-dir> [...]
 *
 * Accepts full page-template documents (generated screens) and bare
 * page-class fragments (production templates). Exit code 1 when any
 * error-severity finding exists; warnings never fail the gate.
 *
 * Judgment checks that need eyes (overflow, copy tone, legal text retention)
 * stay in SKILL.md — this gate only automates what is mechanically checkable.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import telemetry from './lib/session-telemetry.cjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, '..');
const { EVENTS, appendSessionEvent, findSessionStateDir } = telemetry;

// Universal checks only — these hold for any product on any platform. Product
// laws (urgency copy, button shape, background rules …) live in the profile's
// optional quality/rules.mjs, so a fresh profile is not rejected on day one for failing
// to look like the profile that happens to ship here. See ADR 0005.
const CORE_SEVERITY = {
  'missing-stylesheet': 'error', // required design-system stylesheets not linked
  'no-phone-mockup': 'error', // screen not wrapped in .phone-mockup/.phone-screen
  'no-page-class': 'error', // no page class at all — invented outside the design system
  'custom-js': 'warning', // authored JS is allowed for light interaction; advisory, not a hard block
  'no-chrome': 'error', // missing <preview-chrome> placeholder
  'handmade-chrome': 'error', // hand-built chrome markup
  'generic-font': 'error', // font-family must go through a token
  'token-color': 'error', // hardcoded literal that equals a token value
  'manual-frame-styles': 'warning', // server injects frame styles automatically
  'nontoken-color': 'warning', // off-palette literal (brand logos may be legitimate)
  'emoji': 'warning', // prefer the profile's icon set over emoji
};

const COLOR_LITERAL_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
// Production uses plain ✓/arrows in SVGs; only proper pictographs are flagged.
const EMOJI_ALLOWLIST = new Set(['✓', '✔', '✕', '✗', '→', '←', '·', '↑', '↓']);
const CHROME_TAG_RE = /<preview-chrome\b[^>]*>/i;

// ---- Small text utilities (conventions shared with scripts/validate-skill.mjs) ----

function blankOut(text) {
  return text.replace(/\S/g, ' ');
}

function stripHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, blankOut);
}

function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, blankOut);
}

// var(--x, <fallback>) fallbacks and --name: definitions define colors, not use them.
function maskNonConsumingColors(text) {
  let out = text.replace(/var\(\s*--[a-z0-9-]+\s*,\s*([^)]*)\)/gi, (whole) => whole.replace(/[^\s,()]/g, ' '));
  out = out.replace(/(--[a-z0-9-]+\s*:)([^;]*)/gi, (whole, name, value) => name + blankOut(value));
  return out;
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

function normalizeColor(value) {
  let v = value.trim().toLowerCase().replace(/\s+/g, '');
  const short = v.match(/^#([0-9a-f]{3,4})$/);
  if (short) v = `#${[...short[1]].map((c) => c + c).join('')}`;
  return v;
}

function isColorLiteral(value) {
  return /^#[0-9a-f]{3,8}$/i.test(value) || /^rgba?\([^)]*\)$/i.test(value);
}

// ---- Profile / platform / rule-pack loading ----

// The profile's machine-readable config is the frontmatter block at the top of
// profile/PROFILE.md: flat `key: value` lines between two `---` fences.
function readProfileConfig(profileDir) {
  let text = '';
  try { text = fs.readFileSync(path.join(profileDir, 'PROFILE.md'), 'utf8'); } catch {}
  const block = text.match(/^---\n([\s\S]*?)\n---/);
  const config = {};
  if (block) {
    for (const line of block[1].split('\n')) {
      const m = line.match(/^([\w-]+):\s*(.*)$/);
      if (m) config[m[1]] = m[2].trim();
    }
  }
  return config;
}

// A profile without quality/rules.mjs is valid and passes the core checks — that is the
// point: a forking team's first run must not be blocked by another product's
// laws. See ADR 0005. Rules load by convention: the file exists, or there are none.
async function loadProfileRules(profileDir) {
  const file = path.join(profileDir, 'quality', 'rules.mjs');
  if (!fs.existsSync(file)) return { severity: {}, rules: [] };
  const mod = await import(pathToFileURL(file).href);
  const pack = mod.default || mod;
  return { severity: pack.severity || {}, rules: pack.rules || [] };
}

// ---- Token map from design-system/tokens.css ----

function buildTokenValueMap(profileDir) {
  const css = fs.readFileSync(path.join(profileDir, 'design-system', 'tokens.css'), 'utf8');
  const map = new Map();
  // Prefix-agnostic on purpose: each profile owns its own token prefix, so this
  // matches any custom property rather than a hardcoded product prefix. See ADR 0004.
  const declarationRe = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let match;
  while ((match = declarationRe.exec(css)) !== null) {
    const value = match[2].trim();
    if (!isColorLiteral(value)) continue;
    const key = normalizeColor(value);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(match[1].trim());
  }
  return map;
}

// ---- CSS context extraction ----

// Returns rule-like chunks: { selector, body, start } for <style> rules and
// { element: {tag, cls}, body, start } for style="" attributes. SVG paint
// attributes (fill/stroke/font-family="") are deliberately out of scope.
function extractCssContexts(cleaned) {
  const contexts = [];
  const styleBlockRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleBlockRe.exec(cleaned)) !== null) {
    const blockStart = match.index + match[0].indexOf(match[1]);
    const blockCss = stripCssComments(match[1]);
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let rule;
    while ((rule = ruleRe.exec(blockCss)) !== null) {
      contexts.push({
        selector: rule[1].trim(),
        body: rule[2],
        start: blockStart + rule.index + rule[1].length + 1,
      });
    }
  }
  const elementRe = /<([a-zA-Z][\w-]*)\b([^>]*)>/g;
  while ((match = elementRe.exec(cleaned)) !== null) {
    const attrs = match[2];
    const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/i);
    if (!styleMatch) continue;
    const clsMatch = attrs.match(/class\s*=\s*"([^"]*)"/i);
    contexts.push({
      element: { tag: match[1], cls: clsMatch ? clsMatch[1] : '' },
      body: styleMatch[1],
      start: match.index + match[0].indexOf(styleMatch[1]),
    });
  }
  return contexts;
}

// CSS classes use `-` freely (product-page vs product-page-body), so \b is unsafe:
// match exact class-attribute tokens instead.
function elementsWithClass(cleaned, className) {
  const elementRe = /<([a-zA-Z][\w-]*)\b([^>]*)>/g;
  const found = [];
  let match;
  while ((match = elementRe.exec(cleaned)) !== null) {
    const clsMatch = match[2].match(/class\s*=\s*"([^"]*)"/i);
    if (clsMatch && clsMatch[1].split(/\s+/).includes(className)) {
      found.push({ start: match.index, openTag: match[0], cls: clsMatch[1] });
    }
  }
  return found;
}

// ---- Screen segmentation (one segment per page-class element) ----

function segmentScreens(cleaned, pageClass) {
  const pages = elementsWithClass(cleaned, pageClass);
  return pages.map((page, i) => ({
    index: i + 1,
    start: page.start,
    openTag: page.openTag,
    text: cleaned.slice(page.start, i + 1 < pages.length ? pages[i + 1].start : cleaned.length),
  }));
}

// ---- Per-file check runner ----

function checkFile(file, env) {
  const raw = fs.readFileSync(file, 'utf8');
  const cleaned = stripHtmlComments(raw);
  const findings = [];
  const { tokenMap, profile, platform, rulePack, severity } = env;
  const pageClass = profile.pageClass || 'page';
  const add = (code, message, index) => {
    findings.push({ code, severity: severity[code] || 'warning', message, line: lineNumberAt(cleaned, index ?? 0) });
  };

  const isFullDoc = /<html[\s>]/i.test(cleaned);
  const contexts = extractCssContexts(cleaned);
  const screens = segmentScreens(cleaned, pageClass);

  // The API handed to profile rules. Everything a rule needs comes through here,
  // so a rule pack never reaches into the engine's internals.
  const api = {
    add,
    profile,
    platform,
    tokenMap,
    pageClass,
    contexts,
    screens,
    text: cleaned,
    utils: { elementsWithClass, maskNonConsumingColors, normalizeColor, isColorLiteral },
  };
  const rulesIn = (scope) => rulePack.rules.filter((r) => r.scope === scope);

  // -- Shell checks (generated page-template documents only) --
  if (isFullDoc) {
    const required = ['design-system/tokens.css', 'design-system/components.css'];
    for (const sheet of required) {
      if (!new RegExp(`<link[^>]*href\\s*=\\s*"[^"]*${sheet}`, 'i').test(cleaned)) {
        add('missing-stylesheet', `required stylesheet ${sheet} is not linked`);
      }
    }
    const phoneScreenCount = elementsWithClass(cleaned, 'phone-screen').length;
    if (screens.length > 0 && phoneScreenCount < screens.length) {
      add('no-phone-mockup', `${screens.length} .${pageClass} screen(s) but only ${phoneScreenCount} .phone-screen wrapper(s) — always wrap screens in .phone-mockup > .phone-screen`, screens[0].start);
    }
  }

  const scriptMatch = cleaned.match(/<script\b/i);
  if (scriptMatch) {
    add('custom-js', 'authored <script> found — light interaction is allowed; prefer CSS-only patterns, fall back to minimal native JS. Server injects its own helper separately. Advisory only.', cleaned.indexOf(scriptMatch[0]));
  }

  for (const ctx of contexts) {
    if (ctx.selector && /\.frame-/.test(ctx.selector)) {
      add('manual-frame-styles', `rule "${ctx.selector}" duplicates preview-frame styles — the server links assets/frame.css automatically`, ctx.start);
      break;
    }
  }

  if (screens.length === 0) {
    add('no-page-class', `no .${pageClass} found — screen was invented outside the design system; copy from profile/screens/ templates`);
  }

  // -- Per-screen checks --
  // Chrome is only required when the active platform pack actually has any; a
  // chrome-less platform must not fail every screen.
  const platformHasChrome = Boolean(platform && platform.hasChrome);
  for (const screen of screens) {
    if (platformHasChrome && !CHROME_TAG_RE.test(screen.text)) {
      add('no-chrome', `screen ${screen.index}: missing <preview-chrome> placeholder`, screen.start);
    }
    const handmade = screen.text.match(/class\s*=\s*"[^"]*(chrome-(?:navbar|capsule|statusbar|titlebar))/);
    if (handmade) {
      add('handmade-chrome', `screen ${screen.index}: hand-built chrome markup (.${handmade[1]}) — use the <preview-chrome> placeholder instead`, screen.start + handmade.index);
    }
    for (const rule of rulesIn('screen')) rule.run(screen, api);
  }

  for (const rule of rulesIn('document')) rule.run({ text: cleaned, screens, contexts }, api);

  // -- Copy / text checks (whole document) --
  let match;
  const emojiRe = /\p{Extended_Pictographic}/gu;
  while ((match = emojiRe.exec(cleaned)) !== null) {
    if (EMOJI_ALLOWLIST.has(match[0])) continue;
    add('emoji', `emoji "${match[0]}" — prefer the profile's icon set`, match.index);
  }

  // -- CSS-context checks --
  for (const ctx of contexts) {
    const scannable = maskNonConsumingColors(ctx.body);
    COLOR_LITERAL_RE.lastIndex = 0;
    while ((match = COLOR_LITERAL_RE.exec(scannable)) !== null) {
      if (!isColorLiteral(match[0])) continue;
      const tokens = tokenMap.get(normalizeColor(match[0]));
      if (tokens) {
        add('token-color', `hardcodes ${match[0]}; use var(${tokens.join(' or ')})`, ctx.start + match.index);
      } else {
        add('nontoken-color', `off-palette color ${match[0]} — no matching token in tokens.css`, ctx.start + match.index);
      }
    }

    // Prefix-agnostic: any token reference is fine, a bare font stack is not.
    const fontRe = /font-family\s*:\s*([^;"}]+)/gi;
    while ((match = fontRe.exec(ctx.body)) !== null) {
      if (!/var\(\s*--/.test(match[1])) {
        add('generic-font', `font-family "${match[1].trim()}" — use a font token from tokens.css`, ctx.start + match.index);
      }
    }

    for (const rule of rulesIn('css')) rule.run(ctx, api);
  }

  findings.sort((a, b) => a.line - b.line);
  return {
    file,
    findings,
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warning').length,
  };
}

// ---- CLI ----

function collectHtmlFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs.readdirSync(target)
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.join(target, f))
    .sort();
}

async function main() {
  const qaStartedAtMs = Date.now();
  const argv = process.argv.slice(2);
  const targets = [];
  let json = false;
  let profileDir = path.join(SKILL_DIR, 'profile');
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') json = true;
    else if (argv[i] === '--profile') profileDir = path.resolve(argv[++i]);
    else targets.push(argv[i]);
  }
  if (targets.length === 0) {
    console.error('Usage: node scripts/run-qa-gate.mjs [--json] [--profile <dir>] <file-or-dir> [...]');
    process.exitCode = 2;
    return;
  }

  const profile = readProfileConfig(profileDir);
  // A platform pack is a directory holding a chrome.html; that file's presence
  // is what makes the pack contribute preview chrome.
  const platform = profile.platform
    ? {
        name: profile.platform,
        hasChrome: fs.existsSync(path.join(SKILL_DIR, 'platforms', profile.platform, 'chrome.html')),
      }
    : null;
  const rulePack = await loadProfileRules(profileDir);
  const env = {
    tokenMap: buildTokenValueMap(profileDir),
    profile,
    platform,
    rulePack,
    severity: { ...CORE_SEVERITY, ...rulePack.severity },
  };

  const files = targets.flatMap(collectHtmlFiles);
  const results = files.map((file) => checkFile(file, env));
  const errors = results.reduce((n, r) => n + r.errors, 0);
  const warnings = results.reduce((n, r) => n + r.warnings, 0);

  const sessionResults = new Map();
  for (const result of results) {
    const stateDir = findSessionStateDir(result.file);
    if (!stateDir) continue;
    if (!sessionResults.has(stateDir)) sessionResults.set(stateDir, []);
    sessionResults.get(stateDir).push(result);
  }
  for (const [stateDir, sessionResult] of sessionResults) {
    const sessionErrors = sessionResult.reduce((total, result) => total + result.errors, 0);
    const sessionWarnings = sessionResult.reduce((total, result) => total + result.warnings, 0);
    appendSessionEvent(stateDir, EVENTS.QA_COMPLETED, {
      files: sessionResult.map((result) => path.basename(result.file)),
      errors: sessionErrors,
      warnings: sessionWarnings,
      passed: sessionErrors === 0,
      durationMs: Date.now() - qaStartedAtMs,
    });
  }

  if (json) {
    console.log(JSON.stringify({ files: results, errors, warnings }, null, 2));
  } else {
    for (const result of results) {
      console.log(`${result.file}: ${result.errors} error(s), ${result.warnings} warning(s)`);
      for (const finding of result.findings) {
        console.log(`  [${finding.severity}] ${finding.code} L${finding.line}: ${finding.message}`);
      }
    }
    console.log(`\nqa-gate: ${errors} error(s), ${warnings} warning(s) across ${files.length} file(s)`);
  }
  process.exitCode = errors > 0 ? 1 : 0;
}

main();
