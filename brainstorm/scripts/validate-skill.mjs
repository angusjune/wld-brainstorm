#!/usr/bin/env node

/**
 * Brainstorm — Publish Validator
 *
 * Pre-upload sanity checks for the self-contained skill directory. Codifies
 * the "发布前" checklist in README.md and the SKILL.md screen-table claim so
 * they are enforced instead of asserted. Exit code 1 on any error.
 *
 * Checks:
 *   1. SKILL.md and AGENTS.md exist at the package root.
 *   2. No forbidden entries (.git/, node_modules/, .env, __pycache__/, .DS_Store).
 *   3. SKILL.md, profile docs and references/*.md reference only in-package files.
 *   4. Package size < 100 MB.
 *   5. profile/PROFILE.md screen table matches profile/screens/ on disk (both directions).
 *   6. Root-absolute src/href in screen templates resolve through a server mount.
 *
 * Usage: node scripts/validate-skill.mjs [--json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const FORBIDDEN = ['.git', 'node_modules', '.env', '__pycache__', '.DS_Store'];
const SIZE_LIMIT_BYTES = 100 * 1024 * 1024;

const errors = [];
const notes = [];

function walk(dir, onEntry) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    onEntry(entry, abs);
    if (entry.isDirectory() && !FORBIDDEN.includes(entry.name)) walk(abs, onEntry);
  }
}

// Check 1: SKILL.md exists at root
if (!fs.existsSync(path.join(ROOT, 'SKILL.md'))) {
  errors.push('缺少根目录 SKILL.md');
}

// Check 2: no forbidden entries + Check 4: size
let totalBytes = 0;
walk(ROOT, (entry, abs) => {
  if (FORBIDDEN.includes(entry.name)) {
    errors.push(`存在禁止项: ${path.relative(ROOT, abs)}`);
  }
  if (entry.isFile()) {
    try {
      totalBytes += fs.statSync(abs).size;
    } catch {
      /* ignore unreadable */
    }
  }
});
if (totalBytes >= SIZE_LIMIT_BYTES) {
  errors.push(`目录体积 ${(totalBytes / 1024 / 1024).toFixed(1)}MB 超过 100MB 上限`);
}

// Check 3: SKILL.md + references/*.md reference only in-package files.
// Inspect backtick code spans that look like concrete in-package file paths.
if (!fs.existsSync(path.join(ROOT, 'AGENTS.md'))) {
  errors.push('缺少根目录 AGENTS.md');
}

const docsToScan = [
  path.join(ROOT, 'SKILL.md'),
  path.join(ROOT, 'AGENTS.md'),
  path.join(ROOT, 'README.md'),
].filter((file) => fs.existsSync(file));
for (const doc of [
  path.join(ROOT, 'profile', 'PROFILE.md'),
  path.join(ROOT, 'profile', 'README.md'),
  path.join(ROOT, 'profile', 'knowledge', 'README.md'),
]) {
  if (fs.existsSync(doc)) docsToScan.push(doc);
}
for (const dir of [path.join(ROOT, 'references'), path.join(ROOT, 'profile', 'quality', 'passes')]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.md')) docsToScan.push(path.join(dir, f));
  }
}

// A token is a "concrete in-package path" when it starts with a known top-level
// segment or is a known root file, and carries a file extension (so we skip
// prose, dirs-as-concepts, and generated-output examples like `home.html`).
const IN_PKG_PREFIXES = ['assets/', 'profile/', 'platforms/', 'references/', 'tools/', 'scripts/', 'quality-benchmark/'];
const ROOT_FILES = new Set(['AGENTS.md', 'README.md', 'SKILL.md', 'package.json']);

