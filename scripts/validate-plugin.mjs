#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SKILLS = ['brainstorm', 'prototype', 'push-to-figma', 'simplify', 'find-missing-states', 'fix-details', 'beyblade-battle'];
const PROVIDERS = [
  { root: '.claude-plugin' },
  { root: 'plugins/wld-design/.codex-plugin' },
  { root: 'plugins/wld-design/.cursor-plugin' },
  { root: '.opencode' },
];
const errors = [];
const warnings = [];

// Anthropic skill-description best practice: states what the skill does AND when
// to use it, in the third person. Calibrated so all current descriptions pass.
const DESCRIPTION_MIN_LENGTH = 30;
const DESCRIPTION_MAX_LENGTH = 1024;
const DESCRIPTION_TRIGGER_CUES = ['use when', 'when', 'trigger'];

// Progressive disclosure: SKILL.md bodies stay small and references stay one level deep.
const SKILL_BODY_MAX_LINES = 500;
const REFERENCE_EXTENSIONS = ['.md', '.js', '.mjs', '.cjs', '.css', '.html', '.yaml', '.json', '.wxss'];

// Token-compliance lint: design-token enforcement for consumer files. Documented
// brand values are flagged even when they predate a matching token declaration.
const BRAND_COLOR_VALUES = [
  '#FFD143',
  'rgba(0,0,0,0.9)',
  '#F5F5F5',
  '#FFFFFF',
  '#F7852C',
  '#EE8A27',
  '#5C8EE6',
  '#FF5A4F',
];

function abs(...parts) {
  return path.join(ROOT, ...parts);
}

function warn(message) {
  warnings.push(message);
}

function fail(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function exists(...parts) {
  return fs.existsSync(abs(...parts));
}

function listForbiddenMetadata(relativeRoot) {
  const root = abs(relativeRoot);
  if (!fs.existsSync(root)) return [];

  const matches = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.name === '.DS_Store' || entry.name.startsWith('._')) {
        matches.push(path.relative(ROOT, full));
      }
    }
  };

  walk(root);
  return matches.sort();
}

function read(file) {
  return fs.readFileSync(abs(file), 'utf8');
}

function readJson(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    fail(`${file} is not valid JSON: ${error.message}`);
    return {};
  }
}

function validatePackageJson() {
  const pkg = readJson('package.json');
  assert(pkg.scripts?.build === 'node scripts/build-plugin.mjs', 'package.json must expose npm run build');
  assert(pkg.scripts?.validate === 'node scripts/validate-plugin.mjs', 'package.json must expose npm run validate');
  assert(Boolean(pkg.scripts?.test), 'package.json must expose npm test');
  assert(pkg.version === readJson('.claude-plugin/plugin.json').version, 'package.json and .claude-plugin/plugin.json versions must match');
}

function validateMarketplace() {
  const marketplace = readJson('.claude-plugin/marketplace.json');
  const entry = marketplace.plugins?.find((plugin) => plugin.name === 'wld-design');
  assert(Boolean(entry), '.claude-plugin/marketplace.json must include wld-design');
  assert(entry?.source === './', 'marketplace source must point at ./');
  assert(entry?.version === readJson('package.json').version, 'marketplace and package.json versions must match');
}

function validateCodexMarketplace() {
  const marketplace = readJson('.agents/plugins/marketplace.json');
  const entry = marketplace.plugins?.find((plugin) => plugin.name === 'wld-design');
  assert(marketplace.name === 'wld-design', 'Codex marketplace name must be wld-design');
  assert(Boolean(marketplace.interface?.displayName), 'Codex marketplace needs interface.displayName');
  assert(Boolean(entry), '.agents/plugins/marketplace.json must include wld-design');
  assert(entry?.source?.source === 'local', 'Codex marketplace source.source must be local');
  assert(entry?.source?.path === './plugins/wld-design', 'Codex marketplace source.path must point at ./plugins/wld-design');
  assert(entry?.policy?.installation === 'AVAILABLE', 'Codex marketplace installation policy must be AVAILABLE');
  assert(entry?.policy?.authentication === 'ON_INSTALL', 'Codex marketplace authentication policy must be ON_INSTALL');
  assert(entry?.category === 'Design', 'Codex marketplace category must be Design');
}

