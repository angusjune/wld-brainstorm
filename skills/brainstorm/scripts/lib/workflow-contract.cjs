const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { readProfileConfig } = require('./profile-selection.cjs');

const CONTRACT_VERSION = 4;
const PROFILE_CONTRACT_VERSION = 4;
const CONTRACT_FILENAME = 'generation-contract.json';
const CONTEXT_FILENAME = 'context-manifest.json';
const RESULT_FILENAME = 'workflow-result.json';
const USAGE_FILENAME = 'workflow-usage.json';
const SELECTION_FILENAME = 'selection.json';
const WORKER_BRIEF_FILENAME = 'worker-brief.md';
const DESIGN_CONTEXT_FILENAME = 'design-context.json';
const SELECTION_STYLES_FILENAME = 'selection.styles.css';

function sha256Buffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(file) {
  return sha256Buffer(fs.readFileSync(file));
}

function safeBasename(value, suffix, label) {
  if (typeof value !== 'string' || path.basename(value) !== value || !value.endsWith(suffix)) {
    throw new Error(`${label} must be a basename ending in ${suffix}`);
  }
  if (!/^[a-z0-9][a-z0-9-]*\.[a-z]+$/.test(value)) {
    throw new Error(`${label} must use lowercase kebab-case`);
  }
  return value;
}

function safeTemplateName(value) {
  if (typeof value !== 'string' || path.basename(value) !== value || !value.endsWith('.html')) {
    throw new Error('template must be an HTML basename from profile/screens');
  }
  return value;
}

function safeStageName(value) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error('stage must use lowercase kebab-case');
  }
  return value;
}

function readJson(file, label = file) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`could not read ${label}: ${error.message}`);
  }
  return parsed;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function workflowPaths(runDir, stage) {
  const resolvedRunDir = path.resolve(runDir);
  const absoluteRunDir = fs.existsSync(resolvedRunDir) ? fs.realpathSync(resolvedRunDir) : resolvedRunDir;
  const stageName = safeStageName(stage);
  const stageDir = path.join(absoluteRunDir, 'state', 'workflow', 'stages', stageName);
  return {
    stage: stageName,
    runDir: absoluteRunDir,
    screenDir: path.join(absoluteRunDir, 'screens'),
    stateDir: path.join(absoluteRunDir, 'state'),
    workflowDir: stageDir,
    fragmentDir: path.join(stageDir, 'fragments'),
    renderDir: path.join(stageDir, 'renders'),
    contractFile: path.join(stageDir, CONTRACT_FILENAME),
    contextFile: path.join(stageDir, CONTEXT_FILENAME),
    resultFile: path.join(stageDir, RESULT_FILENAME),
    usageFile: path.join(stageDir, USAGE_FILENAME),
    selectionFile: path.join(stageDir, SELECTION_FILENAME),
    selectionStylesFile: path.join(stageDir, SELECTION_STYLES_FILENAME),
    designContextFile: path.join(stageDir, DESIGN_CONTEXT_FILENAME),
    workerBriefFile: path.join(stageDir, WORKER_BRIEF_FILENAME),
    serverInfoFile: path.join(absoluteRunDir, 'state', 'server-info.json'),
  };
}

function resolveRun(runDir, stage) {
  const paths = workflowPaths(runDir, stage);
  if (!fs.existsSync(paths.serverInfoFile)) {
    throw new Error(`missing server-owned state: ${paths.serverInfoFile}`);
  }
  const info = readJson(paths.serverInfoFile, 'server-info.json');
  const statedRun = path.resolve(info.runDir || '');
  const resolvedRun = fs.existsSync(statedRun) ? fs.realpathSync(statedRun) : statedRun;
  if (resolvedRun !== paths.runDir) throw new Error('run-dir does not match server-info.json');
  const statedProfile = path.resolve(info.profileDir || '');
  const profileDir = fs.existsSync(statedProfile) ? fs.realpathSync(statedProfile) : statedProfile;
  if (!fs.existsSync(profileDir) || !fs.statSync(profileDir).isDirectory()) {
    throw new Error(`profile directory does not exist: ${profileDir}`);
  }
  return { paths, info, profileDir };
}

