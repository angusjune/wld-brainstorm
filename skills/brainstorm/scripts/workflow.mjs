#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import workflow from './lib/workflow-contract.cjs';
import browser from './lib/browser-contract.cjs';
import profileSelection from './lib/profile-selection.cjs';
import telemetry from './lib/session-telemetry.cjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, '..');
const PAGE_TEMPLATE = path.join(SKILL_DIR, 'assets', 'page-template.html');
const { readProfileConfig } = profileSelection;
const { appendSessionEvent, EVENTS } = telemetry;
const {
  assembleDocument,
  assertScreenFragment,
  compactDesignContext,
  cssVariableDefinitions,
  CONTRACT_VERSION,
  extractTemplateParts,
  initialCaptions,
  initialScreen,
  loadWorkflowContracts,
  normalizeOutputs,
  parseCodexUsage,
  presentationContent,
  readJson,
  resolveRun,
  safeTemplateName,
  selectAuthorities,
  selectScreenCorpus,
  sha256File,
  solutionScreen,
  solutionQualityReport,
  unresolvedCssVariables,
  validateDocument,
  validateCaptions,
  workflowPaths,
  writeJson,
} = workflow;

function parseArgs(argv) {
  const command = argv[0];
  const options = { outputs: [] };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--run-dir') options.runDir = argv[++index];
    else if (arg === '--stage') options.stage = argv[++index];
    else if (arg === '--kind') options.kind = argv[++index];
    else if (arg === '--approach') options.approach = argv[++index];
    else if (arg === '--brand-mode') options.brandMode = argv[++index];
    else if (arg === '--template') options.template = argv[++index];
    else if (arg === '--output') {
      const value = argv[++index];
      const split = value.lastIndexOf(':');
      if (split < 1) throw new Error('--output must be <file.html>:<screen-count>');
      options.outputs.push({ file: value.slice(0, split), screenCount: Number(value.slice(split + 1)) });
    } else if (arg === '--choice') options.choice = Number(argv[++index]);
    else if (arg === '--codex-events') options.codexEvents = argv[++index];
    else if (arg === '--chrome') options.chrome = argv[++index];
    else if (arg === '--allow-browser-unavailable') options.allowBrowserUnavailable = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return { command, options };
}

function usage() {
  return `Usage:
  node scripts/workflow.mjs prepare --run-dir <run> --stage <name> --kind <solutions|screen> --output <file.html>:<count> [--approach <rework|compose>] [--brand-mode <preserve|explore>] [--template <profile-screen.html>] [--output ...]
  node scripts/workflow.mjs select --run-dir <run> --stage <name> --choice <1-based-index>
  node scripts/workflow.mjs assemble --run-dir <run> --stage <name>
  node scripts/workflow.mjs validate --run-dir <run> --stage <name> [--chrome <path>] [--allow-browser-unavailable]
  node scripts/workflow.mjs report --run-dir <run> --stage <name> [--codex-events <events.jsonl>]

Every command prints JSON. validate exits 1 unless the terminal contract passes.`;
}

function record(stateDir, event, details) {
  appendSessionEvent(stateDir, event, details);
}

function assertOutputOwnership(paths, outputs) {
  const stagesDir = path.dirname(paths.workflowDir);
  if (!fs.existsSync(stagesDir)) return;
  const requested = new Set(outputs.map((output) => output.file));
  for (const entry of fs.readdirSync(stagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === paths.stage) continue;
    const contractFile = path.join(stagesDir, entry.name, 'generation-contract.json');
    if (!fs.existsSync(contractFile)) continue;
    const existing = readJson(contractFile, `workflow stage ${entry.name}`);
    for (const output of existing.outputs || []) {
      if (requested.has(output.file)) {
        throw new Error(`output ${output.file} is already owned by workflow stage ${entry.name}`);
      }
    }
  }
}

function loadPrepared(runDir, stage) {
  const resolved = resolveRun(runDir, stage);
  if (!fs.existsSync(resolved.paths.contractFile)) throw new Error('workflow is not prepared');
  const contract = readJson(resolved.paths.contractFile, 'generation contract');
  if (contract.version !== CONTRACT_VERSION) throw new Error('generation contract version is unsupported');
  if (path.resolve(contract.runDir) !== resolved.paths.runDir) throw new Error('generation contract run path drifted');
  if (path.resolve(contract.profile.dir) !== resolved.profileDir) throw new Error('generation contract profile path drifted');
  return { ...resolved, contract };
}