function validateCursorMarketplace() {
  const marketplace = readJson('.cursor-plugin/marketplace.json');
  const entry = marketplace.plugins?.find((plugin) => plugin.name === 'wld-design');
  assert(marketplace.name === 'wld-design-marketplace', 'Cursor marketplace name must be wld-design-marketplace');
  assert(Boolean(marketplace.metadata?.description), 'Cursor marketplace needs metadata.description');
  assert(Boolean(entry), '.cursor-plugin/marketplace.json must include wld-design');
  assert(entry?.source === './plugins/wld-design', 'Cursor marketplace source must point at ./plugins/wld-design');
}

function validateClaudeManifest(file) {
  const manifest = readJson(file);
  assert(manifest.name === 'wld-design', `${file} name must be wld-design`);
  assert(Boolean(manifest.description), `${file} needs a description`);
  assert(Boolean(manifest.version), `${file} needs a version`);
  assert(Boolean(manifest.author?.name), `${file} needs author.name`);
  assert(Array.isArray(manifest.skills), `${file} needs explicit skills array`);
  for (const skill of SKILLS) {
    assert(manifest.skills?.includes(`./plugins/wld-design/skills/${skill}`), `${file} must include ./plugins/wld-design/skills/${skill}`);
  }
}

function validateCodexManifest(file, expectedSkills) {
  const manifest = readJson(file);
  assert(manifest.name === 'wld-design', `${file} name must be wld-design`);
  assert(manifest.skills === expectedSkills, `${file} must point skills to ${expectedSkills}`);
  assert(Boolean(manifest.interface?.displayName), `${file} needs interface.displayName`);
  assert(Array.isArray(manifest.interface?.defaultPrompt), `${file} needs starter prompts`);
}

function validateCursorManifest(file) {
  const manifest = readJson(file);
  assert(manifest.name === 'wld-design', `${file} name must be wld-design`);
  assert(Boolean(manifest.displayName), `${file} needs displayName`);
}

function frontmatterOf(content) {
  return content.match(/^---\n([\s\S]*?)\n---/);
}

function descriptionOf(frontmatter) {
  return (frontmatter.match(/^description:\s*(.+)$/m)?.[1] || '').trim();
}

function bodyOf(content, frontmatter) {
  return frontmatter ? content.slice(frontmatter.index + frontmatter[0].length) : content;
}

function validateSkills() {
  for (const skill of SKILLS) {
    const file = `plugins/wld-design/skills/${skill}/SKILL.md`;
    const content = read(file);
    const match = frontmatterOf(content);
    assert(Boolean(match), `${file} must have YAML frontmatter`);
    assert(new RegExp(`^name:\\s*${escapeRegExp(skill)}\\s*$`, 'm').test(match?.[1] || ''), `${file} frontmatter name must match directory`);
    validateSkillDescription(file, descriptionOf(match?.[1] || ''));
    validateSkillBodyLength(file, bodyOf(content, match));
    assert(!content.includes('~/.claude/skills/wld-design'), `${file} must not hard-code ~/.claude skill paths`);
    assert(!content.includes('Claude Code working directory'), `${file} must use provider-neutral working directory wording`);
    assert(!content.includes('CLAUDE.md'), `${file} must not reference provider-specific CLAUDE.md`);
    assert(!content.includes('mcp__claude_ai_Figma'), `${file} must not hard-code provider-specific Figma MCP tool names`);
    if (content.includes('Figma MCP')) {
      const expectedFigmaRef = skill === 'brainstorm'
        ? 'references/figma-mcp.md'
        : '<plugin-root>/plugins/wld-design/assets/figma-mcp.md';
      assert(content.includes(expectedFigmaRef), `${file} mentions Figma MCP and must reference ${expectedFigmaRef}`);
    }
  }
}

function validateSkillDescription(file, description) {
  assert(description.length > 0, `${file} frontmatter needs description`);
  if (description.length === 0) return;
  assert(
    description.length >= DESCRIPTION_MIN_LENGTH && description.length <= DESCRIPTION_MAX_LENGTH,
    `${file} description must be ${DESCRIPTION_MIN_LENGTH}-${DESCRIPTION_MAX_LENGTH} chars (got ${description.length})`,
  );
  const lower = description.toLowerCase();
  assert(
    DESCRIPTION_TRIGGER_CUES.some((cue) => lower.includes(cue)),
    `${file} description must state when to use the skill (include one of: ${DESCRIPTION_TRIGGER_CUES.join(', ')})`,
  );
  // A useful description is a sentence, not a bare title like "WLD Simplify".
  assert(
    description.split(/\s+/).filter(Boolean).length >= 6,
    `${file} description must be a descriptive sentence, not a bare title`,
  );
}