function loadWorkflowContracts(profileDir) {
  const file = path.join(profileDir, 'quality', 'workflow-contracts.json');
  const payload = readJson(file, 'profile workflow contracts');
  if (payload.version !== PROFILE_CONTRACT_VERSION || !payload.templates || typeof payload.templates !== 'object') {
    throw new Error(`profile workflow contracts must use version ${PROFILE_CONTRACT_VERSION}`);
  }
  for (const [template, contract] of Object.entries(payload.templates)) {
    safeTemplateName(template);
    if (!contract || typeof contract !== 'object') throw new Error(`workflow contract for ${template} must be an object`);
    if (!Array.isArray(contract.requiredTextPerScreen)
      || contract.requiredTextPerScreen.some((value) => typeof value !== 'string')) {
      throw new Error(`workflow contract ${template}.requiredTextPerScreen must be an array of strings`);
    }
    for (const key of ['requiredAssetsPerScreen', 'brandIdentitySelectors', 'diversitySelectors']) {
      if (contract[key] !== undefined
        && (!Array.isArray(contract[key]) || contract[key].some((value) => typeof value !== 'string'))) {
        throw new Error(`workflow contract ${template}.${key} must be an array of strings`);
      }
    }
    for (const selector of contract.brandIdentitySelectors || []) {
      if (!/^\.[a-zA-Z_][\w-]*$/.test(selector)) {
        throw new Error(`workflow contract ${template}.brandIdentitySelectors must contain simple class selectors`);
      }
    }
    for (const selector of contract.diversitySelectors || []) {
      if (!/^\.[a-zA-Z_][\w-]*$/.test(selector)) {
        throw new Error(`workflow contract ${template}.diversitySelectors must contain simple class selectors`);
      }
    }
  }
  return { file, payload };
}

function extractTemplateParts(templateText) {
  // Header comments describe templates and can mention literal `<style>` text.
  // Mask comments without changing offsets before locating actual style tags.
  const searchable = templateText.replace(/<!--[\s\S]*?-->/g, (comment) => ' '.repeat(comment.length));
  const styleMatches = [...searchable.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)];
  const lastStyle = styleMatches.at(-1);
  const openingLength = lastStyle ? lastStyle[0].indexOf(lastStyle[1]) : 0;
  const styles = lastStyle
    ? templateText.slice(lastStyle.index + openingLength, lastStyle.index + openingLength + lastStyle[1].length).trim()
    : '';
  let content = lastStyle
    ? `${templateText.slice(0, lastStyle.index)}${templateText.slice(lastStyle.index + lastStyle[0].length)}`
    : templateText;
  content = content.replace(/^\s*<!--[\s\S]*?-->\s*/, '').trim();
  if (!content) throw new Error('source template has no screen content');
  return { content, styles };
}

function phoneSlide(screen, caption) {
  return `  <div class="phone-slide">\n    <div class="phone-mockup">\n      <div class="phone-screen">\n${indent(screen, 8)}\n      </div>\n    </div>\n    <div class="phone-caption">\n      ${caption.title}\n      <span class="phone-caption-sub">${caption.subtitle}</span>\n    </div>\n  </div>`;
}

function initialScreen(sourceContent, index, options = {}) {
  return options.scaffoldOnly
    ? `<div class="${options.pageClass}">\n  <!-- WORKFLOW_SCREEN_${index + 1}: replace this root with an adapted selection from the prepared source template -->\n</div>\n`
    : `${sourceContent.trim()}\n`;
}