function assertSources(contract) {
  for (const source of contract.sources) {
    if (!fs.existsSync(source.absolute)) throw new Error(`contract source disappeared: ${source.file}`);
    if (sha256File(source.absolute) !== source.sha256) throw new Error(`contract source changed after prepare: ${source.file}`);
  }
}

function outputStyles(paths, output) {
  const base = path.join(paths.fragmentDir, output.fragments.baseStyles);
  const variant = path.join(paths.fragmentDir, output.fragments.styles);
  return [base, variant]
    .filter((file) => fs.existsSync(file))
    .map((file) => fs.readFileSync(file, 'utf8').trim())
    .filter(Boolean)
    .join('\n\n');
}

function assertImmutableFragments(paths, output) {
  if (!output.immutableBaseStyles) return;
  const baseStyles = path.join(paths.fragmentDir, output.fragments.baseStyles);
  if (sha256File(baseStyles) !== output.baseStylesSha256) {
    throw new Error(`production base styles changed: ${output.fragments.baseStyles}`);
  }
}

function stageBrief({
  paths, kind, approach, template, outputs, authorities, primary, primaryRole, references,
  requiredText, requiredAssets, brandMode, brandIdentitySelectors, diversitySelectors,
}) {
  const templateLabel = template || 'none — compose a profile-grounded new page';
  const lines = [
    '# Isolated Brainstorm stage', '',
    `Stage: \`${paths.stage}\` · kind: \`${kind}\` · template: \`${templateLabel}\``, '',
    'Treat this file as the complete mechanical contract for this worker. Use the task in the dispatch prompt for design intent.', '',
  ];
  if (primary) {
    lines.push(
      primaryRole === 'content-authority'
        ? 'Primary production source — its task facts, actions, required content, and legal meaning are authoritative:'
        : 'Closest production analogue — use it as the strongest design reference, not as task content authority:',
      '',
      `- \`${primary.absolute}\``,
      '',
    );
  }
  lines.push('Authoritative product and design-system sources:', '');
  for (const entry of authorities) lines.push(`- \`${entry.absolute}\``);
  lines.push(
    '',
    'Read-only app screen corpus — use it freely as a library of proven composition, hierarchy, spacing, interaction, and component patterns:',
    '',
  );
  for (const entry of references) lines.push(`- \`${entry.absolute}\``);
  lines.push(
    '',
    'Reference screens are precedent, not mandatory ingredients. Borrow, combine, or adapt whichever patterns improve this task. Their business values, legal copy, assets, and actions become requirements only when the user intent or an authoritative source independently requires them.',
  );
  lines.push('', 'Edit exactly these prepared files:', '');
  for (const output of outputs) {
    for (const name of output.fragments.screens) lines.push(`- \`${path.join(paths.fragmentDir, name)}\``);
    lines.push(`- \`${path.join(paths.fragmentDir, output.fragments.captions)}\``);
    lines.push(`- \`${path.join(paths.fragmentDir, output.fragments.styles)}\``);
  }
  if (approach === 'rework') {
    lines.push('',
      'The three screen files are editable copies of production markup; the prepared `.base.css` is read-only. Reorder, regroup, merge, or introduce components when that creates a meaningfully different decision model. Use additive CSS scoped under each prepared `.brainstorm-option-N` root.',
      `Brand mode: \`${brandMode}\`.`,
      `Brand identity anchors: ${brandIdentitySelectors.length ? brandIdentitySelectors.join(', ') : 'none declared'}. Keep each anchor present, including required assets and content, while freely changing its layout, typography, spacing, shape, modifier classes, and scoped styling.`,
      `Structural diversity anchors: ${diversitySelectors.length ? diversitySelectors.join(', ') : 'none declared'}. Keep each declared anchor exactly once per screen. All three DOM compositions must differ. Anchor priority order is reported as diagnostic evidence, not prescribed as the only valid source of variety.`,
      brandMode === 'explore'
        ? 'Explore the requested brand direction while preserving identity anchors, required assets/content, chrome relationship, canonical CTA form, real values, required actions, and legal copy. New colors are allowed; visual screenshot review decides brand coherence and contrast.'
        : 'Preserve the production palette, chrome relationship, canonical CTA form, real values, required actions, assets, and legal copy. Use profile CSS variables for colors; every var() reference must resolve or include a fallback.',
    );
  }
  lines.push('', `Every screen must retain: ${requiredText.length ? requiredText.map((value) => JSON.stringify(value)).join(', ') : 'no additional required text'}.`);
  if (requiredAssets.length) lines.push(`Every screen must retain these assets: ${requiredAssets.join(', ')}.`);
  if (authorities.some((entry) => entry.file.endsWith('design-system/tokens.css'))
    && authorities.some((entry) => entry.file.endsWith('design-system/components.css'))) {
    lines.push(
      '',
      'Treat the supplied tokens.css and components.css as authoritative. Preserve their semantic mappings, values, usage patterns, and comments instead of reconstructing them from variable names. Use declared tokens and existing component patterns; simplify by removing, merging, or regrouping content rather than inventing smaller type, spacing, or controls.',
    );
  }
  lines.push('',
    'Make one coherent edit pass. Write no progress narration and run no commands; the parent owns assembly, QA, browser validation, repair, and usage reporting.', '',
    `Completion criterion: every editable file is complete${kind === 'solutions' ? ' and exactly one caption has `"recommended": true`' : ''}; stop without reading the parent skill, other stages, assembled output, or undeclared files outside the listed app screen corpus.`, '',
  );
  return lines.join('\n');
}