function validateSkillBodyLength(file, body) {
  const lines = body.split('\n').length;
  assert(lines <= SKILL_BODY_MAX_LINES, `${file} body must be <= ${SKILL_BODY_MAX_LINES} lines for progressive disclosure (got ${lines})`);
}

function validateDesignDoc() {
  const headings = read('plugins/wld-design/assets/DESIGN.md')
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).trim());
  const allowed = ['Overview', 'Colors', 'Typography', 'Elevation', 'Components', "Do's and Don't", "Do's and Don'ts", 'Do’s and Don’ts'];
  const canonicalOrder = ['Overview', 'Colors', 'Typography', 'Elevation', 'Components'];
  for (const heading of headings) {
    assert(allowed.includes(heading), `DESIGN.md has unexpected H2 heading: ${heading}`);
  }
  let lastIndex = -1;
  for (const heading of headings) {
    const normalized = heading === "Do's and Don'ts" ? 'Do’s and Don’ts' : heading;
    const order = [...canonicalOrder, 'Do’s and Don’ts'];
    const index = order.indexOf(normalized);
    assert(index >= lastIndex, `DESIGN.md heading is out of order: ${heading}`);
    lastIndex = index;
  }
}

function validateCaches() {
  for (const file of [
    'plugins/wld-design/assets/pm-memory-cache/product-patterns.yaml',
    'plugins/wld-design/assets/pm-memory-cache/common-pitfalls.yaml',
    'plugins/wld-design/assets/pm-spec-cache/index.yaml',
  ]) {
    assert(read(file).startsWith('# Bundled product knowledge snapshot @ '), `${file} must include bundled snapshot header`);
  }

  const componentDir = abs('plugins/wld-design/assets/pm-spec-cache/components');
  const specs = fs.readdirSync(componentDir).filter((file) => file.endsWith('.yaml'));
  assert(specs.length > 0, 'plugins/wld-design/assets/pm-spec-cache/components must include component specs');
  for (const spec of specs) {
    const content = fs.readFileSync(path.join(componentDir, spec), 'utf8');
    assert(content.startsWith('# Bundled product knowledge snapshot @ '), `${spec} must include bundled snapshot header`);
    const status = content.match(/^\s*lifecycle_status:\s*(\S+)/m)?.[1];
    assert(['active', 'draft'].includes(status), `${spec} lifecycle_status must be active or draft`);
  }
}

function validateGeneratedPackages() {
  for (const provider of PROVIDERS) {
    assert(exists(provider.root), `${provider.root} must exist`);
    assert(!exists(provider.root, 'skills'), `${provider.root} must not contain skills/`);
    assert(!exists(provider.root, 'assets'), `${provider.root} must not contain assets/`);
    assert(!exists(provider.root, 'rules'), `${provider.root} must not contain rules/`);
    assert(!exists(provider.root, 'AGENTS.md'), `${provider.root} must not include AGENTS.md`);
    assert(!exists(provider.root, 'README.md'), `${provider.root} must not include README.md`);
    assert(!exists(provider.root, 'CONTRIBUTING.md'), `${provider.root} must not include CONTRIBUTING.md`);
    assert(!exists(provider.root, 'product-source'), `${provider.root} must not ship product-source/`);
  }

  validateClaudeManifest('.claude-plugin/plugin.json');
  validateCodexManifest('plugins/wld-design/plugin.json', './skills/');
  validateCodexManifest('plugins/wld-design/.codex-plugin/plugin.json', '../skills/');
  validateCursorManifest('plugins/wld-design/.cursor-plugin/plugin.json');
  validateCursorMarketplace();
  validateCodexMarketplace();

  assert(!exists('rules'), 'rules/ must not exist');
  assert(exists('.opencode/opencode.json'), 'opencode package must include opencode.json');
  assert(exists('.opencode/INSTRUCTIONS.md'), 'opencode package must include runtime INSTRUCTIONS.md');
  assert(!exists('plugin'), 'legacy plugin/ output must not exist after build');
  assert(!exists('dist'), 'legacy dist/ output must not exist after build');

  for (const provider of ['.claude-plugin', 'plugins/wld-design/.codex-plugin', 'plugins/wld-design/.cursor-plugin', '.opencode']) {
    const metadata = listForbiddenMetadata(provider);
    assert(metadata.length === 0, `${provider} must not ship Finder metadata: ${metadata.join(', ')}`);
  }
}

