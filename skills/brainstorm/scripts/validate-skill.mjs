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
 *   3. SKILL.md, profile docs, shared references, and branch docs reference only in-package files.
 *   4. Package size < 100 MB.
 *   5. profile/PROFILE.md screen table matches profile/screens/ on disk (both directions).
 *   6. Root-absolute src/href in screen templates resolve through a server mount.
 *   7. The canonical page scaffold and preview-frame stylesheet keep their contract.
 *   8. Every profile screen has a valid deterministic workflow contract.
 *   9. Skill instructions and UI metadata match runtime paths and existing assets.
 *
 * Usage: node scripts/validate-skill.mjs [--json] [--profile <dir>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const { WORKSPACE_PROFILE_DIRNAME } = require('./lib/profile-selection.cjs');
const { RUNS_DIRNAME } = require('./lib/run-directory.cjs');
const { CONTRACT_VERSION } = require('./lib/workflow-contract.cjs');

const argv = process.argv.slice(2);
const json = argv.includes('--json');
let activeProfileDir = path.join(ROOT, 'profile');
for (let index = 0; index < argv.length; index += 1) {
  if (argv[index] !== '--profile') continue;
  if (!argv[index + 1]) {
    console.error('Usage: node scripts/validate-skill.mjs [--json] [--profile <dir>]');
    process.exit(2);
  }
  activeProfileDir = path.resolve(argv[index + 1]);
  index += 1;
}

const FORBIDDEN = ['.git', 'node_modules', '.env', '__pycache__', '.DS_Store'];
const GENERATED_OUTPUT_DIRS = new Set(['profile/quality/benchmark/runs']);
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

// Check 1 + 9: required entrypoint, runtime naming, and UI metadata.
const skillPath = path.join(ROOT, 'SKILL.md');
if (!fs.existsSync(skillPath)) {
  errors.push('缺少根目录 SKILL.md');
} else {
  const skill = fs.readFileSync(skillPath, 'utf8');
  for (const runtimePath of [WORKSPACE_PROFILE_DIRNAME, RUNS_DIRNAME]) {
    if (!skill.includes(runtimePath)) errors.push(`SKILL.md 未声明运行时路径: ${runtimePath}`);
  }
}

const openaiYamlPath = path.join(ROOT, 'agents', 'openai.yaml');
if (fs.existsSync(openaiYamlPath)) {
  const openaiYaml = fs.readFileSync(openaiYamlPath, 'utf8');
  const defaultPrompt = openaiYaml.match(/^\s*default_prompt:\s*"([^"]*)"\s*$/m)?.[1];
  if (defaultPrompt && !defaultPrompt.includes('$brainstorm')) {
    errors.push('agents/openai.yaml 的 default_prompt 必须显式包含 $brainstorm');
  }
  for (const key of ['icon_small', 'icon_large']) {
    const value = openaiYaml.match(new RegExp(`^\\s*${key}:\\s*"([^"]+)"\\s*$`, 'm'))?.[1];
    if (!value) continue;
    const target = path.resolve(ROOT, value);
    if (!target.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
      errors.push(`agents/openai.yaml 的 ${key} 引用了不存在或越界的文件: ${value}`);
    }
  }
}

// Check 7: shared page-authoring contract. Deterministic assembly owns one
// canonical scaffold, while preview-only frame styles stay in a server-linked
// stylesheet. Keep these responsibilities distinct so SKILL.md cannot drift
// from an ignored HTML shell inside the style asset.
const pageTemplatePath = path.join(ROOT, 'assets', 'page-template.html');
const frameStylesheetPath = path.join(ROOT, 'assets', 'frame.css');
if (!fs.existsSync(pageTemplatePath)) {
  errors.push('缺少规范页面模板: assets/page-template.html');
} else {
  const pageTemplate = fs.readFileSync(pageTemplatePath, 'utf8');
  const requiredFragments = [
    '<!DOCTYPE html>',
    '<link rel="stylesheet" href="/profile/design-system/tokens.css">',
    '<link rel="stylesheet" href="/profile/design-system/components.css">',
    'class="frame-header"',
    'class="frame-main"',
    'id="frame-content"',
    '<!-- SCREEN CONTENT -->',
    '<!-- SCREEN STYLES -->',
  ];
  for (const fragment of requiredFragments) {
    if (!pageTemplate.includes(fragment)) {
      errors.push(`assets/page-template.html 缺少必要结构: ${fragment}`);
    }
  }
  if (/\/assets\/frame\.css|\/assets\/(?:live-reload|annotate)\.js/.test(pageTemplate)) {
    errors.push('assets/page-template.html 不应手动链接预览框架或辅助脚本；这些由服务注入');
  }
}