function solutionScreen(sourceContent, index, pageClass) {
  const token = `brainstorm-option-${index + 1}`;
  let replaced = false;
  const content = sourceContent.replace(/\bclass\s*=\s*(["'])([\s\S]*?)\1/g, (match, quote, classes) => {
    if (replaced) return match;
    const values = classes.trim().split(/\s+/);
    if (!values.includes(pageClass)) return match;
    replaced = true;
    return `class=${quote}${[...values, token].join(' ')}${quote}`;
  });
  if (!replaced) throw new Error(`source template has no .${pageClass} root`);
  return `${content.trim()}\n`;
}

function domOutline(sourceContent) {
  const lines = [];
  for (const match of sourceContent.matchAll(/<!--([\s\S]*?)-->|<([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
    if (match[1]) {
      const comment = match[1].replace(/=+/g, '').replace(/\s+/g, ' ').trim();
      if (comment && comment.length <= 100) lines.push(`# ${comment}`);
      continue;
    }
    const classes = match[3].match(/\bclass\s*=\s*(["'])([\s\S]*?)\1/i)?.[2]
      ?.split(/\s+/).filter(Boolean) || [];
    if (classes.length) lines.push(`${match[2].toLowerCase()}.${classes.join('.')}`);
  }
  return [...new Set(lines)];
}

function initialCaptions(screenCount) {
  return Array.from({ length: screenCount }, (_, index) => ({
    title: screenCount === 1 ? '推荐方向' : `方案 ${String.fromCharCode(65 + index)}: 待命名`,
    subtitle: screenCount === 1 ? '完成用户确认的方向' : 'Hypothesis: 待填写 · Tradeoff: 待填写',
  }));
}

function presentationContent(screens, captions) {
  if (!Array.isArray(screens) || !Array.isArray(captions) || screens.length !== captions.length) {
    throw new Error('screen fragments and captions must have the same length');
  }
  const modifier = screens.length === 1 ? ' presentation--single' : '';
  const slides = screens.map((screen, index) => phoneSlide(screen, captions[index])).join('\n');
  return `<div class="phone-gallery${modifier}">\n${slides}\n</div>\n`;
}

function indent(text, spaces) {
  const prefix = ' '.repeat(spaces);
  return text.split('\n').map((line) => `${prefix}${line}`).join('\n');
}

function fragmentNames(outputFile, screenCount) {
  const stem = outputFile.slice(0, -'.html'.length);
  return {
    screens: Array.from({ length: screenCount }, (_, index) => `${stem}.screen-${index + 1}.html`),
    captions: `${stem}.captions.json`,
    baseStyles: `${stem}.base.css`,
    styles: `${stem}.styles.css`,
  };
}

function normalizeOutputs(outputs) {
  if (!Array.isArray(outputs) || outputs.length === 0) throw new Error('at least one output is required');
  const seen = new Set();
  return outputs.map((output) => {
    const file = safeBasename(output.file, '.html', 'output file');
    const screenCount = Number(output.screenCount);
    if (!Number.isInteger(screenCount) || screenCount < 1 || screenCount > 4) {
      throw new Error(`output ${file} screenCount must be an integer from 1 to 4`);
    }
    if (seen.has(file)) throw new Error(`duplicate output: ${file}`);
    seen.add(file);
    return { file, screenCount, fragments: fragmentNames(file, screenCount) };
  });
}

function contextEntry(profileDir, file) {
  const absolute = path.resolve(file);
  const relative = path.relative(profileDir, absolute).replaceAll(path.sep, '/');
  const bytes = fs.statSync(absolute).size;
  return { file: relative, absolute, bytes, sha256: sha256File(absolute) };
}

function uniqueMatches(text, expression, pick = (match) => match[0]) {
  return [...new Set([...text.matchAll(expression)].map(pick).filter(Boolean))].sort();
}

function compactDesignContext({
  template,
  sourceContent,
  profileConfig,
  requiredText,
  requiredAssets,
  brandMode = 'preserve',
  brandIdentitySelectors = [],
  diversitySelectors = [],
  knownCssVariables = [],
  screenCount,
}) {
  const comments = [...sourceContent.matchAll(/<!--[\s\S]*?-->/g)]
    .map((match) => match[0]
      .replace(/^<!--|-->$/g, '')
      .replace(/=+/g, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter((value) => value && value.length <= 100 && !/\bpresentation[-\s]?only\b/i.test(value));
  const classes = uniqueMatches(
    sourceContent,
    /\bclass\s*=\s*(["'])([\s\S]*?)\1/g,
    (match) => match[2].split(/\s+/),
  ).flat();
  const classNames = [...new Set(classes)].sort();
  const assets = uniqueMatches(
    sourceContent,
    /\b(?:src|href)\s*=\s*(["'])(\/profile\/[^"']+)\1/g,
    (match) => match[2],
  );
  return {
    version: CONTRACT_VERSION,
    template,
    pageClass: profileConfig.pageClass,
    platform: profileConfig.platform || null,
    editableProductionContent: true,
    immutableBaseStyles: true,
    requiredText,
    requiredAssets,
    brandMode,
    brandIdentitySelectors,
    diversitySelectors,
    existingAssets: assets,
    sections: [...new Set(comments)],
    domOutline: domOutline(sourceContent),
    classNames,
    cssVariables: knownCssVariables,
    variants: Array.from({ length: screenCount }, (_, index) => `.brainstorm-option-${index + 1}`),
    variationContract: [
      'Create three structurally distinct information-priority treatments by editing the seeded DOM and additive CSS.',
      'Scope every rule below one variant selector.',
      'Reorder, regroup, merge, or introduce components when that improves the decision model.',
      'Preserve required values, assets, actions, legal text, chrome, and brand identity anchors.',
      'Do not use palette changes as the primary difference between options.',
    ],
  };
}

function selectorClassToken(selector) {
  return typeof selector === 'string' && /^\.[a-zA-Z_][\w-]*$/.test(selector)
    ? selector.slice(1)
    : null;
}

function cssVariableDefinitions(styles) {
  return [...new Set([...styles.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)].map((match) => match[1]))].sort();
}

function unresolvedCssVariables(styles, knownCssVariables = []) {
  const known = new Set([...knownCssVariables, ...cssVariableDefinitions(styles)]);
  const unresolved = [];
  for (const match of styles.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)(\s*,)?/g)) {
    if (!known.has(match[1]) && !match[2]) unresolved.push(match[1]);
  }
  return [...new Set(unresolved)].sort();
}

function domStructureFingerprint(content) {
  const outline = [];
  const cleaned = content.replace(/<!--[\s\S]*?-->/g, '');
  for (const match of cleaned.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>|<\/([a-zA-Z][\w-]*)\s*>/g)) {
    if (match[3]) {
      outline.push(`/${match[3].toLowerCase()}`);
      continue;
    }
    const classes = match[2].match(/\bclass\s*=\s*(["'])([\s\S]*?)\1/i)?.[2]
      ?.split(/\s+/)
      .filter((token) => token && !/^brainstorm-option-\d+$/.test(token))
      .sort() || [];
    outline.push(`${match[1].toLowerCase()}${classes.map((token) => `.${token}`).join('')}`);
  }
  return sha256Buffer(outline.join('>'));
}

function solutionQualityReport({
  sourceContent,
  screens,
  styles,
  brandMode = 'preserve',
  brandIdentitySelectors = [],
  diversitySelectors = [],
  knownCssVariables = [],
  requireDiversityAnchors = true,
  auditColorLiterals = brandMode === 'preserve',
}) {
  const findings = [];
  if (auditColorLiterals) {
    const literals = [...new Set([
      ...styles.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi),
    ].map((match) => match[0].toLowerCase()))];
    if (literals.length > 0) {
      findings.push({
        code: 'variant-color-literal',
        message: `variant CSS introduces literal colors (${literals.join(', ')}); reuse profile CSS variables instead`,
      });
    }
  }
  for (const variable of unresolvedCssVariables(styles, knownCssVariables)) {
    findings.push({
      code: 'unresolved-css-variable',
      variable,
      message: `variant CSS references undefined ${variable} without a fallback`,
    });
  }
  for (const identitySelector of brandIdentitySelectors) {
    const token = selectorClassToken(identitySelector);
    const sourceCount = classTokenCount(sourceContent, token);
    for (const [index, screen] of screens.entries()) {
      const screenCount = classTokenCount(screen, token);
      if (sourceCount === 0 || screenCount !== sourceCount) {
        findings.push({
          code: 'brand-identity-anchor',
          screen: index + 1,
          message: `screen ${index + 1} must retain ${sourceCount} ${identitySelector} brand identity anchor(s); found ${screenCount}`,
        });
      }
    }
  }

  const priorityFingerprints = [];
  const domFingerprints = screens.map(domStructureFingerprint);
  if (screens.length > 1 && new Set(domFingerprints).size < screens.length) {
    findings.push({
      code: 'solution-structure-variety',
      message: `expected ${screens.length} distinct DOM compositions; found ${new Set(domFingerprints).size}`,
    });
  }
  if (diversitySelectors.length > 0 && screens.length > 1) {
    for (const [index, screen] of screens.entries()) {
      const positions = [];
      let complete = true;
      for (const selector of diversitySelectors) {
        const token = selectorClassToken(selector);
        const matches = [];
        const cleaned = screen.replace(/<!--[\s\S]*?-->/g, '');
        for (const match of cleaned.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
          const classes = match[2].match(/\bclass\s*=\s*(["'])([\s\S]*?)\1/i)?.[2]
            ?.split(/\s+/).filter(Boolean) || [];
          if (classes.includes(token)) matches.push(match.index);
        }
        if (matches.length !== 1) {
          complete = false;
          if (requireDiversityAnchors) {
            findings.push({
              code: 'solution-structure-anchor',
              screen: index + 1,
              message: `screen ${index + 1} must contain exactly one ${selector} diversity anchor; found ${matches.length}`,
            });
          }
        } else {
          positions.push({ selector, position: matches[0] });
        }
      }
      priorityFingerprints.push(complete
        ? positions.sort((left, right) => left.position - right.position).map((item) => item.selector).join(' > ')
        : null);
    }
  }
  return {
    status: findings.length === 0 ? 'passed' : 'blocked',
    brandMode,
    brandIdentitySelectors,
    diversitySelectors,
    domFingerprints,
    priorityFingerprints,
    findings,
  };
}

function selectAuthorities({ profileDir, skillDir, kind }) {
  const candidates = [
    path.join(profileDir, 'PROFILE.md'),
    path.join(profileDir, 'design-system', 'tokens.css'),
    path.join(profileDir, 'design-system', 'components.css'),
    path.join(profileDir, 'quality', 'workflow-contracts.json'),
  ];
  if (kind === 'solutions') candidates.push(path.join(skillDir, 'references', 'solution-archetypes.md'));
  const defaults = [...new Set(candidates)]
    .filter((file) => fs.existsSync(file))
    .map((file) => contextEntry(profileDir, file));
  return defaults;
}

function selectScreenCorpus(profileDir, primaryTemplate = null) {
  const screenDir = path.join(profileDir, 'screens');
  if (!fs.existsSync(screenDir)) {
    if (primaryTemplate) throw new Error(`primary template is not in the active screen corpus: ${primaryTemplate}`);
    return { primary: null, references: [] };
  }
  const names = fs.readdirSync(screenDir)
    .filter((name) => name.endsWith('.html'))
    .sort();
  if (primaryTemplate && !names.includes(primaryTemplate)) {
    throw new Error(`primary template is not in the active screen corpus: ${primaryTemplate}`);
  }
  const entries = names.map((name) => contextEntry(profileDir, path.join(screenDir, name)));
  return {
    primary: primaryTemplate ? entries.find((entry) => path.basename(entry.absolute) === primaryTemplate) : null,
    references: entries.filter((entry) => path.basename(entry.absolute) !== primaryTemplate),
  };
}

function assembleDocument(pageTemplate, content, styles) {
  const contentMarker = '<!-- SCREEN CONTENT -->';
  const stylesMarker = '<!-- SCREEN STYLES -->';
  if ((pageTemplate.split(contentMarker).length - 1) !== 1 || (pageTemplate.split(stylesMarker).length - 1) !== 1) {
    throw new Error('canonical page template markers are invalid');
  }
  assertContentFragment(content);
  assertStyleFragment(styles);
  const styleBlock = styles.trim() ? `<style>\n${styles.trim()}\n</style>` : '';
  return pageTemplate
    .replace(contentMarker, content.trim())
    .replace(stylesMarker, styleBlock);
}

function assertContentFragment(content) {
  const forbidden = content.match(/<!doctype\b|<\/?(?:html|head|body)\b|<style\b/i);
  if (forbidden) throw new Error(`content fragment contains forbidden document markup: ${forbidden[0]}`);
}

function assertScreenFragment(content, pageClass) {
  assertContentFragment(content);
  for (const token of ['phone-gallery', 'phone-slide', 'phone-mockup', 'phone-screen', 'phone-caption']) {
    if (classTokenCount(content, token) > 0) {
      throw new Error(`screen fragment cannot own presentation wrapper .${token}`);
    }
  }
  const pages = classTokenCount(content, pageClass);
  if (pages !== 1) throw new Error(`screen fragment must contain exactly one .${pageClass} root; found ${pages}`);
}

function validateCaptions(value, count) {
  if (!Array.isArray(value) || value.length !== count) {
    throw new Error(`captions must contain exactly ${count} entries`);
  }
  const captions = value.map((caption, index) => {
    if (!caption || typeof caption !== 'object'
      || typeof caption.title !== 'string' || !caption.title.trim()
      || typeof caption.subtitle !== 'string' || !caption.subtitle.trim()) {
      throw new Error(`caption ${index + 1} must contain non-empty title and subtitle strings`);
    }
    if (/[<>]/.test(caption.title) || /[<>]/.test(caption.subtitle)) {
      throw new Error(`caption ${index + 1} must be plain text`);
    }
    if (caption.recommended !== undefined && typeof caption.recommended !== 'boolean') {
      throw new Error(`caption ${index + 1} recommended must be a boolean`);
    }
    return {
      title: caption.title.trim(),
      subtitle: caption.subtitle.trim(),
      ...(caption.recommended === undefined ? {} : { recommended: caption.recommended }),
    };
  });
  if (captions.filter((caption) => caption.recommended).length > 1) {
    throw new Error('captions may recommend at most one option');
  }
  return captions;
}

function assertStyleFragment(styles) {
  if (/<\/?style\b|<\/?(?:html|head|body)\b/i.test(styles)) {
    throw new Error('style fragment must contain CSS only');
  }
}

function classTokenCount(text, token) {
  const cleaned = text.replace(/<!--[\s\S]*?-->/g, '');
  let count = 0;
  for (const match of cleaned.matchAll(/\bclass\s*=\s*(["'])([\s\S]*?)\1/g)) {
    if (match[2].split(/\s+/).includes(token)) count += 1;
  }
  return count;
}

function screenSegments(text, pageClass) {
  const cleaned = text.replace(/<!--[\s\S]*?-->/g, '');
  const roots = [];
  const elementRe = /<([a-zA-Z][\w-]*)\b([^>]*)>/g;
  let match;
  while ((match = elementRe.exec(cleaned)) !== null) {
    const cls = match[2].match(/class\s*=\s*(["'])(.*?)\1/i);
    if (cls && cls[2].split(/\s+/).includes(pageClass)) {
      roots.push({ start: match.index, tag: match[1].toLowerCase(), openingEnd: elementRe.lastIndex });
    }
  }
  return roots.map((root) => {
    const tagExpression = new RegExp(`<\\/?${root.tag}\\b[^>]*>`, 'gi');
    tagExpression.lastIndex = root.start;
    let depth = 0;
    let tag;
    while ((tag = tagExpression.exec(cleaned)) !== null) {
      if (/^<\//.test(tag[0])) depth -= 1;
      else if (!/\/>$/.test(tag[0])) depth += 1;
      if (depth === 0) return cleaned.slice(root.start, tagExpression.lastIndex);
    }
    return cleaned.slice(root.start);
  });
}

function canonicalShellFindings(text, file) {
  const checks = [
    ['doctype', /<!doctype\s+html\b/i],
    ['html root', /<html\b/i],
    ['UTF-8 charset', /<meta\b[^>]*charset\s*=\s*["']?utf-8\b/i],
    ['tokens stylesheet', /<link\b[^>]*href\s*=\s*["']\/profile\/design-system\/tokens\.css["']/i],
    ['components stylesheet', /<link\b[^>]*href\s*=\s*["']\/profile\/design-system\/components\.css["']/i],
    ['body', /<body\b/i],
    ['frame-content seam', /<div\b[^>]*id\s*=\s*["']frame-content["']/i],
  ];
  return checks.filter(([, expression]) => !expression.test(text)).map(([label]) => ({
    code: 'canonical-shell',
    file,
    message: `missing canonical scaffold ${label}`,
  }));
}

function validateDocument({ text, expectedText, output, pageClass, requiredText }) {
  const findings = canonicalShellFindings(text, output.file);
  if (text !== expectedText) {
    findings.push({ code: 'assembled-drift', file: output.file, message: 'screen differs from deterministic fragment assembly' });
  }
  const counts = {
    phones: classTokenCount(text, 'phone-mockup'),
    phoneScreens: classTokenCount(text, 'phone-screen'),
    pages: classTokenCount(text, pageClass),
    chrome: [...text.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<preview-chrome\b/g)].length,
  };
  for (const [label, count] of Object.entries(counts)) {
    if (count !== output.screenCount) {
      findings.push({
        code: 'screen-count',
        file: output.file,
        message: `expected ${output.screenCount} ${label}, found ${count}`,
      });
    }
  }
  const segments = screenSegments(text, pageClass);
  for (const [index, segment] of segments.entries()) {
    for (const required of requiredText) {
      if (!segment.includes(required)) {
        findings.push({
          code: 'required-text',
          file: output.file,
          screen: index + 1,
          message: `screen ${index + 1} is missing ${JSON.stringify(required)}`,
        });
      }
    }
  }
  if (/<!-- SCREEN (?:CONTENT|STYLES) -->/.test(text)) {
    findings.push({ code: 'unresolved-marker', file: output.file, message: 'canonical insertion marker remains' });
  }
  if (/待命名|待填写/.test(text)) {
    findings.push({ code: 'unresolved-placeholder', file: output.file, message: 'solution caption still contains a workflow placeholder' });
  }
  if (/WORKFLOW_SCREEN_\d+/.test(text)) {
    findings.push({ code: 'unresolved-placeholder', file: output.file, message: 'prepared screen scaffold was not replaced' });
  }
  return { findings, counts };
}

function parseCodexUsage(raw) {
  const usage = {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
    completedTurns: 0,
  };
  for (const line of raw.split('\n')) {
    if (!line.trim().startsWith('{')) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event.type !== 'turn.completed') continue;
    const item = event.usage || {};
    usage.inputTokens += Number(item.input_tokens || 0);
    usage.cachedInputTokens += Number(item.cached_input_tokens || 0);
    usage.outputTokens += Number(item.output_tokens || 0);
    usage.reasoningOutputTokens += Number(item.reasoning_output_tokens || 0);
    usage.completedTurns += 1;
  }
  usage.totalTokens = usage.inputTokens + usage.outputTokens;
  usage.uncachedInputTokens = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  usage.cacheHitRate = usage.inputTokens > 0 ? usage.cachedInputTokens / usage.inputTokens : null;
  return usage;
}

module.exports = {
  CONTRACT_VERSION,
  PROFILE_CONTRACT_VERSION,
  assembleDocument,
  assertScreenFragment,
  compactDesignContext,
  cssVariableDefinitions,
  extractTemplateParts,
  initialCaptions,
  initialScreen,
  solutionScreen,
  solutionQualityReport,
  unresolvedCssVariables,
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
  screenSegments,
  validateDocument,
  validateCaptions,
  workflowPaths,
  writeJson,
};