function looksLikeInPackagePath(tok) {
  if (/^https?:\/\//.test(tok)) return false;
  if (tok.includes('<') || tok.includes('>')) return false; // placeholders
  if (IN_PKG_PREFIXES.some((p) => tok.startsWith(p))) return true;
  if (ROOT_FILES.has(tok)) return true;
  return false;
}

for (const docPath of docsToScan) {
  const text = fs.readFileSync(docPath, 'utf8');
  const spans = text.match(/`([^`]+)`/g) || [];
  for (const span of spans) {
    const tok = span.slice(1, -1).trim().replace(/^\.\//, '');
    if (path.isAbsolute(tok) || tok.startsWith('..')) {
      // absolute or escaping paths are not self-contained
      if (looksLikeInPackagePath(tok) || tok.startsWith('..')) {
        errors.push(`${path.relative(ROOT, docPath)} 引用了非包内路径: ${tok}`);
      }
      continue;
    }
    if (!looksLikeInPackagePath(tok)) continue;
    const target = path.join(ROOT, tok.replace(/\/$/, ''));
    if (!fs.existsSync(target)) {
      errors.push(`${path.relative(ROOT, docPath)} 引用了不存在的包内文件: ${tok}`);
    }
  }
}

// Check 5: profile/PROFILE.md screen table <-> profile/screens/ (both directions).
// PROFILE.md names templates and nothing else, so every .html it mentions must
// exist and vice versa — no need to guess which names are templates.
const screensDir = path.join(ROOT, 'profile', 'screens');
const profileDoc = path.join(ROOT, 'profile', 'PROFILE.md');
if (!fs.existsSync(screensDir)) {
  errors.push('缺少 profile/screens/ 目录');
} else if (!fs.existsSync(profileDoc)) {
  errors.push('缺少 profile/PROFILE.md');
} else {
  const profileText = fs.readFileSync(profileDoc, 'utf8');
  const mentioned = new Set(
    (profileText.match(/`([^`]+\.html)`/g) || []).map((s) => s.slice(1, -1).trim()),
  );
  const onDisk = fs
    .readdirSync(screensDir)
    .filter((f) => f.endsWith('.html'))
    .sort();

  // Forward: every template on disk must be documented in PROFILE.md.
  let undocumented = 0;
  for (const f of onDisk) {
    if (!mentioned.has(f)) {
      undocumented += 1;
      errors.push(`模板存在但未在 profile/PROFILE.md 列出: profile/screens/${f}`);
    }
  }
  // Reverse: every template named in PROFILE.md must exist on disk.
  const diskSet = new Set(onDisk);
  for (const f of mentioned) {
    if (!diskSet.has(f)) {
      errors.push(`profile/PROFILE.md 列出的模板在磁盘上不存在: profile/screens/${f}`);
    }
  }
  notes.push(`screens: ${onDisk.length} 个模板, ${onDisk.length - undocumented} 个已文档化`);
}

// Check 6: every root-absolute src/href in the screen corpus resolves through a
// real server mount to a file on disk. Guards the class of break the profile
// refactor introduced (templates pointing at /assets/icons/ after icons moved to
// profile/) — the QA gate doesn't inspect img srcs, so only this catches it.
if (fs.existsSync(screensDir)) {
  // The profile's machine-readable config is PROFILE.md's frontmatter block.
  const profileConfig = (() => {
    try {
      const text = fs.readFileSync(path.join(ROOT, 'profile', 'PROFILE.md'), 'utf8');
      const block = text.match(/^---\n([\s\S]*?)\n---/);
      const config = {};
      for (const line of (block ? block[1] : '').split('\n')) {
        const m = line.match(/^([\w-]+):\s*(.*)$/);
        if (m) config[m[1]] = m[2].trim();
      }
      return config;
    } catch {
      return {};
    }
  })();
  const mounts = {
    '/assets/': path.join(ROOT, 'assets'),
    '/profile/': path.join(ROOT, 'profile'),
    ...(profileConfig.platform
      ? { '/platform/': path.join(ROOT, 'platforms', profileConfig.platform) }
      : {}),
  };
  let refCount = 0;
  for (const f of fs.readdirSync(screensDir).filter((n) => n.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(screensDir, f), 'utf8');
    const refRe = /(?:src|href)\s*=\s*"(\/[^"]+)"/g;
    let m;
    while ((m = refRe.exec(html)) !== null) {
      refCount += 1;
      const url = m[1];
      const prefix = Object.keys(mounts).find((p) => url.startsWith(p));
      if (!prefix) {
        errors.push(`profile/screens/${f} 引用了未挂载的绝对路径: ${url}（服务只挂载 ${Object.keys(mounts).join(' ')}）`);
        continue;
      }
      const target = path.join(mounts[prefix], url.slice(prefix.length));
      if (!fs.existsSync(target)) {
        errors.push(`profile/screens/${f} 引用了不存在的文件: ${url}`);
      }
    }
  }
  notes.push(`screen asset refs: ${refCount} 个绝对路径引用已校验`);
}

const json = process.argv.includes('--json');
if (json) {
  console.log(JSON.stringify({ ok: errors.length === 0, errors, notes, sizeMB: +(totalBytes / 1024 / 1024).toFixed(2) }, null, 2));
} else {
  console.log(`包大小: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  for (const n of notes) console.log(`  · ${n}`);
  if (errors.length === 0) {
    console.log('validate: 所有检查通过 ✓');
  } else {
    console.log(`validate: ${errors.length} 个问题`);
    for (const e of errors) console.log(`  ✗ ${e}`);
  }
}

process.exit(errors.length === 0 ? 0 : 1);