// Check 8: deterministic workflow contracts are mandatory profile data. The
// generation workflow must not fall back to prose-only invariants.
const workflowContractsPath = path.join(activeProfileDir, 'quality', 'workflow-contracts.json');
if (!fs.existsSync(workflowContractsPath)) {
  errors.push('缺少 profile/quality/workflow-contracts.json');
} else {
  let workflowContracts;
  try {
    workflowContracts = JSON.parse(fs.readFileSync(workflowContractsPath, 'utf8'));
  } catch (error) {
    errors.push(`profile/quality/workflow-contracts.json JSON 无效: ${error.message}`);
  }
  if (workflowContracts) {
    if (workflowContracts.version !== CONTRACT_VERSION || !workflowContracts.templates || typeof workflowContracts.templates !== 'object') {
      errors.push(`profile/quality/workflow-contracts.json 必须使用 version ${CONTRACT_VERSION} 并包含 templates 对象`);
    } else {
      const screenNames = fs.existsSync(path.join(activeProfileDir, 'screens'))
        ? fs.readdirSync(path.join(activeProfileDir, 'screens')).filter((name) => name.endsWith('.html')).sort()
        : [];
      for (const name of screenNames) {
        const contract = workflowContracts.templates[name];
        if (!contract) {
          errors.push(`模板缺少 workflow contract: profile/screens/${name}`);
          continue;
        }
        if (Object.hasOwn(contract, 'contextFiles')) {
          errors.push(`workflow contract ${name}.contextFiles 已废弃，请使用 authorityFiles`);
        }
        for (const key of ['authorityFiles', 'requiredTextPerScreen']) {
          if (!Array.isArray(contract[key]) || contract[key].some((value) => typeof value !== 'string')) {
            errors.push(`workflow contract ${name}.${key} 必须是字符串数组`);
          }
        }
        for (const key of ['requiredAssetsPerScreen', 'brandIdentitySelectors', 'diversitySelectors']) {
          if (contract[key] !== undefined
            && (!Array.isArray(contract[key]) || contract[key].some((value) => typeof value !== 'string'))) {
            errors.push(`workflow contract ${name}.${key} 必须是字符串数组`);
          }
        }
        for (const selector of contract.brandIdentitySelectors || []) {
          if (!/^\.[a-zA-Z_][\w-]*$/.test(selector)) {
            errors.push(`workflow contract ${name}.brandIdentitySelectors 只能声明简单 class selector: ${selector}`);
          }
        }
        for (const selector of contract.diversitySelectors || []) {
          if (!/^\.[a-zA-Z_][\w-]*$/.test(selector)) {
            errors.push(`workflow contract ${name}.diversitySelectors 只能声明简单 class selector: ${selector}`);
          }
        }
        for (const relative of contract.authorityFiles || []) {
          if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) {
            errors.push(`workflow contract ${name} 的 authorityFiles 越界: ${relative}`);
          } else if (relative.split(/[\\/]/)[0] === 'screens') {
            errors.push(`workflow contract ${name} 的 authorityFiles 不应包含页面模板: ${relative}`);
          } else if (!fs.existsSync(path.join(activeProfileDir, relative))) {
            errors.push(`workflow contract ${name} 引用了不存在的 authority file: ${relative}`);
          }
        }
      }
      for (const name of Object.keys(workflowContracts.templates)) {
        if (!screenNames.includes(name)) errors.push(`workflow contract 引用了不存在的模板: ${name}`);
      }
    }
  }
}
if (!fs.existsSync(frameStylesheetPath)) {
  errors.push('缺少预览框架样式: assets/frame.css');
} else {
  const frameStylesheet = fs.readFileSync(frameStylesheetPath, 'utf8');
  if (/<(?:!DOCTYPE|html|head|body|style)\b/i.test(frameStylesheet)) {
    errors.push('assets/frame.css 必须只包含 CSS，不能包含 HTML 页面壳');
  }
}

