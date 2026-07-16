#!/usr/bin/env node

/**
 * Generate the Mini Program's token block from the product profile's tokens.css.
 *
 * The profile owns its design system in every technology it targets, and
 * tokens.css is the single source of truth for the values (ADR 0004). This
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

const BEGIN = '/* GENERATED FROM profile/tokens.css — do not edit by hand. */';
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

// Which profile tokens the Mini Program template actually consumes, and the
// unprefixed WXSS name each maps to. Add a row here when the template needs a
// new token — never paste a literal into app.wxss.
const EXPORTS = [
  ['--theme-500', '--wld-theme-500'],
  ['--theme-100', '--wld-theme-100'],
  ['--theme-600', '--wld-theme-600'],
  ['--danger-500', '--wld-danger-500'],
  ['--text-primary', '--wld-text-primary'],
  ['--text-secondary', '--wld-text-secondary'],
  ['--text-tertiary', '--wld-text-tertiary'],
  ['--text-on-theme', '--wld-text-on-theme'],
  ['--surface', '--wld-surface'],
  ['--bg', '--wld-bg'],
  ['--divider', '--wld-divider'],
  ['--radius-pill', '--wld-radius-pill'],
  ['--radius-card', '--wld-radius-card'],
];

function buildBlock(decls) {
  const lines = [BEGIN, 'page {'];
  for (const [wxssName, tokenName] of EXPORTS) {
    if (!(tokenName in decls)) continue;
    lines.push(`  ${wxssName}: ${resolveValue(decls[tokenName], decls)};`);
  }
  const fontFamily = decls['--wld-font-family']
    ? resolveValue(decls['--wld-font-family'], decls).replace(/\s+/g, ' ')
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
  const out = path.resolve(arg('out', path.join(profileDir, 'miniprogram', 'template', 'app.wxss')));

  const decls = parseTokens(fs.readFileSync(path.join(profileDir, 'tokens.css'), 'utf8'));
  const block = buildBlock(decls);

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