function validateDocs() {
  for (const file of ['README.md', 'AGENTS.md']) {
    const content = read(file);
    assert(!content.includes('Claude Code'), `${file} must avoid Claude Code-specific wording`);
  }
}

function validateSharedDocs() {
  const figmaMcp = read('plugins/wld-design/assets/figma-mcp.md');
  assert(figmaMcp.includes('## Setup'), 'plugins/wld-design/assets/figma-mcp.md must include setup instructions');
  assert(figmaMcp.includes('https://mcp.figma.com/mcp'), 'plugins/wld-design/assets/figma-mcp.md must document the remote Figma MCP endpoint');
  assert(figmaMcp.includes('http://127.0.0.1:3845/mcp'), 'plugins/wld-design/assets/figma-mcp.md must document the desktop Figma MCP endpoint');
}

function directorySizeBytes(relativeRoot) {
  const root = abs(relativeRoot);
  let total = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else total += fs.statSync(full).size;
    }
  };
  walk(root);
  return total;
}

function validatePublishableBrainstorm() {
  const root = 'plugins/wld-design/skills/brainstorm';
  assert(exists(root, 'SKILL.md'), `${root} must include root SKILL.md`);

  const required = [
    'assets/DESIGN.md',
    'assets/tokens.css',
    'assets/components.css',
    'assets/mockup-chrome.css',
    'assets/phone-mockup.css',
    'assets/frame-template.html',
    'assets/product-memory.md',
    'assets/snippets/wechat-chrome-home.html',
    'assets/snippets/wechat-chrome-inner.html',
    'assets/pm-memory-cache/product-patterns.yaml',
    'assets/pm-memory-cache/common-pitfalls.yaml',
    'assets/pm-spec-cache/index.yaml',
    'assets/screens/个人中心.html',
    'references/figma-mcp.md',
    'references/merged-workflows.md',
    'references/solution-archetypes.md',
    'tools/fix-details/big.mjs',
    'tools/fix-details/calc.mjs',
    'tools/fix-details/report-template.html',
    'tools/prototype/assets/miniprogram-template/app.json',
    'tools/prototype/assets/miniprogram-template/app.wxss',
    'tools/prototype/verify-miniprogram.mjs',
    'tools/prototype/capture-miniprogram.mjs',
    'tools/prototype/render-html-reference.mjs',
    'tools/prototype/conform-to-design.mjs',
    'tools/prototype/conform-design.md',
    'tools/beyblade/server.cjs',
    'tools/beyblade/assets/arena.html',
    'tools/beyblade/assets/arena.css',
    'tools/beyblade/assets/engine.js',
  ];
  for (const file of required) {
    assert(exists(root, file), `${root} publishable package is missing ${file}`);
  }

  const forbidden = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(abs(dir), { withFileTypes: true })) {
      const relative = path.join(dir, entry.name);
      if (['.git', 'node_modules', '__pycache__'].includes(entry.name) || entry.name === '.env') {
        forbidden.push(relative);
      }
      if (entry.name === '.DS_Store' || entry.name.startsWith('._')) {
        forbidden.push(relative);
      }
      if (entry.isDirectory()) walk(relative);
    }
  };
  walk(root);
  assert(forbidden.length === 0, `${root} must not contain upload-forbidden files: ${forbidden.join(', ')}`);

  const forbiddenRefs = [
    '<plugin-root>',
    'plugins/wld-design',
    '../../assets',
    '../prototype',
    '../fix-details',
    '../beyblade-battle',
    '../simplify',
    '../push-to-figma',
    'wld-design:prototype',
    'wld-design:fix-details',
    'wld-design:beyblade-battle',
    'wld-design:simplify',
    'wld-design:push-to-figma',
  ];
  for (const file of collectFiles(root, '.md')) {
    const content = read(file);
    for (const ref of forbiddenRefs) {
      assert(!content.includes(ref), `${file} must be self-contained and not reference ${ref}`);
    }
  }

  const size = directorySizeBytes(root);
  assert(size < 100 * 1024 * 1024, `${root} must be under 100MB for upload (got ${Math.round(size / 1024 / 1024)}MB)`);
}

// ---- Skill reference integrity (progressive disclosure: refs one level deep) ----