// Check 2: no forbidden entries + Check 4: size
let totalBytes = 0;
walk(ROOT, (entry, abs) => {
  const relative = path.relative(ROOT, abs).split(path.sep).join('/');
  if (FORBIDDEN.includes(entry.name)) {
    errors.push(`存在禁止项: ${relative}`);
  }
  if (entry.isDirectory() && GENERATED_OUTPUT_DIRS.has(relative)) {
    errors.push(`存在生成输出目录: ${relative}`);
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

const vendoredBigPath = path.join(ROOT, 'profile', 'quality', 'tools', 'big.mjs');
const vendoredBigLicensePath = path.join(ROOT, 'profile', 'quality', 'tools', 'LICENSE.big.js');
if (fs.existsSync(vendoredBigPath) && !fs.existsSync(vendoredBigLicensePath)) {
  errors.push('内置 big.mjs 缺少许可证: profile/quality/tools/LICENSE.big.js');
}

const docsToScan = new Set([
  path.join(ROOT, 'SKILL.md'),
  path.join(ROOT, 'AGENTS.md'),
  path.join(ROOT, 'README.md'),
].filter((file) => fs.existsSync(file)));
for (const doc of [
  path.join(ROOT, 'profile', 'PROFILE.md'),
  path.join(ROOT, 'profile', 'README.md'),
  path.join(ROOT, 'profile', 'knowledge', 'README.md'),
]) {
  if (fs.existsSync(doc)) docsToScan.add(doc);
}

function addMarkdownDocs(dir) {
  if (!fs.existsSync(dir)) return;
  walk(dir, (entry, abs) => {
    if (entry.isFile() && entry.name.endsWith('.md')) docsToScan.add(abs);
  });
}

addMarkdownDocs(path.join(ROOT, 'references'));
addMarkdownDocs(path.join(ROOT, 'profile', 'quality', 'passes'));
addMarkdownDocs(path.join(ROOT, 'profile', 'branches'));

// A token is a "concrete in-package path" when it starts with a known top-level
// segment or is a known root file, and carries a file extension (so we skip
// prose, dirs-as-concepts, and generated-output examples like `home.html`).
const IN_PKG_PREFIXES = ['assets/', 'profile/', 'platforms/', 'references/', 'tools/', 'scripts/'];
const ROOT_FILES = new Set(['AGENTS.md', 'README.md', 'SKILL.md', 'package.json']);

// These exact paths describe optional, conditionally-loaded profile mechanisms
// (the QA rule-pack and the knowledge cache)
// that shared docs reference illustratively when explaining the mechanism, not
// as an assertion that every profile carries them. A profile that legitimately
// skips the mechanism (see references/setup-profile.md Steps 6/7) won't have
// these on disk — that's a valid, documented end state, not a broken link.
const OPTIONAL_MECHANISM_PATHS = new Set([
  'profile/quality/rules.mjs',
  'profile/knowledge/README.md',
]);

function looksLikeInPackagePath(tok) {
  if (/^https?:\/\//.test(tok)) return false;
  if (tok.includes('<') || tok.includes('>')) return false; // placeholders
  if (/[*?[\]{}]/.test(tok) || tok.endsWith('/')) return false; // globs and directory concepts
  if (IN_PKG_PREFIXES.some((p) => tok.startsWith(p))) return true;
  if (ROOT_FILES.has(tok)) return true;
  return false;
}

for (const docPath of docsToScan) {
  const text = fs.readFileSync(docPath, 'utf8');
  const prose = text.replace(/```[\s\S]*?```/g, '');
  // Match single-backtick inline code only. Treating the backticks in fenced
  // code blocks as delimiters can shift pairing and hide later inline paths.
  const spans = [...prose.matchAll(/(?<!`)`([^`\n]+)`(?!`)/g)];
  for (const span of spans) {
    const tok = span[1].trim().replace(/^\.\//, '');
    if (path.isAbsolute(tok) || tok.startsWith('..')) {
      // absolute or escaping paths are not self-contained
      if (looksLikeInPackagePath(tok) || tok.startsWith('..')) {
        errors.push(`${path.relative(ROOT, docPath)} 引用了非包内路径: ${tok}`);
      }
      continue;
    }
    if (!looksLikeInPackagePath(tok)) continue;
    if (OPTIONAL_MECHANISM_PATHS.has(tok)) continue;
    const target = path.join(ROOT, tok.replace(/\/$/, ''));
    if (!fs.existsSync(target)) {
      errors.push(`${path.relative(ROOT, docPath)} 引用了不存在的包内文件: ${tok}`);
    }
  }
}

// Check 5: profile/PROFILE.md screen table <-> profile/screens/ (both directions).
// PROFILE.md names templates and nothing else, so every .html it mentions must
// exist and vice versa — no need to guess which names are templates.
const screensDir = path.join(activeProfileDir, 'screens');
const profileDoc = path.join(activeProfileDir, 'PROFILE.md');
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
      const text = fs.readFileSync(profileDoc, 'utf8');
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
    '/profile/': activeProfileDir,
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