function prepare(options) {
  const started = performance.now();
  if (!options.runDir || !options.stage || !options.kind) throw new Error('prepare requires --run-dir, --stage, and --kind');
  if (!['solutions', 'screen'].includes(options.kind)) throw new Error('--kind must be solutions or screen');
  if (options.kind === 'solutions' && !['rework', 'compose'].includes(options.approach)) {
    throw new Error('solutions prepare requires --approach rework or compose');
  }
  if (options.kind !== 'solutions' && options.approach) throw new Error('--approach is only valid for solutions');
  if (options.brandMode && options.kind !== 'solutions') throw new Error('--brand-mode is only valid for solutions');
  const brandMode = options.brandMode || 'preserve';
  if (!['preserve', 'explore'].includes(brandMode)) throw new Error('--brand-mode must be preserve or explore');
  if (!options.template && options.approach === 'rework') throw new Error('rework requires --template');
  if (!options.template && options.kind !== 'solutions') throw new Error('screen prepare requires --template');
  const { paths, info, profileDir } = resolveRun(options.runDir, options.stage);
  if (fs.existsSync(paths.contractFile)) throw new Error('workflow is already prepared for this run');
  const template = options.template ? safeTemplateName(options.template) : null;
  const outputs = normalizeOutputs(options.outputs);
  assertOutputOwnership(paths, outputs);
  const templateFile = template ? path.join(profileDir, 'screens', template) : null;
  if (templateFile && !fs.existsSync(templateFile)) throw new Error(`template is not in the active profile: ${template}`);
  const contracts = loadWorkflowContracts(profileDir);
  const templateContract = template ? contracts.payload.templates[template] : {
    requiredTextPerScreen: [],
    requiredAssetsPerScreen: [],
    brandIdentitySelectors: [],
    diversitySelectors: [],
  };
  if (!templateContract) throw new Error(`profile workflow contract does not declare ${template}`);
  const profileConfig = readProfileConfig(profileDir);
  if (!profileConfig.pageClass) throw new Error('active profile does not declare pageClass');
  const source = templateFile
    ? extractTemplateParts(fs.readFileSync(templateFile, 'utf8'))
    : { content: '', styles: '' };
  const rework = options.kind === 'solutions' && options.approach === 'rework';
  const tokenFiles = [
    path.join(profileDir, 'design-system', 'tokens.css'),
    path.join(profileDir, 'design-system', 'components.css'),
  ];
  const knownCssVariables = [...new Set(tokenFiles
    .filter((file) => fs.existsSync(file))
    .flatMap((file) => cssVariableDefinitions(fs.readFileSync(file, 'utf8')))
    .concat(cssVariableDefinitions(source.styles)))].sort();
  fs.mkdirSync(paths.fragmentDir, { recursive: true });
  fs.mkdirSync(paths.screenDir, { recursive: true });
  for (const output of outputs) {
    for (const [index, name] of output.fragments.screens.entries()) {
      const initial = rework
        ? solutionScreen(source.content, index, profileConfig.pageClass)
        : initialScreen(source.content, index, {
          scaffoldOnly: options.kind === 'solutions' && output.screenCount > 1,
          pageClass: profileConfig.pageClass,
        });
      fs.writeFileSync(path.join(paths.fragmentDir, name), initial);
    }
    writeJson(path.join(paths.fragmentDir, output.fragments.captions), initialCaptions(output.screenCount));
    const styles = rework ? '' : source.styles;
    const baseStyles = rework ? source.styles : '';
    fs.writeFileSync(path.join(paths.fragmentDir, output.fragments.baseStyles), `${baseStyles.trim()}\n`);
    fs.writeFileSync(path.join(paths.fragmentDir, output.fragments.styles), `${styles.trim()}\n`);
    output.immutableBaseStyles = rework;
    output.baseStylesSha256 = sha256File(path.join(paths.fragmentDir, output.fragments.baseStyles));
  }
  let authorities;
  if (rework) {
    writeJson(paths.designContextFile, compactDesignContext({
      template,
      sourceContent: source.content,
      sourceStyles: source.styles,
      profileConfig,
      requiredText: templateContract.requiredTextPerScreen || [],
      requiredAssets: templateContract.requiredAssetsPerScreen || [],
      brandMode,
      brandIdentitySelectors: templateContract.brandIdentitySelectors || [],
      diversitySelectors: templateContract.diversitySelectors || [],
      knownCssVariables,
      screenCount: outputs[0].screenCount,
    }));
    const reworkContext = [
      {
        file: path.relative(profileDir, paths.designContextFile).replaceAll(path.sep, '/'),
        absolute: paths.designContextFile,
        bytes: fs.statSync(paths.designContextFile).size,
        sha256: sha256File(paths.designContextFile),
      },
      ...tokenFiles
        .filter((file) => fs.existsSync(file))
        .map((file) => ({
          file: path.relative(profileDir, file).replaceAll(path.sep, '/'),
          absolute: file,
          bytes: fs.statSync(file).size,
          sha256: sha256File(file),
        })),
    ];
    authorities = [...new Map(reworkContext.map((entry) => [entry.absolute, entry])).values()];
  } else {
    authorities = selectAuthorities({
      profileDir,
      skillDir: SKILL_DIR,
      kind: options.kind,
    });
  }
  const corpus = selectScreenCorpus(profileDir, template);
  const primaryRole = corpus.primary && options.kind === 'solutions' && options.approach === 'compose'
    ? 'design-reference'
    : corpus.primary ? 'content-authority' : null;
  const requiredText = templateContract.requiredTextPerScreen || [];
  const requiredAssets = templateContract.requiredAssetsPerScreen || [];
  const brandIdentitySelectors = options.kind === 'solutions'
    ? templateContract.brandIdentitySelectors || [] : [];
  const diversitySelectors = options.kind === 'solutions'
    ? templateContract.diversitySelectors || [] : [];
  fs.writeFileSync(paths.workerBriefFile, stageBrief({
    paths, kind: options.kind, approach: options.approach, template, outputs, authorities,
    primary: corpus.primary, primaryRole, references: corpus.references,
    requiredText, requiredAssets, brandMode, brandIdentitySelectors, diversitySelectors,
  }));
  const context = [{
    file: `state/workflow/stages/${paths.stage}/${path.basename(paths.workerBriefFile)}`,
    absolute: paths.workerBriefFile,
    bytes: fs.statSync(paths.workerBriefFile).size,
    sha256: sha256File(paths.workerBriefFile),
    role: 'instructions',
  }];
  if (corpus.primary) context.push({ ...corpus.primary, role: primaryRole, primary: true });
  context.push(
    ...authorities.map((entry) => ({ ...entry, role: 'authority' })),
    ...corpus.references.map((entry) => ({ ...entry, role: 'design-reference' })),
  );
  const uniqueContext = [...new Map(context.map((entry) => [entry.absolute, entry])).values()];
  const sources = uniqueContext.map((entry) => ({ ...entry }));
  if (templateFile && !sources.some((entry) => entry.absolute === templateFile)) {
    sources.push({
      file: `screens/${template}`,
      absolute: templateFile,
      bytes: fs.statSync(templateFile).size,
      sha256: sha256File(templateFile),
      role: 'source-integrity',
    });
  }
  sources.push({
    file: 'assets/page-template.html',
    absolute: PAGE_TEMPLATE,
    bytes: fs.statSync(PAGE_TEMPLATE).size,
    sha256: sha256File(PAGE_TEMPLATE),
    role: 'assembly-source',
  });
  const byRole = {};
  for (const entry of uniqueContext) {
    const summary = byRole[entry.role] || { files: 0, bytes: 0 };
    summary.files += 1;
    summary.bytes += entry.bytes;
    byRole[entry.role] = summary;
  }
  const contextManifest = {
    version: CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    files: uniqueContext,
    totals: {
      files: uniqueContext.length,
      bytes: uniqueContext.reduce((total, entry) => total + entry.bytes, 0),
      byRole,
    },
  };
  const contract = {
    version: CONTRACT_VERSION,
    preparedAt: new Date().toISOString(),
    stage: paths.stage,
    kind: options.kind,
    approach: options.approach || null,
    brandMode: options.kind === 'solutions' ? brandMode : null,
    runDir: paths.runDir,
    profile: {
      dir: profileDir,
      source: info.profileSource,
      pageClass: profileConfig.pageClass,
      platform: profileConfig.platform || null,
    },
    template,
    templateSha256: templateFile ? sha256File(templateFile) : null,
    primarySourceRole: primaryRole,
    referenceTemplates: corpus.references.map((entry) => entry.file),
    requiredTextPerScreen: requiredText,
    requiredAssetsPerScreen: requiredAssets,
    brandIdentitySelectors,
    diversitySelectors,
    knownCssVariables,
    outputs,
    sources,
    contextManifest: path.relative(paths.workflowDir, paths.contextFile),
  };
  writeJson(paths.contextFile, contextManifest);
  writeJson(paths.contractFile, contract);
  const result = {
    status: 'prepared',
    stage: paths.stage,
    durationMs: Math.round(performance.now() - started),
    contractFile: paths.contractFile,
    contextFile: paths.contextFile,
    fragmentDir: paths.fragmentDir,
    workerBriefFile: paths.workerBriefFile,
    contextSources: uniqueContext.map(({ absolute, role, primary = false }) => ({ absolute, role, primary })),
    contextBytes: contextManifest.totals.bytes,
    contextByRole: contextManifest.totals.byRole,
    outputs,
  };
  record(paths.stateDir, EVENTS.WORKFLOW_PREPARED, result);
  return result;
}

