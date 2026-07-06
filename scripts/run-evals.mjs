#!/usr/bin/env node

/**
 * Deterministic, CI-safe evaluation harness for the WLD Design skills.
 *
 * What this DOES (auto-graded, no network, no LLM, no build):
 *   1. Loads every evals/*.cases.json and validates its shape.
 *   2. Asserts each case's expectedSkill exists as a skills/<name>/ dir.
 *   3. Routing / description-collision check: a transparent keyword-overlap
 *      scorer ranks the skill frontmatter descriptions against the prompt.
 *      The expectedSkill must be the UNIQUE top scorer; any mustNotTrigger skill
 *      must score strictly lower.
 *
 * What this does NOT do:
 *   - It does not execute skills or call an LLM. The per-case `expectedBehaviors`
 *     are printed as a manual / LLM-judge checklist and are NOT auto-graded.
 *
 * Exit code is NON-ZERO if any deterministic assertion fails.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EVALS_DIR = path.join(ROOT, 'evals');
const SKILLS_DIR = path.join(ROOT, 'plugins/wld-design/skills');

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

// English / latin stopwords plus a few CJK particles & filler chars that carry
// no routing signal. Kept small and explicit on purpose.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'so',
  'as', 'at', 'by', 'is', 'are', 'be', 'i', 'me', 'my', 'we', 'you', 'your',
  'it', 'this', 'that', 'these', 'those', 'they', 'them', 'can', 'will', 'do',
  'did', 'done', 'use', 'used', 'using', 'want', 'wants', 'wanted', 'help',
  'make', 'made', 'into', 'from', 'when', 'where', 'what', 'which', 'who',
  'how', 'then', 'than', 'some', 'any', 'all', 'one', 'more', 'most', 'up',
  'out', 'about', 'so', 'go', 'see', 'show', 'let', 'lets', 'have', 'has',
  'get', 'got', 'give', 'me', 'us', 'am', 'no', 'not', 'if',
  // CJK particles / common filler that should not drive routing
  '的', '了', '吗', '呢', '吧', '啊', '我', '你', '他', '她', '它', '们',
  '这', '那', '个', '一', '是', '在', '有', '和', '与', '或', '把', '被',
  '给', '让', '帮', '想', '要', '会', '做', '用', '看', '下', '过', '着',
  '就', '都', '也', '还', '很', '太', '点', '些', '能', '可', '以', '对',
]);

const isCjk = (ch) => /[㐀-鿿豈-﫿]/.test(ch);

/**
 * Tokenize a string into a Set of routing tokens.
 *   - lowercase, punctuation stripped
 *   - latin words split on whitespace, stopwords dropped
 *   - CJK runs split into character bigrams (and the full short run kept),
 *     with single CJK stopword chars dropped
 * Returns a Set (presence-based overlap, transparent and order-independent).
 */
