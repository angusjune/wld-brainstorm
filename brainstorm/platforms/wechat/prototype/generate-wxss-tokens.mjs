#!/usr/bin/env node

/**
 * Generate the Mini Program's token block from the product profile's
 * design-system/tokens.css.
 *
 * The profile owns its design system in every technology it targets, and
 * design-system/tokens.css is the single source of truth for the values (ADR 0004). This
 * script exists because the alternative -- hand-maintaining the same palette in
 * WXSS -- is what let the two libraries drift apart: app.wxss had gold as
 * #ffcd00 while tokens.css had #FFD143, and a system-ui font stack while the
 * profile specified PingFang SC. Nobody decided that; it rotted.
 *
 * Writes the block between the GENERATED markers in the target app.wxss and
 * leaves everything else alone.
 *
 * Usage:
 *   node generate-wxss-tokens.mjs [--profile <dir>] [--out <app.wxss>] [--check]
 *
 *   --check  exit 1 if the file is stale instead of rewriting it (for CI/tests)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, '..', '..', '..');

const BEGIN = '/* GENERATED FROM profile/design-system/tokens.css — do not edit by hand. */';
const END = '/* END GENERATED */';

// Resolve var() chains so the WXSS block carries literal values: Mini Program
// custom properties work, but a reference to a token we did not emit would
// silently resolve to nothing.
function resolveValue(value, decls, seen = new Set()) {
  return value.replace(/var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]*))?\)/gi, (whole, name, fallback) => {
    if (seen.has(name)) return fallback ?? whole;
    if (!(name in decls)) return fallback ?? whole;
    return resolveValue(decls[name], decls, new Set([...seen, name]));
  }).trim();
}

function parseTokens(tokensCss) {
  const decls = {};
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(tokensCss)) !== null) decls[m[1]] = m[2].trim();
  return decls;
}

function readProfileConfig(profileDir) {
  const text = fs.readFileSync(path.join(profileDir, 'PROFILE.md'), 'utf8');
  const block = text.match(/^---\n([\s\S]*?)\n---/);
  const config = {};
  for (const line of (block ? block[1] : '').split('\n')) {
    const match = line.match(/^([\w-]+):\s*(.*)$/);
    if (match) config[match[1]] = match[2].trim();
  }
  return config;
}

// Which semantic profile tokens the Mini Program template consumes, and the
// unprefixed WXSS name each maps to. Product profiles may choose any prefix;
// lookup is by semantic suffix so the platform pack stays product-neutral.
const EXPORTS = [
  ['--theme-500', 'theme-500'],
  ['--theme-100', 'theme-100'],
  ['--theme-600', 'theme-600'],
  ['--danger-500', 'danger-500'],
  ['--text-primary', 'text-primary'],
  ['--text-secondary', 'text-secondary'],
  ['--text-tertiary', 'text-tertiary'],
  ['--text-on-theme', 'text-on-theme'],
  ['--surface', 'surface'],
  ['--bg', 'bg'],
  ['--divider', 'divider'],
  ['--radius-pill', 'radius-pill'],
  ['--radius-card', 'radius-card'],
];

function findSemanticToken(decls, semanticName, tokenPrefix) {
  const preferred = tokenPrefix && `--${tokenPrefix}-${semanticName}`;
  if (preferred && preferred in decls) return preferred;
  const unprefixed = `--${semanticName}`;
  if (unprefixed in decls) return unprefixed;
  const suffix = `-${semanticName}`;
  const matches = Object.keys(decls).filter((name) => name.endsWith(suffix));
  if (matches.length > 1) {
    throw new Error(`ambiguous semantic token "${semanticName}": ${matches.join(', ')}`);
  }
  return matches[0] || null;
}

function buildBlock(decls, tokenPrefix) {
  const lines = [BEGIN, 'page {'];
  for (const [wxssName, semanticName] of EXPORTS) {
    const tokenName = findSemanticToken(decls, semanticName, tokenPrefix);
    if (!tokenName) continue;
    lines.push(`  ${wxssName}: ${resolveValue(decls[tokenName], decls)};`);
  }
  const fontFamilyToken = findSemanticToken(decls, 'font-family', tokenPrefix);
  const fontFamily = fontFamilyToken
    ? resolveValue(decls[fontFamilyToken], decls).replace(/\s+/g, ' ')
    : null;
  if (fontFamily) lines.push(`  font-family: ${fontFamily};`);
  lines.push('  color: var(--text-primary);');
  lines.push('  min-height: 100vh;');
  lines.push('}');
  lines.push(END);
  return lines.join('\n');
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const check = argv.includes('--check');
  const profileDir = path.resolve(arg('profile', path.join(SKILL_DIR, 'profile')));
  const out = path.resolve(arg('out', path.join(profileDir, 'prototype', 'template', 'app.wxss')));

  if (check && !fs.existsSync(out)) {
    console.log('wxss tokens: profile has no Mini Program template — skipped');
    return;
  }

  const profile = readProfileConfig(profileDir);
  const inferredPrefix = profile.pageClass?.replace(/-page$/, '');
  const tokenPrefix = profile.tokenPrefix || inferredPrefix || '';
  const decls = parseTokens(fs.readFileSync(path.join(profileDir, 'design-system', 'tokens.css'), 'utf8'));
  const block = buildBlock(decls, tokenPrefix);

  const existing = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  const markerRe = new RegExp(`${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const next = markerRe.test(existing)
    ? existing.replace(markerRe, block)
    : `${block}\n\n${existing}`;

  if (check) {
    if (next !== existing) {
      console.error(`app.wxss token block is stale — run: node ${path.relative(SKILL_DIR, fileURLToPath(import.meta.url))}`);
      process.exit(1);
    }
    console.log('wxss tokens: up to date');
    return;
  }

  fs.writeFileSync(out, next);
  console.log(`wxss tokens: wrote ${EXPORTS.length} token(s) to ${path.relative(SKILL_DIR, out)}`);
}

main();