function select(options) {
  const started = performance.now();
  if (!options.runDir || !options.stage || !Number.isInteger(options.choice)) {
    throw new Error('select requires --run-dir, --stage, and an integer --choice');
  }
  const { paths, contract } = loadPrepared(options.runDir, options.stage);
  if (contract.outputs.length !== 1) {
    throw new Error('select requires a stage with exactly one output');
  }
  if (!fs.existsSync(paths.resultFile)
    || readJson(paths.resultFile, `workflow result ${paths.stage}`).status !== 'passed') {
    throw new Error('select requires a validated stage');
  }
  const output = contract.outputs[0];
  if (options.choice < 1 || options.choice > output.screenCount) {
    throw new Error(`--choice must be from 1 to ${output.screenCount}`);
  }
  const screenName = output.fragments.screens[options.choice - 1];
  const screenFile = path.join(paths.fragmentDir, screenName);
  const stylesFile = path.join(paths.fragmentDir, output.fragments.styles);
  const captions = validateCaptions(
    readJson(path.join(paths.fragmentDir, output.fragments.captions), `${output.file} captions`),
    output.screenCount,
  );
  if (!fs.existsSync(screenFile) || !fs.existsSync(stylesFile)) throw new Error('selected direction fragments are incomplete');
  assertScreenFragment(fs.readFileSync(screenFile, 'utf8'), contract.profile.pageClass);
  fs.writeFileSync(paths.selectionStylesFile, `${outputStyles(paths, output).trim()}\n`);
  const selection = {
    version: CONTRACT_VERSION,
    selectedAt: new Date().toISOString(),
    stage: paths.stage,
    template: contract.template,
    output: output.file,
    choice: options.choice,
    caption: captions[options.choice - 1],
    screen: {
      file: path.relative(paths.runDir, screenFile).replaceAll(path.sep, '/'),
      absolute: screenFile,
      bytes: fs.statSync(screenFile).size,
      sha256: sha256File(screenFile),
    },
    styles: {
      file: path.relative(paths.runDir, paths.selectionStylesFile).replaceAll(path.sep, '/'),
      absolute: paths.selectionStylesFile,
      bytes: fs.statSync(paths.selectionStylesFile).size,
      sha256: sha256File(paths.selectionStylesFile),
    },
    durationMs: Math.round(performance.now() - started),
  };
  writeJson(paths.selectionFile, selection);
  return { status: 'selected', stage: paths.stage, choice: options.choice, selectionFile: paths.selectionFile };
}

