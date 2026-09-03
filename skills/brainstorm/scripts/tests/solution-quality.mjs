#!/usr/bin/env node

import assert from 'node:assert/strict';

import workflow from '../lib/workflow-contract.cjs';

const {
  screenSegments,
  solutionQualityReport,
} = workflow;
const solutionQualityFindings = (options) => solutionQualityReport(options).findings;

const source = `<div class="fixture-page">
  <div class="brand-hero">Brand header</div>
  <main>
    <section class="decision-summary">Summary</section>
    <section class="performance-evidence">Performance</section>
    <section class="risk-evidence">Risk</section>
  </main>
</div>`;

const screen = (order) => `<div class="fixture-page brainstorm-option-1">
  <div class="brand-hero">Brand header</div>
  <main>${order.map((name) => `<section class="${name}">${name}</section>`).join('')}</main>
</div>`;

const selectors = ['.decision-summary', '.performance-evidence', '.risk-evidence'];
const repeatedScreens = Array.from({ length: 3 }, () => screen(selectors.map((value) => value.slice(1))));
const repeatedFindings = solutionQualityFindings({
  sourceContent: source,
  screens: repeatedScreens,
  styles: `.brainstorm-option-1 .brand-hero {
    background: linear-gradient(145deg, #0b4f83, #0879a8);
  }`,
  brandMode: 'preserve',
  brandIdentitySelectors: ['.brand-hero'],
  diversitySelectors: selectors,
  knownCssVariables: ['--brand-primary'],
});

assert.ok(repeatedFindings.some((finding) => finding.code === 'solution-structure-variety'));
assert.ok(repeatedFindings.some((finding) => finding.code === 'variant-color-literal'));

const preservedBrandFindings = solutionQualityFindings({
  sourceContent: source,
  screens: [
    screen(['decision-summary', 'performance-evidence', 'risk-evidence'])
      .replace('class="brand-hero"', 'class="brand-hero brand-hero--editorial" data-layout="editorial"'),
    screen(['risk-evidence', 'decision-summary', 'performance-evidence']),
    screen(['performance-evidence', 'risk-evidence', 'decision-summary']),
  ],
  styles: `.brainstorm-option-1 .brand-hero { background: var(--brand-primary); padding-block: 18px; }
  .brainstorm-option-1 .decision-summary { border-width: 2px; }
  .brainstorm-option-2 .risk-evidence { border-width: 2px; }
  .brainstorm-option-3 .performance-evidence { border-width: 2px; }`,
  brandMode: 'preserve',
  brandIdentitySelectors: ['.brand-hero'],
  diversitySelectors: selectors,
  knownCssVariables: ['--brand-primary'],
});

assert.deepEqual(preservedBrandFindings, []);

const missingBrandIdentity = solutionQualityFindings({
  sourceContent: source,
  screens: [
    screen(['decision-summary', 'performance-evidence', 'risk-evidence'])
      .replace('class="brand-hero"', 'class="alternate-hero"'),
    screen(['risk-evidence', 'decision-summary', 'performance-evidence']),
    screen(['performance-evidence', 'risk-evidence', 'decision-summary']),
  ],
  styles: '',
  brandMode: 'preserve',
  brandIdentitySelectors: ['.brand-hero'],
  diversitySelectors: selectors,
});
assert.ok(missingBrandIdentity.some((finding) => finding.code === 'brand-identity-anchor'));

const literalColor = solutionQualityFindings({
  sourceContent: source,
  screens: [
    screen(['decision-summary', 'performance-evidence', 'risk-evidence']),
    screen(['risk-evidence', 'decision-summary', 'performance-evidence']),
    screen(['performance-evidence', 'risk-evidence', 'decision-summary']),
  ],
  styles: '.brainstorm-option-1 .decision-summary { color: #fff; }',
  brandMode: 'preserve',
});
assert.ok(literalColor.some((finding) => finding.code === 'variant-color-literal'));

const brandExploration = solutionQualityFindings({
  sourceContent: source,
  screens: [
    screen(['decision-summary', 'performance-evidence', 'risk-evidence']),
    screen(['risk-evidence', 'decision-summary', 'performance-evidence']),
    screen(['performance-evidence', 'risk-evidence', 'decision-summary']),
  ],
  styles: '.brainstorm-option-1 .brand-hero { background: linear-gradient(145deg, #0b4f83, #0879a8); }',
  brandMode: 'explore',
  brandIdentitySelectors: ['.brand-hero'],
  diversitySelectors: selectors,
});
assert.deepEqual(brandExploration, []);

const unresolvedVariable = solutionQualityFindings({
  sourceContent: source,
  screens: [
    screen(['decision-summary', 'performance-evidence', 'risk-evidence']),
    screen(['risk-evidence', 'decision-summary', 'performance-evidence']),
    screen(['performance-evidence', 'risk-evidence', 'decision-summary']),
  ],
  styles: '.brainstorm-option-1 .decision-summary { background: var(--missing-surface); color: var(--missing-text, #fff); }',
  brandMode: 'explore',
  knownCssVariables: ['--brand-primary'],
});
assert.ok(unresolvedVariable.some((finding) => (
  finding.code === 'unresolved-css-variable' && finding.variable === '--missing-surface'
)));
assert.ok(!unresolvedVariable.some((finding) => finding.variable === '--missing-text'));

const assembled = `<div class="phone-slide">${screen(['decision-summary', 'performance-evidence', 'risk-evidence'])}</div>
<div class="phone-caption">caption one</div>
<div class="phone-slide">${screen(['risk-evidence', 'decision-summary', 'performance-evidence'])}</div>
<div class="phone-caption">caption two</div>`;
const segments = screenSegments(assembled, 'fixture-page');
assert.equal(segments.length, 2);
assert.doesNotMatch(segments[0], /caption one/);
assert.doesNotMatch(segments[1], /caption two/);

console.log('test-solution-quality: all checks passed');
