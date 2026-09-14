#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const BRAINSTORM_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVER = path.join(BRAINSTORM_DIR, 'scripts/serve-preview.cjs');
const WORKFLOW = path.join(BRAINSTORM_DIR, 'scripts/workflow.mjs');
const require = createRequire(import.meta.url);
const { compactDesignContext } = require('../lib/workflow-contract.cjs');

const neutralContext = compactDesignContext({
  template: 'fixture.html',
  sourceContent: '<!-- ANDROID CHROME (Presentation-only) --><!-- Account summary --><div class="fixture-page"></div>',
  profileConfig: { pageClass: 'fixture-page', platform: 'fixture-platform' },
  requiredText: [],
  requiredAssets: [],
  screenCount: 1,
});
assert.deepEqual(neutralContext.sections, ['Account summary']);

function run(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [WORKFLOW, ...args], {
    cwd: BRAINSTORM_DIR,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(result.status, expectedStatus, result.stderr || result.stdout);
  return JSON.parse(result.stdout || result.stderr);
}

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => reject(new Error(`server timed out: ${stderr}`)), 10_000);
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      const newline = stdout.indexOf('\n');
      if (newline < 0) return;
      clearTimeout(timeout);
      try { resolve(JSON.parse(stdout.slice(0, newline))); } catch (error) { reject(error); }
    });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.once('exit', (code) => reject(new Error(`server exited ${code}: ${stderr}`)));
  });
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  try { child.kill('SIGTERM'); } catch {}
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 4_000)),
  ]);
}