function tokenize(text) {
  const tokens = new Set();
  const lower = String(text).toLowerCase();

  // Latin / digit tokens
  const latin = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  for (const word of latin) {
    if (word.length >= 2 && !STOPWORDS.has(word)) tokens.add(word);
  }

  // CJK runs -> character bigrams + retained full short runs
  const runs = lower.match(/[㐀-鿿豈-﫿]+/g) || [];
  for (const run of runs) {
    const chars = [...run].filter((c) => isCjk(c) && !STOPWORDS.has(c));
    // keep the whole run if it is short & meaningful (e.g. 小程序, 状态)
    if (run.length >= 2 && run.length <= 5) tokens.add(run);
    for (let i = 0; i < chars.length - 1; i += 1) {
      tokens.add(chars[i] + chars[i + 1]);
    }
    for (const c of chars) {
      // single meaningful CJK chars (already stopword-filtered) as weak signal
      tokens.add(c);
    }
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Distinctive trigger terms (small boost). These are the terms that make a
// skill unambiguous even when descriptions share words like "prototype"/"demo".
// Each term is matched as a substring against the raw lowercased prompt so that
// multi-token phrases ("wechat mini program", "三个方案") count.
// ---------------------------------------------------------------------------

const DISTINCTIVE = {
  brainstorm: [
    'hot-reload', 'hot reload', 'live preview', 'live browser', 'browser preview',
    'three options', '三个方案', '三个方向', '三个', '多个方案', '方案', '方向',
    '边看边改', '浏览器', '线框图', 'edits html', 'iterate', '边看', '想法',
    '视觉方向', '视觉可能性', '用户路径不用变', '路径不用变', '视觉',
  ],
  prototype: [
    'wechat mini program', 'mini program', '微信小程序', '小程序', '小程',
    'wxml', 'wxss', '微信开发者工具', '手机微信', '扫码', 'devtools',
    '高保真', 'high-fidelity', 'high fidelity', '落地', '已经确认', '已确认',
    'approved', '点一点',
  ],
  'push-to-figma': [
    'push-to-figma', 'push to figma', '推到 figma', '推到我的 figma',
    '画到 figma', '画进 figma', 'figma 页面', 'editable figma',
    'editable frames', '可编辑 figma', '可编辑的 figma', '可编辑 frame',
    'wld component', 'wld 组件', '组件库', 'component library',
    '.wld-brainstorm', 'brainstorm 选中的方案', '本地 figma mcp',
  ],
  simplify: [
    'simplify', '精简', 'clean up', 'cleanup', '清理', 'too cluttered',
    'cluttered', 'distill', '太乱', '太满', '太花哨', '太多', 'too much',
    '装饰', '冗余', '能短则短', 'declutter',
  ],
  'find-missing-states': [
    'missing states', 'missing state', '缺失状态', '缺什么', '漏了哪些',
    'what states', 'gap analysis', '状态完整性', 'state machine', 'state_machine',
    'state coverage', '覆盖', '改版', 'spec-only', '完整性', '状态',
  ],
  'fix-details': [
    'fix details', 'fix-details', '细节', '检查细节', '改错', '对一下',
    '对不上', '打架', '矛盾', '省利息', '首次还', '算错', '算得对', '复算',
    '利率口径', '同屏', '跨屏', '数字对不对', 'detail bug', 'detail bugs',
    'correctness pass',
  ],
  'beyblade-battle': [
    'beyblade', 'beyblades', 'beyblade battle', 'beyblade-battle',
    '陀螺', '战斗陀螺', '斗陀螺', 'spinning top', 'spinning beyblade',
    'arena', '竞技场', '擂台', '对战', '打一架', '斗一斗', '互相打',
    'battle each other', 'fight each other', 'last one spinning', '最后还在转',
  ],
};

const OVERLAP_WEIGHT = 1; // per shared token between prompt and description
const DISTINCTIVE_WEIGHT = 3; // per distinctive trigger term hit

// ---------------------------------------------------------------------------
// Skill descriptions (read from skills/<name>/SKILL.md frontmatter)
// ---------------------------------------------------------------------------

function readFrontmatter(skillName) {
  const file = path.join(SKILLS_DIR, skillName, 'SKILL.md');
  const raw = fs.readFileSync(file, 'utf8');
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`No frontmatter found in ${file}`);
  const body = match[1];
  const nameMatch = body.match(/^name:\s*(.+)$/m);
  const descMatch = body.match(/^description:\s*([\s\S]*?)(?=\n[a-zA-Z_-]+:\s|$)/m);
  if (!nameMatch || !descMatch) {
    throw new Error(`Frontmatter missing name/description in ${file}`);
  }
  return {
    name: nameMatch[1].trim(),
    description: descMatch[1].trim(),
  };
}

function loadSkills() {
  const names = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const skills = {};
  for (const name of names) {
    const fm = readFrontmatter(name);
    if (fm.name !== name) {
      throw new Error(
        `Skill dir "${name}" has frontmatter name "${fm.name}" - mismatch.`,
      );
    }
    skills[name] = {
      name,
      description: fm.description,
      descTokens: tokenize(fm.description),
    };
  }
  return skills;
}

// ---------------------------------------------------------------------------
// Scorer
// ---------------------------------------------------------------------------

function scorePromptAgainstSkill(promptText, promptTokens, skill) {
  let overlap = 0;
  for (const tok of promptTokens) {
    if (skill.descTokens.has(tok)) overlap += OVERLAP_WEIGHT;
  }

  const lower = String(promptText).toLowerCase();
  let distinctive = 0;
  const hits = [];
  for (const term of DISTINCTIVE[skill.name] || []) {
    if (lower.includes(term)) {
      distinctive += DISTINCTIVE_WEIGHT;
      hits.push(term);
    }
  }

  return { total: overlap + distinctive, overlap, distinctive, hits };
}

function rankPrompt(promptText, skills) {
  const promptTokens = tokenize(promptText);
  const scores = Object.values(skills).map((skill) => ({
    name: skill.name,
    ...scorePromptAgainstSkill(promptText, promptTokens, skill),
  }));
  scores.sort((a, b) => b.total - a.total);
  return scores;
}

// ---------------------------------------------------------------------------
// Case loading + validation
// ---------------------------------------------------------------------------

function loadCaseFiles(skillNames) {
  if (!fs.existsSync(EVALS_DIR)) {
    throw new Error(`evals directory not found: ${EVALS_DIR}`);
  }
  const files = fs
    .readdirSync(EVALS_DIR)
    .filter((f) => f.endsWith('.cases.json'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No *.cases.json files found in ${EVALS_DIR}`);
  }

  const fileSet = new Set(files);
  for (const skillName of skillNames) {
    const expectedFile = `${skillName}.cases.json`;
    if (!fileSet.has(expectedFile)) {
      throw new Error(`${expectedFile}: missing eval scenarios for ${skillName}.`);
    }
  }

  const all = [];
  for (const file of files) {
    const full = path.join(EVALS_DIR, file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (err) {
      throw new Error(`Malformed JSON in ${file}: ${err.message}`);
    }
    if (!Array.isArray(parsed)) {
      throw new Error(`${file}: top-level value must be an array of cases.`);
    }
    if (parsed.length < 3) {
      throw new Error(
        `${file}: needs >=3 scenarios (found ${parsed.length}).`,
      );
    }
    parsed.forEach((c, i) => validateCase(c, file, i));
    for (const c of parsed) all.push({ ...c, file });
  }
  return all;
}

function validateCase(c, file, index) {
  const where = `${file}[${index}]`;
  if (typeof c !== 'object' || c === null) {
    throw new Error(`${where}: case must be an object.`);
  }
  if (typeof c.prompt !== 'string' || c.prompt.trim() === '') {
    throw new Error(`${where}: "prompt" must be a non-empty string.`);
  }
  if (typeof c.expectedSkill !== 'string' || c.expectedSkill.trim() === '') {
    throw new Error(`${where}: "expectedSkill" must be a non-empty string.`);
  }
  if (
    !Array.isArray(c.expectedBehaviors) ||
    c.expectedBehaviors.length === 0 ||
    !c.expectedBehaviors.every((b) => typeof b === 'string' && b.trim() !== '')
  ) {
    throw new Error(
      `${where}: "expectedBehaviors" must be a non-empty array of strings.`,
    );
  }
  if (c.mustNotTrigger !== undefined) {
    if (
      !Array.isArray(c.mustNotTrigger) ||
      !c.mustNotTrigger.every((s) => typeof s === 'string' && s.trim() !== '')
    ) {
      throw new Error(
        `${where}: "mustNotTrigger" must be an array of skill name strings.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Reporting helpers
// ---------------------------------------------------------------------------

function truncate(str, len) {
  const oneLine = str.replace(/\s+/g, ' ').trim();
  return oneLine.length > len ? `${oneLine.slice(0, len - 1)}…` : oneLine;
}

function pad(str, len) {
  const s = String(str);
  return s.length >= len ? s : s + ' '.repeat(len - s.length);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const skills = loadSkills();
  const skillNames = Object.keys(skills);
  const cases = loadCaseFiles(skillNames);

  const results = [];

  for (const c of cases) {
    const failures = [];

    // (b) expectedSkill must exist as a plugins/wld-design/skills/<name>/ dir.
    if (!skillNames.includes(c.expectedSkill)) {
      failures.push(
        `expectedSkill "${c.expectedSkill}" has no plugins/wld-design/skills/ dir`,
      );
    }

    // mustNotTrigger names must be real skills (catch typos in fixtures).
    for (const m of c.mustNotTrigger || []) {
      if (!skillNames.includes(m)) {
        failures.push(`mustNotTrigger "${m}" is not a known skill`);
      }
    }

    // (c) routing / description-collision check.
    let ranking = [];
    if (skillNames.includes(c.expectedSkill)) {
      ranking = rankPrompt(c.prompt, skills);
      const top = ranking[0];
      const expectedScore = ranking.find((r) => r.name === c.expectedSkill);

      const tiedAtTop = ranking.filter((r) => r.total === top.total);
      if (top.name !== c.expectedSkill) {
        failures.push(
          `routing: expected "${c.expectedSkill}" but top scorer is ` +
            `"${top.name}" (${top.total} vs ${expectedScore.total})`,
        );
      } else if (tiedAtTop.length > 1) {
        const others = tiedAtTop
          .filter((r) => r.name !== c.expectedSkill)
          .map((r) => r.name)
          .join(', ');
        failures.push(
          `routing: ambiguous tie at top score ${top.total} between ` +
            `"${c.expectedSkill}" and ${others}`,
        );
      }

      for (const m of c.mustNotTrigger || []) {
        const mScore = ranking.find((r) => r.name === m);
        if (mScore && expectedScore && mScore.total >= expectedScore.total) {
          failures.push(
            `mustNotTrigger: "${m}" scored ${mScore.total} >= ` +
              `"${c.expectedSkill}" ${expectedScore.total}`,
          );
        }
      }
    }

    results.push({ case: c, failures, ranking });
  }

  printCaseTable(results);
  printSkillSummary(results, skillNames);
  printBehaviorChecklist(results);

  const failed = results.filter((r) => r.failures.length > 0);
  console.log('');
  console.log(
    `Deterministic result: ${results.length - failed.length}/${results.length} ` +
      `cases passed routing + structural checks.`,
  );

  if (failed.length > 0) {
    console.log('');
    console.log('FAILURES:');
    for (const r of failed) {
      console.log(`  [${r.case.file}] ${truncate(r.case.prompt, 60)}`);
      for (const f of r.failures) console.log(`     - ${f}`);
    }
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

function printCaseTable(results) {
  console.log('='.repeat(78));
  console.log('ROUTING / STRUCTURAL CHECKS (deterministic, auto-graded)');
  console.log('='.repeat(78));
  console.log(
    `${pad('RESULT', 7)}${pad('EXPECTED', 20)}${pad('TOP (score)', 22)}PROMPT`,
  );
  console.log('-'.repeat(78));
  for (const r of results) {
    const status = r.failures.length === 0 ? 'PASS' : 'FAIL';
    const top = r.ranking[0]
      ? `${r.ranking[0].name} (${r.ranking[0].total})`
      : 'n/a';
    console.log(
      `${pad(status, 7)}${pad(r.case.expectedSkill, 20)}${pad(top, 22)}` +
        `${truncate(r.case.prompt, 30)}`,
    );
  }
}

function printSkillSummary(results, skillNames) {
  console.log('');
  console.log('PER-SKILL SUMMARY');
  console.log('-'.repeat(40));
  for (const name of skillNames) {
    const own = results.filter((r) => r.case.expectedSkill === name);
    const passed = own.filter((r) => r.failures.length === 0).length;
    console.log(`  ${pad(name, 22)} ${passed}/${own.length} passed`);
  }
}

function printBehaviorChecklist(results) {
  console.log('');
  console.log('='.repeat(78));
  console.log('EXPECTED BEHAVIORS (manual / LLM-judge - NOT auto-graded)');
  console.log('='.repeat(78));
  for (const r of results) {
    console.log('');
    console.log(`• [${r.case.expectedSkill}] ${truncate(r.case.prompt, 64)}`);
    for (const b of r.case.expectedBehaviors) {
      console.log(`    [ ] ${b}`);
    }
  }
}

try {
  main();
} catch (err) {
  console.error('');
  console.error(`Eval harness error: ${err.message}`);
  process.exitCode = 1;
}
