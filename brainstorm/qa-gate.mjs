#!/usr/bin/env node

/**
 * WLD Brainstorm QA Gate
 *
 * Deterministic checker for generated brainstorm screen HTML. Codifies the
 * mechanical checks of the SKILL.md "Pre-user QA gate" and Common Mistakes
 * table so they are enforced (and measurable) instead of self-assessed.
 *
 * Usage:
 *   node qa-gate.mjs [--json] [--assets <dir>] <file-or-dir> [...]
 *
 * Accepts full page-template documents (generated screens) and bare
 * .wld-page fragments (production templates). Exit code 1 when any
 * error-severity finding exists; warnings never fail the gate.
 *
 * Judgment checks that need eyes (overflow, copy tone, legal text retention)
 * stay in SKILL.md — this gate only automates what is mechanically checkable.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEVERITY = {
  'missing-stylesheet': 'error', // required design-system stylesheets not linked
  'no-phone-mockup': 'error', // screen not wrapped in .phone-mockup/.phone-screen
  'no-wld-page': 'error', // no .wld-page at all — invented outside the design system
  'custom-js': 'error', // screens must be static (unless the user asked for JS)
  'no-wechat-chrome': 'error', // missing <wld-wechat-chrome> placeholder
  'handmade-chrome': 'error', // hand-built navbar/capsule markup
  'bg-mismatch': 'error', // home/inner background rules violated
  'urgency-copy': 'error', // pressure language is banned in WLD
  'generic-font': 'error', // font-family must go through var(--wld-font-*)
  'token-color': 'error', // hardcoded literal that equals a --wld-* token value
  'white-on-gold': 'error', // text on gold is always rgba(0,0,0,0.9)
  'square-button': 'error', // wld buttons are always pill-shaped
  'manual-frame-styles': 'warning', // server injects frame styles automatically
  'multi-gold-cta': 'warning', // >1 gold CTA (dual-offer home is a known exception)
  'nontoken-color': 'warning', // off-palette literal (bank logos may be legitimate)
  'thick-border': 'warning', // borders >= 2px are off-system
  'emoji': 'warning', // WLD does not use emoji
  'amount-weight': 'warning', // 44px amounts use weight 500, not 600
  'thousands-separator': 'warning', // production writes ¥60000, never ¥60,000
};

const URGENCY_RE = /立即领取|秒杀|限时抢|马上抢|仅剩|手慢无|倒计时|抢购/g;
const WHITE_VALUE_RE = /#fff\b|#ffffff\b|(?<![-\w])white(?![-\w])|rgba?\(\s*255\s*,\s*255\s*,\s*255/i;
const GOLD_BG_RE = /background[^;:]*:\s*[^;]*(#ffd143|var\(--wld-theme-500\)|var\(--wld-btn-primary-bg\))/i;
const WHITE_BG_RE = /background[^;:]*:\s*[^;]*(var\(--wld-surface\)|#fff\b|#ffffff\b|(?<![-\w])white(?![-\w])|rgba?\(\s*255\s*,\s*255\s*,\s*255)/i;
const COLOR_LITERAL_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
const PILL_RADIUS_RE = /^(999px|50%|var\(--wld-radius-pill\))$/;
// Production uses plain ✓/arrows in SVGs; only proper pictographs are flagged.
const EMOJI_ALLOWLIST = new Set(['✓', '✔', '✕', '✗', '→', '←', '·', '↑', '↓']);

// ---- Small text utilities (conventions shared with scripts/validate-plugin.mjs) ----

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

// ---- Token map from tokens.css ----

function buildTokenValueMap(profileDir) {
  const css = fs.readFileSync(path.join(profileDir, 'tokens.css'), 'utf8');
  const map = new Map();
  // Prefix-agnostic on purpose: each profile owns its own token prefix, so this
  // matches any custom property rather than a hardcoded --wld-. See ADR 0004.
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

// CSS classes use `-` freely (wld-page vs wld-page-body), so \b is unsafe:
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

// ---- Screen segmentation (one segment per .wld-page) ----

function segmentScreens(cleaned) {
  const pages = elementsWithClass(cleaned, 'wld-page');
  return pages.map((page, i) => ({
    index: i + 1,
    start: page.start,
    openTag: page.openTag,
    text: cleaned.slice(page.start, i + 1 < pages.length ? pages[i + 1].start : cleaned.length),
  }));
}

function findBorrowTab(segmentText) {
  const itemRe = /<(button|div)\b[^>]*class\s*=\s*"([^"]*\bwld-tabbar-item\b[^"]*)"[^>]*>/g;
  const items = [];
  let match;
  while ((match = itemRe.exec(segmentText)) !== null) {
    items.push({ cls: match[2], start: match.index });
  }
  for (let i = 0; i < items.length; i += 1) {
    const end = i + 1 < items.length ? items[i + 1].start : Math.min(items[i].start + 400, segmentText.length);
    if (segmentText.slice(items[i].start, end).includes('借钱')) return items[i];
  }
  return null;
}

// ---- Per-file check runner ----

function checkFile(file, tokenMap) {
  const raw = fs.readFileSync(file, 'utf8');
  const cleaned = stripHtmlComments(raw);
  const findings = [];
  const add = (code, message, index) => {
    findings.push({ code, severity: SEVERITY[code], message, line: lineNumberAt(cleaned, index ?? 0) });
  };

  const isFullDoc = /<html[\s>]/i.test(cleaned);
  const contexts = extractCssContexts(cleaned);
  const screens = segmentScreens(cleaned);

  // -- Shell checks (generated page-template documents only) --
  if (isFullDoc) {
    for (const sheet of ['tokens.css', 'components.css', 'phone-mockup.css']) {
      if (!new RegExp(`<link[^>]*href\\s*=\\s*"[^"]*${sheet}`, 'i').test(cleaned)) {
        add('missing-stylesheet', `required stylesheet ${sheet} is not linked`);
      }
    }
    const phoneScreenCount = elementsWithClass(cleaned, 'phone-screen').length;
    if (screens.length > 0 && phoneScreenCount < screens.length) {
      add('no-phone-mockup', `${screens.length} .wld-page screen(s) but only ${phoneScreenCount} .phone-screen wrapper(s) — always wrap screens in .phone-mockup > .phone-screen`, screens[0].start);
    }
  }

  const scriptMatch = cleaned.match(/<script\b/i);
  if (scriptMatch) {
    add('custom-js', 'authored <script> found — screens must be static (server injects its own helper); only allowed if the user explicitly asked for interactivity', cleaned.indexOf(scriptMatch[0]));
  }

  for (const ctx of contexts) {
    if (ctx.selector && /\.frame-/.test(ctx.selector)) {
      add('manual-frame-styles', `rule "${ctx.selector}" duplicates frame styles — the server injects them from frame-template.html`, ctx.start);
      break;
    }
  }

  if (screens.length === 0) {
    add('no-wld-page', 'no .wld-page found — screen was invented outside the WLD design system; copy from profile/screens/ templates');
  }

  // -- Per-screen checks --
  for (const screen of screens) {
    const chromeMatch = screen.text.match(/<wld-wechat-chrome\b[^>]*>/i);
    if (!chromeMatch) {
      add('no-wechat-chrome', `screen ${screen.index}: missing <wld-wechat-chrome> placeholder`, screen.start);
    }
    const handmade = screen.text.match(/class\s*=\s*"[^"]*\bwld-(navbar|capsule)/);
    if (handmade) {
      add('handmade-chrome', `screen ${screen.index}: hand-built WeChat chrome markup (.wld-${handmade[1]}) — use the <wld-wechat-chrome> placeholder instead`, screen.start + handmade.index);
    }

    const goldCtas = elementsWithClass(screen.text, 'wld-btn-primary').length
      + elementsWithClass(screen.text, 'wld-btn-circle').length;
    if (goldCtas > 1) {
      add('multi-gold-cta', `screen ${screen.index}: ${goldCtas} gold CTAs — one primary gold action per screen (dual-offer home cards are the known exception)`, screen.start);
    }

    if (chromeMatch) {
      const variant = /(?:variant|type)\s*=\s*"home"/i.test(chromeMatch[0]) ? 'home' : 'inner';
      const borrowTab = findBorrowTab(screen.text);
      const pageForcedWhite = WHITE_BG_RE.test(screen.openTag)
        || contexts.some((ctx) => ctx.selector && /(^|[\s,])[.#][\w-]*wld-page/.test(ctx.selector) && WHITE_BG_RE.test(ctx.body));
      if (variant === 'home' && borrowTab && !borrowTab.cls.includes('--inactive')) {
        if (!pageForcedWhite && !WHITE_BG_RE.test(screen.text)) {
          add('bg-mismatch', `screen ${screen.index}: borrow-tab home screen without a white background — home screens use #FFFFFF (var(--wld-surface))`, screen.start);
        }
      } else if (variant === 'inner' && pageForcedWhite) {
        add('bg-mismatch', `screen ${screen.index}: inner screen forces white on .wld-page — inner pages keep the default #F5F5F5`, screen.start);
      }
    }
  }

  // -- Copy / text checks (whole document) --
  let match;
  URGENCY_RE.lastIndex = 0;
  while ((match = URGENCY_RE.exec(cleaned)) !== null) {
    add('urgency-copy', `banned urgency copy "${match[0]}" — WLD never pressures borrowing`, match.index);
  }
  const emojiRe = /\p{Extended_Pictographic}/gu;
  while ((match = emojiRe.exec(cleaned)) !== null) {
    if (EMOJI_ALLOWLIST.has(match[0])) continue;
    add('emoji', `emoji "${match[0]}" — WLD does not use emoji; use the SVG icon set`, match.index);
  }
  const separatorRe = /¥\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?/g;
  while ((match = separatorRe.exec(cleaned)) !== null) {
    add('thousands-separator', `"${match[0]}" — production amounts never use thousands separators (write ${match[0].replace(/,/g, '')})`, match.index);
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
        add('nontoken-color', `off-palette color ${match[0]} — no matching --wld-* token`, ctx.start + match.index);
      }
    }

    const fontRe = /font-family\s*:\s*([^;"}]+)/gi;
    while ((match = fontRe.exec(ctx.body)) !== null) {
      if (!match[1].includes('var(--wld-font')) {
        add('generic-font', `font-family "${match[1].trim()}" — use var(--wld-font-family) or var(--wld-font-number)`, ctx.start + match.index);
      }
    }

    const borderRe = /(?:^|[;{\s])border(?:-(?:top|right|bottom|left))?(?:-width)?\s*:\s*(\d+(?:\.\d+)?)px/gi;
    while ((match = borderRe.exec(ctx.body)) !== null) {
      if (parseFloat(match[1]) >= 2) {
        add('thick-border', `${match[1]}px border — WLD avoids borders >= 2px`, ctx.start + match.index);
      }
    }

    if (/(font-size\s*:\s*44px|var\(--wld-text-numbers\))/.test(ctx.body) && /font-weight\s*:\s*600/.test(ctx.body)) {
      add('amount-weight', '44px amount at font-weight 600 — large amounts use weight 500', ctx.start);
    }

    const isGoldElement = ctx.element && /\bwld-btn-(primary|circle)\b/.test(ctx.element.cls);
    const colorMatch = ctx.body.match(/(?:^|[;{\s])color\s*:\s*([^;}]+)/i);
    const hasWhiteText = colorMatch && WHITE_VALUE_RE.test(colorMatch[1]);
    if (hasWhiteText && (isGoldElement || GOLD_BG_RE.test(ctx.body))) {
      add('white-on-gold', 'white text on a gold surface — text on gold is always rgba(0,0,0,0.9)', ctx.start);
    }

    const isButtonCtx = (ctx.element && /\bwld-btn\b/.test(ctx.element.cls)) || (ctx.selector && /wld-btn/.test(ctx.selector));
    if (isButtonCtx) {
      const radiusMatch = ctx.body.match(/border-radius\s*:\s*([^;}]+)/i);
      if (radiusMatch && !PILL_RADIUS_RE.test(radiusMatch[1].trim())) {
        add('square-button', `button border-radius ${radiusMatch[1].trim()} — WLD buttons are always pill-shaped (999px)`, ctx.start);
      }
    }
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

function main() {
  const argv = process.argv.slice(2);
  const targets = [];
  let json = false;
  let profileDir = path.resolve(__dirname, 'profile');
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') json = true;
    else if (argv[i] === '--profile') profileDir = path.resolve(argv[++i]);
    else targets.push(argv[i]);
  }
  if (targets.length === 0) {
    console.error('Usage: node qa-gate.mjs [--json] [--profile <dir>] <file-or-dir> [...]');
    process.exitCode = 2;
    return;
  }

  const tokenMap = buildTokenValueMap(profileDir);
  const files = targets.flatMap(collectHtmlFiles);
  const results = files.map((file) => checkFile(file, tokenMap));
  const errors = results.reduce((n, r) => n + r.errors, 0);
  const warnings = results.reduce((n, r) => n + r.warnings, 0);

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