// Resolve a runtime reference path to its canonical source location, or null when
// the reference is not a concrete sibling/shared path we can verify.
function resolveReferencePath(reference) {
  if (reference.includes('{') || reference.includes('}') || reference.includes('*')) return null;
  if (reference.startsWith('http://') || reference.startsWith('https://')) return null;
  if (reference.startsWith('<plugin-root>/skills/')) {
    return reference.replace('<plugin-root>/skills/', 'plugins/wld-design/skills/');
  }
  if (reference.startsWith('<plugin-root>/assets/')) {
    return reference.replace('<plugin-root>/assets/', 'plugins/wld-design/assets/');
  }
  if (reference === '<plugin-root>/assets/DESIGN.md') return 'plugins/wld-design/assets/DESIGN.md';
  if (reference.startsWith('../../assets/')) {
    return reference.replace('../../assets/', 'plugins/wld-design/assets/');
  }
  return null;
}

function validateSkillReferences() {
  for (const skill of SKILLS) {
    const file = `plugins/wld-design/skills/${skill}/SKILL.md`;
    const content = read(file);
    const extensions = REFERENCE_EXTENSIONS.map(escapeRegExp).join('|');
    const referenceRe = new RegExp(`(<plugin-root>/|\\.\\./\\.\\./assets/)[^\\s\`"'()]*?(?:${extensions})\\b`, 'g');
    const seen = new Set();
    let match;
    while ((match = referenceRe.exec(content)) !== null) {
      const reference = match[0];
      if (seen.has(reference)) continue;
      seen.add(reference);
      const target = resolveReferencePath(reference);
      if (target === null) continue;
      assert(exists(target), `${file} references missing file: ${reference} -> ${target}`);
    }
  }
}

// ---- Template index guard (assets/screens/ <-> brainstorm SKILL.md) ----
// The baseline benchmark showed template discovery is agent-luck when a screen
// is missing from the SKILL.md tables (cashier-redesign rebuilt 收银台 from four
// other templates). Drift between the directory and the doc is now a failure.

function validateTemplateIndex() {
  const skillFile = 'plugins/wld-design/skills/brainstorm/SKILL.md';
  const doc = read(skillFile);
  const templates = fs.readdirSync(abs('plugins/wld-design/assets/screens'))
    .filter((f) => f.endsWith('.html'));
  for (const template of templates) {
    assert(
      doc.includes(template),
      `${skillFile}: production template ${template} is not referenced — every file in assets/screens/ must be listed so agents can find it`,
    );
  }
  // Reverse direction: CJK-named screen files mentioned in the doc must exist
  // (ASCII examples like solutions.html / home.html are output names, not templates).
  const onDisk = new Set(templates);
  const cjkHtmlRe = /[一-鿿][一-鿿A-Za-z0-9-]*\.html/g;
  let match;
  while ((match = cjkHtmlRe.exec(doc)) !== null) {
    assert(onDisk.has(match[0]), `${skillFile} references template ${match[0]} which does not exist in assets/screens/`);
  }
}

// ---- Token-compliance lint (design-token enforcement) ----

function normalizeColor(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

// Map normalized color value -> array of declaring --wld-* token names (plus a
// synthetic 'brand' marker for documented brand values without a token).
function buildTokenValueMap() {
  const css = read('plugins/wld-design/assets/tokens.css');
  const map = new Map();
  const declarationRe = /(--wld-[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let match;
  while ((match = declarationRe.exec(css)) !== null) {
    const value = match[2].trim();
    if (!isColorLiteral(value)) continue;
    const key = normalizeColor(value);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(match[1].trim());
  }
  for (const brand of BRAND_COLOR_VALUES) {
    const key = normalizeColor(brand);
    if (!map.has(key)) map.set(key, ['brand']);
  }
  return map;
}

function isColorLiteral(value) {
  return /^#[0-9a-f]{3,8}$/i.test(value) || /^rgba?\([^)]*\)$/i.test(value);
}

function blankOut(text) {
  return text.replace(/\S/g, ' ');
}

// Blank out HTML comments
function stripHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, blankOut);
}

// Blank out CSS comments
function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, blankOut);
}

// Blank out colors that are not "consuming" a token: var(--x, <fallback>) fallbacks
// and custom-property definitions (--name: <value>) define values rather than use them.
function maskNonConsumingColors(text) {
  let out = text.replace(/var\(\s*--[a-z0-9-]+\s*,\s*([^)]*)\)/gi, (whole) => whole.replace(/[^\s,()]/g, ' '));
  out = out.replace(/(--[a-z0-9-]+\s*:)([^;]*)/gi, (whole, name, value) => name + blankOut(value));
  return out;
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