function createFixtureProfile(projectDir) {
  const profileDir = path.join(projectDir, 'wld-design-profile');
  fs.mkdirSync(path.join(profileDir, 'design-system'), { recursive: true });
  fs.mkdirSync(path.join(profileDir, 'quality'), { recursive: true });
  fs.mkdirSync(path.join(profileDir, 'screens'), { recursive: true });
  fs.writeFileSync(path.join(profileDir, 'PROFILE.md'), `---
product: fixture
productName: Workflow Fixture
platform: wechat
pageClass: fixture-page
tokenPrefix: fixture
---

# Workflow fixture profile

| Screen | File |
|---|---|
| Decision | \`decision.html\` |
| Reference | \`reference.html\` |
`);
  fs.writeFileSync(path.join(profileDir, 'design-system/tokens.css'), `:root {
  --fixture-bg: #f5f5f5;
  --fixture-surface: #ffffff;
  --fixture-text: rgba(0, 0, 0, 0.9);
  --fixture-divider: rgba(0, 0, 0, 0.12);
  /* Supporting text uses this token sparingly. */
  --fixture-text-body: 14px;
  --fixture-text-caption: 12px;
  /* Cards use the product spacing rhythm. */
  --fixture-space-card: 16px;
}
`);
  fs.writeFileSync(path.join(profileDir, 'design-system/components.css'), `/* Product component semantics remain authoritative during rework. */
.fixture-page {
  min-height: 100%;
  background: var(--fixture-bg);
  color: var(--fixture-text);
}
.fixture-page-body { display: grid; gap: 12px; padding: 16px; }
.brand-hero, .decision-summary, .performance-evidence, .risk-evidence {
  padding: 16px;
  background: var(--fixture-surface);
  border: 1px solid var(--fixture-divider);
}
`);
  fs.writeFileSync(path.join(profileDir, 'quality/workflow-contracts.json'), `${JSON.stringify({
    version: 4,
    templates: {
      'decision.html': {
        requiredTextPerScreen: ['Required disclosure'],
        requiredAssetsPerScreen: [],
        brandIdentitySelectors: ['.brand-hero'],
        diversitySelectors: ['.decision-summary', '.performance-evidence', '.risk-evidence'],
      },
      'reference.html': {
        requiredTextPerScreen: ['Reference-only account value'],
        requiredAssetsPerScreen: [],
        brandIdentitySelectors: [],
        diversitySelectors: [],
      },
    },
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(profileDir, 'screens/decision.html'), `<div class="fixture-page">
  <preview-chrome variant="inner" title="Decision"></preview-chrome>
  <main class="fixture-page-body">
    <div class="brand-hero">Reference decision</div>
    <div class="decision-summary">Required disclosure</div>
    <div class="performance-evidence">Performance evidence</div>
    <div class="risk-evidence">Risk evidence</div>
  </main>
</div>
<style>
.brand-hero { font-weight: 600; }
</style>
`);
  fs.writeFileSync(path.join(profileDir, 'screens/reference.html'), `<div class="fixture-page">
  <preview-chrome variant="inner" title="Reference"></preview-chrome>
  <main class="fixture-page-body">
    <section class="reference-summary">Reference-only account value</section>
    <section class="reference-actions"><button>Reference-only action</button></section>
  </main>
</div>
<style>
.reference-summary { display: grid; gap: 8px; }
.reference-actions { display: flex; justify-content: flex-end; }
</style>
`);
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-workflow-test-'));
createFixtureProfile(temporary);
const port = 4600 + Math.floor(Math.random() * 200);
const server = spawn(process.execPath, [
  SERVER,
  '--project-dir', temporary,
  '--run-label', 'workflow-contract-test',
  '--port', String(port),
], { cwd: BRAINSTORM_DIR, stdio: ['ignore', 'pipe', 'pipe'] });

try {
  const info = await waitForServer(server);
  const common = ['--run-dir', info.runDir, '--stage', 'solutions'];
  const workflowDir = path.join(info.stateDir, 'workflow', 'stages', 'solutions');
  const prepared = run([
    'prepare', ...common,
    '--kind', 'solutions',
    '--approach', 'rework',
    '--brand-mode', 'preserve',
    '--template', 'decision.html',
    '--output', 'solutions.html:3',
  ]);
  assert.equal(prepared.status, 'prepared');
  assert.equal(prepared.outputs.length, 1);
  assert.ok(prepared.contextBytes > 0);
  assert.ok(prepared.contextSources.every((source) => !source.absolute.includes('SKILL.md')));
  assert.equal(prepared.contextSources[0].role, 'instructions');
  assert.equal(fs.realpathSync(prepared.contextSources[0].absolute), fs.realpathSync(path.join(workflowDir, 'worker-brief.md')));
  const primaryContext = prepared.contextSources.find((source) => source.primary);
  assert.ok(primaryContext.absolute.endsWith('/screens/decision.html'));
  assert.equal(primaryContext.role, 'content-authority');
  const referenceContext = prepared.contextSources.find((source) => source.absolute.endsWith('/screens/reference.html'));
  assert.equal(referenceContext.role, 'design-reference');
  const tokensContext = prepared.contextSources.find((source) => source.absolute.endsWith('/design-system/tokens.css'))?.absolute;
  const componentsContext = prepared.contextSources.find((source) => source.absolute.endsWith('/design-system/components.css'))?.absolute;
  assert.ok(tokensContext, 'rework context must include the authoritative token source');
  assert.ok(componentsContext, 'rework context must include the authoritative component source');
  for (const suffix of ['/PROFILE.md', '/references/solution-archetypes.md']) {
    assert.ok(prepared.contextSources.some((source) => source.absolute.endsWith(suffix)),
      `rework worker must receive design guidance: ${suffix}`);
  }
  assert.match(fs.readFileSync(tokensContext, 'utf8'), /Supporting text uses this token sparingly/);
  assert.match(fs.readFileSync(tokensContext, 'utf8'), /Cards use the product spacing rhythm/);
  assert.match(fs.readFileSync(componentsContext, 'utf8'), /Product component semantics remain authoritative/);

  const fragments = path.join(workflowDir, 'fragments');
  const sourceTemplate = fs.readFileSync(path.join(temporary, 'wld-design-profile/screens/decision.html'), 'utf8');
  const sourceParts = (await import('../lib/workflow-contract.cjs')).default.extractTemplateParts(sourceTemplate);
  for (const [index, name] of ['solutions.screen-1.html', 'solutions.screen-2.html', 'solutions.screen-3.html'].entries()) {
    const file = path.join(fragments, name);
    const seeded = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(seeded, /WORKFLOW_SCREEN_/);
    assert.match(seeded, new RegExp(`brainstorm-option-${index + 1}`));
    assert.match(seeded, /Required disclosure/);
  }
  const brief = fs.readFileSync(path.join(workflowDir, 'worker-brief.md'), 'utf8');
  assert.doesNotMatch(brief, /workflow\.mjs" validate|workflow\.mjs" report/);
  assert.match(brief, /Edit exactly[^]*solutions\.screen-1\.html/);
  assert.match(brief, /brand identity anchors/i);
  assert.match(brief, /Brand mode: `preserve`/);
  assert.match(brief, /Treat the supplied tokens\.css and components\.css as authoritative/);
  assert.match(brief, /Read-only app screen corpus/);
  assert.match(brief, /Borrow, combine, or adapt whichever patterns improve this task/);
  assert.match(brief, /screens\/reference\.html/);
  assert.doesNotMatch(brief, /Every screen must retain:[^\n]*Reference-only account value/);
  const preparedContract = JSON.parse(fs.readFileSync(path.join(workflowDir, 'generation-contract.json'), 'utf8'));
  assert.equal(preparedContract.version, 4);
  assert.equal(preparedContract.primarySourceRole, 'content-authority');
  assert.deepEqual(preparedContract.referenceTemplates, ['screens/reference.html']);
  assert.ok(fs.existsSync(path.join(fragments, 'solutions.base.css')));
  const captionsFile = path.join(fragments, 'solutions.captions.json');
  const captions = JSON.parse(fs.readFileSync(captionsFile, 'utf8'))
    .map((caption, index) => ({
      title: caption.title.replace('待命名', '证据优先'),
      subtitle: caption.subtitle.replaceAll('待填写', '保留真实数据并强化风险决策'),
      recommended: index === 1,
      archetype: caption.archetype,
    }));
  assert.deepEqual(
    captions.map((caption) => caption.archetype),
    preparedContract.archetypes.map((entry) => entry.id),
    'prepare must seed each caption with its assigned archetype',
  );
  fs.writeFileSync(captionsFile, `${JSON.stringify(captions, null, 2)}\n`);
  fs.writeFileSync(path.join(fragments, 'solutions.styles.css'), `
.brainstorm-option-1 .decision-summary { border: 1px solid var(--fixture-divider); }
.brainstorm-option-2 .performance-evidence { border: 1px solid var(--fixture-divider); }
.brainstorm-option-3 .risk-evidence { box-shadow: 0 0 0 2px var(--fixture-divider); }
.brainstorm-option-3 .decision-summary,
.brainstorm-option-3 .performance-evidence,
.brainstorm-option-3 .risk-evidence { background: transparent; }
`);

  const topLevelBodyChild = (text, classToken) => {
    const body = text.match(/<main class="fixture-page-body"[^>]*>/);
    assert.ok(body, 'missing page body');
    const tags = [...text.slice(body.index + body[0].length).matchAll(/<\/?div\b[^>]*>/g)];
    let depth = 0;
    let start = null;
    for (const tag of tags) {
      const absolute = body.index + body[0].length + tag.index;
      if (!tag[0].startsWith('</')) {
        if (depth === 0) start = absolute;
        depth += 1;
      } else {
        depth -= 1;
        if (depth === 0 && start !== null) {
          const end = absolute + tag[0].length;
          const child = text.slice(start, end);
          if (new RegExp(`class="[^"]*\\b${classToken}\\b`).test(child)) return { start, end, child };
          start = null;
        }
      }
    }
    throw new Error(`missing top-level child containing ${classToken}`);
  };
  const moveAnchorBefore = (file, anchor, before) => {
    const text = fs.readFileSync(file, 'utf8');
    const moving = topLevelBodyChild(text, anchor);
    const target = topLevelBodyChild(text, before);
    assert.ok(moving.start > target.start, `${anchor} must start after ${before} in the fixture`);
    const without = `${text.slice(0, moving.start)}${text.slice(moving.end)}`;
    fs.writeFileSync(file, `${without.slice(0, target.start)}${moving.child}\n\n    ${without.slice(target.start)}`);
  };
  moveAnchorBefore(path.join(fragments, 'solutions.screen-2.html'), 'performance-evidence', 'decision-summary');
  moveAnchorBefore(path.join(fragments, 'solutions.screen-3.html'), 'risk-evidence', 'decision-summary');

  const referenceFile = path.join(temporary, 'wld-design-profile/screens/reference.html');
  const referenceTemplate = fs.readFileSync(referenceFile, 'utf8');
  fs.appendFileSync(referenceFile, '\n<!-- reference drift -->\n');
  const driftedReference = run(['assemble', ...common], 2);
  assert.equal(driftedReference.status, 'error');
  assert.match(driftedReference.message, /contract source changed after prepare: screens\/reference\.html/);
  fs.writeFileSync(referenceFile, referenceTemplate);

  const assembled = run(['assemble', ...common]);
  assert.equal(assembled.status, 'assembled');
  assert.equal(assembled.artifacts.length, 1);
  const solutionFile = path.join(info.screenDir, 'solutions.html');
  const canonical = fs.readFileSync(solutionFile, 'utf8');
  assert.match(canonical, /^<!DOCTYPE html>/);
  assert.match(canonical, /<meta charset="UTF-8">/);

  const finalScreen = path.join(fragments, 'solutions.screen-3.html');
  const validFinalScreen = fs.readFileSync(finalScreen, 'utf8');
  fs.writeFileSync(finalScreen, '<div class="fixture-page"></div>\n<div class="fixture-page"></div>\n');
  const invalidBoundary = run(['assemble', ...common], 2);
  assert.equal(invalidBoundary.status, 'error');
  assert.match(invalidBoundary.message, /exactly one \.fixture-page root/);
  assert.equal(fs.readFileSync(solutionFile, 'utf8'), canonical, 'transactional assembly must preserve all outputs');
  fs.writeFileSync(finalScreen, validFinalScreen);
  run(['assemble', ...common]);

  fs.appendFileSync(solutionFile, '\n<!-- direct screen edit -->\n');
  const drifted = run(['validate', ...common, '--allow-browser-unavailable'], 1);
  assert.equal(drifted.status, 'blocked');
  assert.ok(drifted.findings.some((finding) => finding.code === 'assembled-drift'));

  run(['assemble', ...common]);
  const contentFile = path.join(fragments, 'solutions.screen-1.html');
  const completeContent = fs.readFileSync(contentFile, 'utf8');
  fs.writeFileSync(contentFile, completeContent.replace('Required disclosure', 'Optional note'));
  run(['assemble', ...common]);
  const missingRequired = run(['validate', ...common, '--allow-browser-unavailable'], 1);
  assert.equal(missingRequired.status, 'blocked');
  assert.ok(missingRequired.findings.some((finding) => finding.code === 'required-text'));
  fs.writeFileSync(contentFile, completeContent);
  run(['assemble', ...common]);
  const passed = run(['validate', ...common]);
  assert.equal(passed.status, 'passed');
  assert.ok(passed.browser.every((item) => item.status === 'passed'));
  assert.ok(passed.browser.every((item) => fs.existsSync(item.screenshot)));

  const unresolvedStyles = path.join(fragments, 'solutions.styles.css');
  const validStyles = fs.readFileSync(unresolvedStyles, 'utf8');
  fs.appendFileSync(unresolvedStyles, '\n.brainstorm-option-1 .decision-summary { background: var(--missing-surface); }\n');
  run(['assemble', ...common]);
  const unresolvedToken = run(['validate', ...common, '--allow-browser-unavailable'], 1);
  assert.equal(unresolvedToken.status, 'blocked');
  assert.ok(unresolvedToken.findings.some((finding) => finding.code === 'unresolved-css-variable'));
  fs.writeFileSync(unresolvedStyles, validStyles);
  run(['assemble', ...common]);
  const repassed = run(['validate', ...common]);
  assert.equal(repassed.status, 'passed');

  const exploreCommon = ['--run-dir', info.runDir, '--stage', 'brand-exploration'];
  const explored = run([
    'prepare', ...exploreCommon,
    '--kind', 'solutions',
    '--approach', 'rework',
    '--brand-mode', 'explore',
    '--template', 'decision.html',
    '--output', 'brand-exploration.html:3',
  ]);
  assert.equal(explored.status, 'prepared');
  const exploreDir = path.join(info.stateDir, 'workflow/stages/brand-exploration');
  const exploreContract = JSON.parse(fs.readFileSync(path.join(exploreDir, 'generation-contract.json'), 'utf8'));
  assert.equal(exploreContract.brandMode, 'explore');
  assert.match(fs.readFileSync(path.join(exploreDir, 'worker-brief.md'), 'utf8'), /Brand mode: `explore`/);

  const selected = run(['select', ...common, '--choice', '2']);
  assert.equal(selected.status, 'selected');
  assert.equal(selected.choice, 2);
  const selection = JSON.parse(fs.readFileSync(path.join(workflowDir, 'selection.json'), 'utf8'));
  const selectedStyles = fs.readFileSync(selection.styles.absolute, 'utf8');
  assert.match(selectedStyles, /\.brand-hero/);
  assert.match(selectedStyles, /\.brainstorm-option-2/);

  const composeCommon = ['--run-dir', info.runDir, '--stage', 'new-screen-solutions'];
  const composed = run([
    'prepare', ...composeCommon,
    '--kind', 'solutions',
    '--approach', 'compose',
    '--template', 'decision.html',
    '--output', 'new-screen-solutions.html:3',
  ]);
  const composeFragments = path.join(
    info.stateDir,
    'workflow/stages/new-screen-solutions/fragments',
  );
  const composedPrimary = composed.contextSources.find((source) => source.primary);
  assert.ok(composedPrimary.absolute.endsWith('/screens/decision.html'));
  assert.equal(composedPrimary.role, 'design-reference');
  assert.ok(composed.contextSources.some((source) => (
    source.absolute.endsWith('/screens/reference.html') && source.role === 'design-reference'
  )));
  assert.match(
    fs.readFileSync(path.join(composeFragments, 'new-screen-solutions.screen-1.html'), 'utf8'),
    /WORKFLOW_SCREEN_1/,
  );

  const blankComposeCommon = ['--run-dir', info.runDir, '--stage', 'blank-page-solutions'];
  const blankComposed = run([
    'prepare', ...blankComposeCommon,
    '--kind', 'solutions',
    '--approach', 'compose',
    '--output', 'blank-page-solutions.html:3',
  ]);
  const blankComposeDir = path.join(
    info.stateDir,
    'workflow/stages/blank-page-solutions',
  );
  const blankComposeFragments = path.join(blankComposeDir, 'fragments');
  const blankContract = JSON.parse(fs.readFileSync(path.join(blankComposeDir, 'generation-contract.json'), 'utf8'));
  assert.equal(blankContract.template, null);
  assert.equal(blankContract.templateSha256, null);
  assert.equal(blankComposed.contextSources.some((source) => source.primary), false);
  assert.ok(blankComposed.contextSources.some((source) => (
    fs.realpathSync(source.absolute) === fs.realpathSync(path.join(temporary, 'wld-design-profile/PROFILE.md'))
  )));
  assert.equal(blankComposed.contextSources.filter((source) => source.role === 'design-reference').length, 2);
  for (const [index, name] of [
    'blank-page-solutions.screen-1.html',
    'blank-page-solutions.screen-2.html',
    'blank-page-solutions.screen-3.html',
  ].entries()) {
    const file = path.join(blankComposeFragments, name);
    assert.match(fs.readFileSync(file, 'utf8'), new RegExp(`WORKFLOW_SCREEN_${index + 1}`));
    // Three intentional alternatives, not three copies: the compose path is
    // meant to produce distinct layouts, and the visual-overlap check reads
    // the rendered signature rather than the markup.
    const composed = [
      '<section class="decision-summary" style="font-size: 32px">新页面方案 1</section>',
      '<section class="decision-summary">新页面方案 2</section><section class="risk-evidence">补充</section>',
      '<section style="background: transparent">新页面方案 3</section>',
    ][index];
    fs.writeFileSync(file, `<div class="fixture-page">
  <preview-chrome variant="inner" title="新页面"></preview-chrome>
  <main class="fixture-page-body">${composed}</main>
</div>\n`);
  }
  const blankCaptionsFile = path.join(blankComposeFragments, 'blank-page-solutions.captions.json');
  const blankArchetypes = JSON.parse(fs.readFileSync(blankCaptionsFile, 'utf8'))
    .map((caption) => caption.archetype);
  fs.writeFileSync(
    blankCaptionsFile,
    `${JSON.stringify([
      { title: '方案 A', subtitle: '全新页面方向 A', recommended: false, archetype: blankArchetypes[0] },
      { title: '方案 B', subtitle: '全新页面方向 B', recommended: true, archetype: blankArchetypes[1] },
      { title: '方案 C', subtitle: '全新页面方向 C', recommended: false, archetype: blankArchetypes[2] },
    ], null, 2)}\n`,
  );
  run(['assemble', ...blankComposeCommon]);
  const blankValidation = run(['validate', ...blankComposeCommon]);
  assert.equal(blankValidation.status, 'passed');
  run(['select', ...blankComposeCommon, '--choice', '2']);

  const previewCommon = ['--run-dir', info.runDir, '--stage', 'profile-preview'];
  const visualReference = path.join(temporary, 'wld-design-profile/design-system/visual-reference.png');
  fs.copyFileSync(path.join(BRAINSTORM_DIR, 'profile/design-system/visual-reference.png'), visualReference);
  const preview = run([
    'prepare', ...previewCommon,
    '--kind', 'screen', '--template', 'decision.html', '--output', 'preview.html:1',
  ]);
  assert.equal(preview.status, 'prepared');
  assert.equal(preview.outputs[0].screenCount, 1);
  assert.ok(preview.contextSources.some((source) => source.absolute === fs.realpathSync(visualReference) && source.role === 'design-reference'));
  run(['assemble', ...previewCommon]);
  const previewValidation = run(['validate', ...previewCommon]);
  assert.equal(previewValidation.status, 'passed');

  const obsoleteFlow = run([
    'prepare', '--run-dir', info.runDir, '--stage', 'obsolete-flow',
    '--kind', 'flow', '--output', 'flow.html:2',
  ], 2);
  assert.match(obsoleteFlow.message, /--kind must be solutions or screen/);

  const obsoletePromotion = run([
    'prepare', '--run-dir', info.runDir, '--stage', 'obsolete-promotion',
    '--kind', 'screen', '--template', 'decision.html', '--output', 'decision-detail.html:1',
    '--from-stage', 'solutions',
  ], 2);
  assert.match(obsoletePromotion.message, /unknown argument: --from-stage/);

  const interactive = run(['report', ...common]);
  assert.equal(interactive.executionMode, 'interactive');
  assert.equal(interactive.context.byRole['design-reference'].files, 1);
  assert.equal(interactive.context.byRole['content-authority'].files, 1);
  assert.equal(interactive.tokens.totalTokens, null);

  const eventsFile = path.join(temporary, 'codex.events.jsonl');
  fs.writeFileSync(eventsFile, `${JSON.stringify({
    type: 'turn.completed',
    usage: {
      input_tokens: 100,
      cached_input_tokens: 80,
      output_tokens: 20,
      reasoning_output_tokens: 5,
    },
  })}\n`);
  const metered = run(['report', ...common, '--codex-events', eventsFile]);
  assert.equal(metered.executionMode, 'codex-exec');
  assert.equal(metered.tokens.totalTokens, 120);
  assert.equal(metered.tokens.uncachedInputTokens, 20);
  assert.equal(metered.tokens.cacheHitRate, 0.8);

  console.log('test-workflow: all checks passed');
} finally {
  await stopServer(server);
  fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
}