function assemble(options) {
  const started = performance.now();
  if (!options.runDir || !options.stage) throw new Error('assemble requires --run-dir and --stage');
  const { paths, contract } = loadPrepared(options.runDir, options.stage);
  assertSources(contract);
  const pageTemplate = fs.readFileSync(PAGE_TEMPLATE, 'utf8');
  const pending = [];
  for (const output of contract.outputs) {
    assertImmutableFragments(paths, output);
    const screenFiles = output.fragments.screens.map((name) => path.join(paths.fragmentDir, name));
    const captionsFile = path.join(paths.fragmentDir, output.fragments.captions);
    const stylesFile = path.join(paths.fragmentDir, output.fragments.styles);
    if (screenFiles.some((file) => !fs.existsSync(file)) || !fs.existsSync(captionsFile) || !fs.existsSync(stylesFile)) {
      throw new Error(`output fragments are incomplete for ${output.file}`);
    }
    const screens = screenFiles.map((file) => fs.readFileSync(file, 'utf8'));
    screens.forEach((screen) => assertScreenFragment(screen, contract.profile.pageClass));
    const captions = validateCaptions(readJson(captionsFile, `${output.file} captions`), output.screenCount);
    if (contract.kind === 'solutions' && captions.filter((caption) => caption.recommended).length !== 1) {
      throw new Error(`${output.file} captions must recommend exactly one option`);
    }
    const content = presentationContent(screens, captions);
    const html = assembleDocument(
      pageTemplate,
      content,
      outputStyles(paths, output),
    );
    pending.push({ output, html, target: path.join(paths.screenDir, output.file) });
  }
  const artifacts = [];
  for (const item of pending) {
    const temporary = `${item.target}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, item.html);
    fs.renameSync(temporary, item.target);
    artifacts.push({ file: item.output.file, bytes: fs.statSync(item.target).size, sha256: sha256File(item.target) });
  }
  const result = {
    status: 'assembled',
    stage: paths.stage,
    assembledAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - started),
    artifacts,
  };
  writeJson(path.join(paths.workflowDir, 'assembly.json'), result);
  record(paths.stateDir, EVENTS.WORKFLOW_ASSEMBLED, result);
  return result;
}

function runQa(profileDir, files) {
  const result = spawnSync(process.execPath, [
    path.join(SKILL_DIR, 'scripts', 'run-qa-gate.mjs'),
    '--json', '--profile', profileDir, ...files,
  ], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  try {
    return { processExit: result.status, ...JSON.parse(result.stdout) };
  } catch {
    return {
      processExit: result.status,
      errors: 1,
      warnings: 0,
      files: [],
      parserError: result.stderr || result.stdout || 'QA gate returned no JSON',
    };
  }
}

async function validate(options) {
  const started = performance.now();
  if (!options.runDir || !options.stage) throw new Error('validate requires --run-dir and --stage');
  const { paths, info, profileDir, contract } = loadPrepared(options.runDir, options.stage);
  assertSources(contract);
  const pageTemplate = fs.readFileSync(PAGE_TEMPLATE, 'utf8');
  const findings = [];
  const documents = [];
  const solutionQuality = [];
  for (const output of contract.outputs) {
    const screenFile = path.join(paths.screenDir, output.file);
    const screenFiles = output.fragments.screens.map((name) => path.join(paths.fragmentDir, name));
    const captionsFile = path.join(paths.fragmentDir, output.fragments.captions);
    const stylesFile = path.join(paths.fragmentDir, output.fragments.styles);
    if (!fs.existsSync(screenFile) || screenFiles.some((file) => !fs.existsSync(file))
      || !fs.existsSync(captionsFile) || !fs.existsSync(stylesFile)) {
      findings.push({ code: 'missing-artifact', file: output.file, message: 'assembled output or fragment is missing' });
      continue;
    }
    let expected;
    let screens;
    try {
      screens = screenFiles.map((file) => fs.readFileSync(file, 'utf8'));
      screens.forEach((screen) => assertScreenFragment(screen, contract.profile.pageClass));
      const captions = validateCaptions(readJson(captionsFile, `${output.file} captions`), output.screenCount);
      expected = assembleDocument(
        pageTemplate,
        presentationContent(screens, captions),
        outputStyles(paths, output),
      );
    } catch (error) {
      findings.push({ code: 'fragment-contract', file: output.file, message: error.message });
      continue;
    }
    const text = fs.readFileSync(screenFile, 'utf8');
    const document = validateDocument({
      text,
      expectedText: expected,
      output,
      pageClass: contract.profile.pageClass,
      requiredText: contract.requiredTextPerScreen,
    });
    for (const asset of contract.requiredAssetsPerScreen || []) {
      for (const screen of workflow.screenSegments?.(text, contract.profile.pageClass) || []) {
        if (!screen.includes(asset)) findings.push({ code: 'required-asset', file: output.file, message: `screen is missing ${asset}` });
      }
    }
    findings.push(...document.findings);
    if (!(contract.kind === 'solutions' && contract.approach === 'rework')) {
      for (const variable of unresolvedCssVariables(outputStyles(paths, output), contract.knownCssVariables || [])) {
        findings.push({
          code: 'unresolved-css-variable',
          file: output.file,
          variable,
          message: `styles reference undefined ${variable} without a fallback`,
        });
      }
    }
    if (contract.kind === 'solutions' && contract.approach === 'rework') {
      const templateFile = path.join(profileDir, 'screens', contract.template);
      const sourceContent = extractTemplateParts(fs.readFileSync(templateFile, 'utf8')).content;
      const quality = solutionQualityReport({
        sourceContent,
        screens,
        styles: fs.readFileSync(stylesFile, 'utf8'),
        brandMode: contract.brandMode || 'preserve',
        brandIdentitySelectors: contract.brandIdentitySelectors || [],
        diversitySelectors: contract.diversitySelectors || [],
        knownCssVariables: contract.knownCssVariables || [],
      });
      solutionQuality.push({ file: output.file, ...quality });
      findings.push(...quality.findings.map((finding) => ({ ...finding, file: output.file })));
    }
    documents.push({ file: output.file, ...document.counts, sha256: sha256File(screenFile) });
  }
  const qa = runQa(profileDir, contract.outputs.map((output) => path.join(paths.screenDir, output.file)));
  if (qa.errors > 0) findings.push({ code: 'qa-gate', message: `QA gate retained ${qa.errors} error(s)` });
  const browserChecks = [];
  for (const output of contract.outputs) {
    if (!info.url) {
      browserChecks.push({ file: output.file, status: 'unavailable', reason: 'server-info has no preview URL', findings: [] });
      continue;
    }
    browserChecks.push({
      file: output.file,
      ...await browser.inspectPage({
        url: new URL(output.file, `${info.url}/`).href,
        pageClass: contract.profile.pageClass,
        expectedScreens: output.screenCount,
        chromePath: options.chrome,
        screenshotPath: path.join(paths.renderDir, `${output.file}.png`),
      }),
    });
  }
  for (const check of browserChecks) {
    if (check.status === 'failed') {
      for (const message of check.findings) findings.push({ code: 'browser-contract', file: check.file, message });
    } else if (check.status === 'unavailable' && !options.allowBrowserUnavailable) {
      findings.push({ code: 'browser-unavailable', file: check.file, message: check.reason });
    }
  }
  const result = {
    version: 1,
    stage: paths.stage,
    status: findings.length === 0 ? 'passed' : 'blocked',
    validatedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - started),
    contractSha256: sha256File(paths.contractFile),
    findings,
    documents,
    solutionQuality,
    qa,
    browser: browserChecks,
  };
  writeJson(paths.resultFile, result);
  record(paths.stateDir, EVENTS.WORKFLOW_VALIDATED, {
    stage: paths.stage,
    status: result.status,
    errors: findings.length,
    durationMs: result.durationMs,
  });
  if (result.status !== 'passed') process.exitCode = 1;
  return result;
}

function report(options) {
  const started = performance.now();
  if (!options.runDir || !options.stage) throw new Error('report requires --run-dir and --stage');
  const { paths, contract } = loadPrepared(options.runDir, options.stage);
  const context = readJson(paths.contextFile, 'context manifest');
  const result = fs.existsSync(paths.resultFile) ? readJson(paths.resultFile, 'workflow result') : null;
  const eventsFile = path.join(paths.stateDir, 'session-events.jsonl');
  const events = fs.existsSync(eventsFile)
    ? fs.readFileSync(eventsFile, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
    : [];
  let tokenUsage = {
    source: null,
    inputTokens: null,
    cachedInputTokens: null,
    uncachedInputTokens: null,
    outputTokens: null,
    reasoningOutputTokens: null,
    totalTokens: null,
    cacheHitRate: null,
    completedTurns: null,
  };
  if (options.codexEvents) {
    const parsed = parseCodexUsage(fs.readFileSync(path.resolve(options.codexEvents), 'utf8'));
    tokenUsage = { source: 'codex-exec-jsonl', ...parsed };
  }
  const stageEvent = (name) => events.filter((event) => (
    event.event === name && event.stage === paths.stage
  )).at(-1) || null;
  const usage = {
    version: 1,
    generatedAt: new Date().toISOString(),
    executionMode: options.codexEvents ? 'codex-exec' : 'interactive',
    status: result?.status || 'incomplete',
    context: {
      files: context.totals.files,
      bytes: context.totals.bytes,
      byRole: context.totals.byRole,
    },
    tokens: tokenUsage,
    stages: {
      prepareMs: stageEvent(EVENTS.WORKFLOW_PREPARED)?.durationMs ?? null,
      assembleMs: stageEvent(EVENTS.WORKFLOW_ASSEMBLED)?.durationMs ?? null,
      validateMs: stageEvent(EVENTS.WORKFLOW_VALIDATED)?.durationMs ?? null,
    },
    validation: result ? {
      findings: result.findings.length,
      qaErrors: result.qa.errors,
      qaWarnings: result.qa.warnings,
      browser: result.browser.map(({ file, status }) => ({ file, status })),
    } : null,
    artifacts: contract.outputs.map((output) => {
      const file = path.join(paths.screenDir, output.file);
      return fs.existsSync(file)
        ? { file: output.file, bytes: fs.statSync(file).size, sha256: sha256File(file) }
        : { file: output.file, bytes: null, sha256: null };
    }),
    reportDurationMs: Math.round(performance.now() - started),
  };
  writeJson(paths.usageFile, usage);
  record(paths.stateDir, EVENTS.WORKFLOW_USAGE_RECORDED, {
    stage: paths.stage,
    executionMode: usage.executionMode,
  });
  return usage;
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === '--help' || command === '-h' || options.help || !command) {
    console.log(usage());
    return;
  }
  let result;
  if (command === 'prepare') result = prepare(options);
  else if (command === 'select') result = select(options);
  else if (command === 'assemble') result = assemble(options);
  else if (command === 'validate') result = await validate(options);
  else if (command === 'report') result = report(options);
  else throw new Error(`unknown workflow command: ${command}`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'error', message: error.message }));
  process.exitCode = 2;
});