// Extract CSS-bearing regions from HTML: <style> blocks and inline style="" values.
// SVG paint attributes (stroke/fill) and comments are intentionally excluded.
function cssRegionsFromHtml(content) {
  const cleaned = stripHtmlComments(content);
  const regions = [];
  const styleBlockRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleBlockRe.exec(cleaned)) !== null) {
    const start = match.index + match[0].indexOf(match[1]);
    regions.push({ start, text: stripCssComments(match[1]) });
  }
  const styleAttrRe = /style\s*=\s*"([^"]*)"/gi;
  while ((match = styleAttrRe.exec(cleaned)) !== null) {
    const start = match.index + match[0].indexOf(match[1]);
    regions.push({ start, text: match[1] });
  }
  return { cleaned, regions };
}

const COLOR_LITERAL_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;

// usesWldTokens: file links tokens.css and may consume var(--wld-*). When false the
// file owns a foreign token namespace, so var(--wld-*) substitution would be wrong.
function classifyColorLiteral(tokenMap, file, line, literal, usesWldTokens, violations) {
  if (!isColorLiteral(literal)) return;
  const matched = tokenMap.get(normalizeColor(literal));
  if (!matched) {
    violations.push({ file, line, literal, level: 'warning', reason: 'hardcoded non-token color' });
    return;
  }
  const wldTokens = matched.filter((token) => token.startsWith('--wld-'));
  if (wldTokens.length === 0) {
    violations.push({ file, line, literal, level: 'warning', reason: 'documented brand value with no matching --wld token' });
  } else if (!usesWldTokens) {
    violations.push({ file, line, literal, level: 'warning', reason: `matches ${wldTokens.join(', ')} but file uses a foreign token namespace` });
  } else {
    violations.push({ file, line, literal, level: 'fatal', tokens: wldTokens });
  }
}

function lintCssFile(tokenMap, file, usesWldTokens, violations) {
  const raw = read(file);
  const scannable = maskNonConsumingColors(stripCssComments(raw));
  let match;
  COLOR_LITERAL_RE.lastIndex = 0;
  while ((match = COLOR_LITERAL_RE.exec(scannable)) !== null) {
    classifyColorLiteral(tokenMap, file, lineNumberAt(raw, match.index), match[0], usesWldTokens, violations);
  }
}

function lintHtmlFile(tokenMap, file, violations) {
  const raw = read(file);
  const { cleaned, regions } = cssRegionsFromHtml(raw);
  for (const region of regions) {
    const scannable = maskNonConsumingColors(region.text);
    let match;
    COLOR_LITERAL_RE.lastIndex = 0;
    while ((match = COLOR_LITERAL_RE.exec(scannable)) !== null) {
      classifyColorLiteral(tokenMap, file, lineNumberAt(cleaned, region.start + match.index), match[0], true, violations);
    }
  }
}

function collectFiles(relativeDir, extension) {
  const root = abs(relativeDir);
  if (!fs.existsSync(root)) return [];
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (full.endsWith(extension)) files.push(path.relative(ROOT, full));
    }
  };
  walk(root);
  return files.sort();
}

function validateTokenCompliance() {
  const tokenMap = buildTokenValueMap();
  const violations = [];

  for (const file of collectFiles('plugins/wld-design/assets/screens', '.html')) {
    lintHtmlFile(tokenMap, file, violations);
  }
  for (const file of ['plugins/wld-design/assets/components.css', 'plugins/wld-design/assets/mockup-chrome.css', 'plugins/wld-design/assets/phone-mockup.css']) {
    lintCssFile(tokenMap, file, true, violations);
  }
  for (const file of collectFiles('plugins/wld-design/skills/prototype/assets/miniprogram-template', '.wxss')) {
    lintCssFile(tokenMap, file, false, violations);
  }

  for (const violation of violations) {
    if (violation.level === 'fatal') {
      fail(`${violation.file}:${violation.line} hardcodes ${violation.literal}; use var(${violation.tokens.join(' or ')})`);
    } else {
      warn(`${violation.file}:${violation.line} ${violation.literal} — ${violation.reason}`);
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

validatePackageJson();
validateMarketplace();
validateClaudeManifest('.claude-plugin/plugin.json');
validateSkills();
validateSkillReferences();
validatePublishableBrainstorm();
validateTemplateIndex();
validateTokenCompliance();
validateDesignDoc();
validateCaches();
validateGeneratedPackages();
validateDocs();
validateSharedDocs();

if (warnings.length > 0) {
  console.warn('Validation warnings:');
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.error('Validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Validation passed.');
