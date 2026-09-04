#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import archetypes from '../lib/archetypes.cjs';
import workflow from '../lib/workflow-contract.cjs';

const {
  assignArchetypes, archetypeBriefLines, loadArchetypes, matchesBaseline, validateArchetypeSet,
} = archetypes;
const { initialCaptions, loadWorkflowContracts, validateCaptions, visualOverlapFindings } = workflow;

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalog = loadArchetypes({ skillDir: SKILL_DIR, profileDir: null });

const withProfileCatalog = (payload, run) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-archetypes-'));
  try {
    fs.mkdirSync(path.join(dir, 'quality'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'quality', 'archetypes.json'), JSON.stringify(payload, null, 2));
    return run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

test('shared catalog', async (t) => {
  await t.test('every declared focus value is claimed by at least one archetype', () => {
    // Guards the gap the corpus measurement found: 我的Tab classified as a
    // navigation hub and no archetype claimed `hub`.
    const claimed = new Set(catalog.archetypes
      .filter((entry) => entry.mode === 'ux')
      .map((entry) => entry.axes.focus));
    for (const value of catalog.axes.focus) {
      assert.ok(claimed.has(value), `no ux archetype claims focus "${value}"`);
    }
  });

  await t.test('visual archetypes inherit both axes', () => {
    for (const entry of catalog.archetypes.filter((item) => item.mode === 'visual')) {
      assert.equal(entry.axes.focus, 'inherit', entry.id);
      assert.equal(entry.axes.commitment, 'inherit', entry.id);
    }
  });

  await t.test('carries no numeric bands, which belong to a profile', () => {
    const raw = fs.readFileSync(path.join(SKILL_DIR, 'references', 'archetypes.json'), 'utf8');
    assert.ok(!/"(metrics|min|max)"\s*:/.test(raw), 'shared catalog must not declare numeric bands');
  });
});

test('the diversity rule', async (t) => {
  await t.test('rejects two ux archetypes sharing a focus', () => {
    const report = validateArchetypeSet([
      { id: 'a', mode: 'ux', axes: { focus: 'single-object', commitment: 'focal' } },
      { id: 'b', mode: 'ux', axes: { focus: 'single-object', commitment: 'inline' } },
    ]);
    assert.equal(report.status, 'blocked');
    assert.ok(report.findings.some((finding) => finding.code === 'archetype-focus-collision'));
  });

  await t.test('rejects a set with only one commitment value', () => {
    const report = validateArchetypeSet([
      { id: 'a', mode: 'ux', axes: { focus: 'single-object', commitment: 'deferred' } },
      { id: 'b', mode: 'ux', axes: { focus: 'record-list', commitment: 'deferred' } },
      { id: 'c', mode: 'ux', axes: { focus: 'form', commitment: 'deferred' } },
    ]);
    assert.equal(report.status, 'blocked');
    assert.ok(report.findings.some((finding) => finding.code === 'archetype-commitment-collision'));
  });

  await t.test('accepts one option differing on focus alone', () => {
    // The slack that keeps an inner screen from being forced into exactly one
    // of {inline, pinned, deferred} per option.
    const report = validateArchetypeSet([
      { id: 'a', mode: 'ux', axes: { focus: 'form', commitment: 'pinned' } },
      { id: 'b', mode: 'ux', axes: { focus: 'record-list', commitment: 'deferred' } },
      { id: 'c', mode: 'ux', axes: { focus: 'narrative', commitment: 'deferred' } },
    ]);
    assert.equal(report.status, 'passed');
  });

  await t.test('exempts visual archetypes, which inherit both axes', () => {
    const report = validateArchetypeSet([
      { id: 'a', mode: 'ux', axes: { focus: 'single-object', commitment: 'focal' } },
      { id: 'b', mode: 'ux', axes: { focus: 'choice-set', commitment: 'inline' } },
      { id: 'c', mode: 'visual', axes: { focus: 'inherit', commitment: 'inherit' } },
    ]);
    assert.equal(report.status, 'passed');
  });

  await t.test('rejects the same archetype twice', () => {
    const report = validateArchetypeSet([
      { id: 'a', mode: 'ux', axes: { focus: 'single-object', commitment: 'focal' } },
      { id: 'a', mode: 'ux', axes: { focus: 'single-object', commitment: 'focal' } },
    ]);
    assert.ok(report.findings.some((finding) => finding.code === 'archetype-repeated'));
  });
});

test('assignment', async (t) => {
  await t.test('every diversity mode resolves a legal set of three', () => {
    for (const mode of ['ux', 'visual', 'mixed']) {
      const result = assignArchetypes({ catalog, count: 3, diversityMode: mode });
      assert.equal(result.archetypes.length, 3, mode);
      assert.equal(validateArchetypeSet(result.archetypes).status, 'passed', mode);
    }
  });

  await t.test('mixed mode yields two ux options and one visual', () => {
    const { archetypes: set } = assignArchetypes({ catalog, count: 3, diversityMode: 'mixed' });
    assert.equal(set.filter((entry) => entry.mode === 'ux').length, 2);
    assert.equal(set.filter((entry) => entry.mode === 'visual').length, 1);
  });

  await t.test('is deterministic, so a run reproduces', () => {
    const first = assignArchetypes({ catalog, count: 3, diversityMode: 'mixed' });
    const second = assignArchetypes({ catalog, count: 3, diversityMode: 'mixed' });
    assert.deepEqual(first.archetypes.map((entry) => entry.id), second.archetypes.map((entry) => entry.id));
    assert.equal(first.assignment, 'default');
  });

  await t.test('honours an explicit legal request', () => {
    const result = assignArchetypes({
      catalog,
      count: 3,
      diversityMode: 'ux',
      requested: ['task-first', 'ledger-first', 'comparison-first'],
    });
    assert.equal(result.assignment, 'explicit');
    assert.deepEqual(result.archetypes.map((entry) => entry.id), ['task-first', 'ledger-first', 'comparison-first']);
  });

  await t.test('refuses an explicit request that breaks the rule', () => {
    assert.throws(
      () => assignArchetypes({ catalog, count: 3, requested: ['object-first', 'status-first', 'ledger-first'] }),
      /distinct focus/,
    );
  });

  await t.test('refuses a request that does not cover every screen', () => {
    assert.throws(
      () => assignArchetypes({ catalog, count: 3, requested: ['object-first'] }),
      /match the screen count/,
    );
  });

  await t.test('refuses an unknown id', () => {
    assert.throws(
      () => assignArchetypes({ catalog, count: 3, requested: ['object-first', 'nope', 'ledger-first'] }),
      /unknown archetype: nope/,
    );
  });
});

test('profile extension', async (t) => {
  await t.test('adds product archetypes and wins on id collision', () => {
    withProfileCatalog({
      schemaVersion: 1,
      archetypes: [
        {
          id: 'object-first',
          name: 'Amount-first',
          mode: 'ux',
          axes: { focus: 'single-object', commitment: 'focal' },
          intent: 'Product override.',
          moves: ['Lead with the amount.'],
        },
        {
          id: 'offer-first',
          name: 'Offer-first',
          mode: 'ux',
          axes: { focus: 'choice-set', commitment: 'focal' },
          intent: 'Product archetype.',
          moves: ['Lead with the offers.'],
        },
      ],
    }, (profileDir) => {
      const merged = loadArchetypes({ skillDir: SKILL_DIR, profileDir });
      const overridden = merged.archetypes.find((entry) => entry.id === 'object-first');
      assert.equal(overridden.name, 'Amount-first');
      assert.equal(overridden.source, 'profile');
      assert.ok(merged.archetypes.some((entry) => entry.id === 'offer-first'));
      assert.equal(merged.archetypes.length, catalog.archetypes.length + 1);
    });
  });

  await t.test('may not redeclare the shared axis vocabulary', () => {
    withProfileCatalog({
      schemaVersion: 1,
      axes: { focus: ['whatever'], commitment: ['whatever'] },
      archetypes: [],
    }, (profileDir) => {
      assert.throws(() => loadArchetypes({ skillDir: SKILL_DIR, profileDir }), /must not redeclare axes/);
    });
  });

  await t.test('rejects an axis value outside the shared vocabulary', () => {
    withProfileCatalog({
      schemaVersion: 1,
      archetypes: [{
        id: 'bad-axis',
        name: 'Bad',
        mode: 'ux',
        axes: { focus: 'vibes', commitment: 'focal' },
        intent: 'x',
        moves: ['x'],
      }],
    }, (profileDir) => {
      assert.throws(() => loadArchetypes({ skillDir: SKILL_DIR, profileDir }), /not in the declared vocabulary/);
    });
  });

  await t.test('rejects a ux archetype trying to inherit an axis', () => {
    withProfileCatalog({
      schemaVersion: 1,
      archetypes: [{
        id: 'bad-inherit',
        name: 'Bad',
        mode: 'ux',
        axes: { focus: 'inherit', commitment: 'focal' },
        intent: 'x',
        moves: ['x'],
      }],
    }, (profileDir) => {
      assert.throws(() => loadArchetypes({ skillDir: SKILL_DIR, profileDir }), /may only inherit/);
    });
  });
});

test('caption contract', async (t) => {
  const assigned = assignArchetypes({ catalog, count: 3, diversityMode: 'mixed' }).archetypes;

  await t.test('prepare seeds each caption with its assigned archetype', () => {
    const seeded = initialCaptions(3, assigned);
    assert.deepEqual(seeded.map((caption) => caption.archetype), assigned.map((entry) => entry.id));
  });

  await t.test('accepts captions that declare the assigned archetype', () => {
    const captions = assigned.map((entry, index) => ({
      title: `方案 ${index + 1}`,
      subtitle: 'Hypothesis: x · Tradeoff: y',
      recommended: index === 0,
      archetype: entry.id,
    }));
    const validated = validateCaptions(captions, 3, assigned);
    assert.deepEqual(validated.map((caption) => caption.archetype), assigned.map((entry) => entry.id));
  });

  await t.test('rejects a caption that drops the archetype', () => {
    const captions = assigned.map((entry, index) => ({
      title: `方案 ${index + 1}`,
      subtitle: 'x',
      ...(index === 1 ? {} : { archetype: entry.id }),
    }));
    assert.throws(() => validateCaptions(captions, 3, assigned), /caption 2 must declare archetype/);
  });

  await t.test('rejects captions that swap two archetypes', () => {
    const swapped = [assigned[1], assigned[0], assigned[2]];
    const captions = swapped.map((entry, index) => ({
      title: `方案 ${index + 1}`,
      subtitle: 'x',
      archetype: entry.id,
    }));
    assert.throws(() => validateCaptions(captions, 3, assigned), /must declare archetype/);
  });

  await t.test('stays backward compatible when no archetypes are assigned', () => {
    const captions = [{ title: '推荐方向', subtitle: '完成用户确认的方向' }];
    assert.deepEqual(validateCaptions(captions, 1), [{ title: '推荐方向', subtitle: '完成用户确认的方向' }]);
  });
});

test('worker brief', async (t) => {
  await t.test('names every option, its axes, and its moves', () => {
    const assignment = assignArchetypes({ catalog, count: 3, diversityMode: 'mixed' });
    const brief = archetypeBriefLines(assignment).join('\n');
    for (const [index, entry] of assignment.archetypes.entries()) {
      assert.ok(brief.includes(`Option ${index + 1} — ${entry.name}`), entry.id);
      assert.ok(brief.includes(`\`${entry.id}\``), entry.id);
      assert.ok(brief.includes(entry.moves[0]), entry.id);
    }
    assert.ok(brief.includes('diversity mode'));
    assert.ok(brief.includes('archetype'));
  });
});

test('baseline exclusion', async (t) => {
  const homeBaseline = { focus: 'single-object', commitment: 'focal' };

  await t.test('matches a ux archetype occupying the same point', () => {
    const objectFirst = catalog.archetypes.find((entry) => entry.id === 'object-first');
    assert.equal(matchesBaseline(objectFirst, homeBaseline), true);
  });

  await t.test('does not match when only one axis agrees', () => {
    const statusFirst = catalog.archetypes.find((entry) => entry.id === 'status-first');
    assert.equal(statusFirst.axes.focus, homeBaseline.focus);
    assert.equal(matchesBaseline(statusFirst, homeBaseline), false);
  });

  await t.test('never matches a visual archetype, which inherits its axes', () => {
    const quiet = catalog.archetypes.find((entry) => entry.id === 'quiet-native');
    assert.equal(matchesBaseline(quiet, homeBaseline), false);
  });

  await t.test('default assignment drops the archetype the template already is', () => {
    const without = assignArchetypes({ catalog, count: 3, diversityMode: 'mixed' });
    assert.ok(without.archetypes.some((entry) => entry.id === 'object-first'));

    const with_ = assignArchetypes({ catalog, count: 3, diversityMode: 'mixed', baselineAxes: homeBaseline });
    assert.ok(!with_.archetypes.some((entry) => entry.id === 'object-first'));
    assert.deepEqual(with_.baselineExcluded, ['object-first']);
    assert.equal(validateArchetypeSet(with_.archetypes).status, 'passed');
  });

  await t.test('an explicit request may still take the baseline archetype, and it is recorded', () => {
    const result = assignArchetypes({
      catalog,
      count: 3,
      diversityMode: 'ux',
      requested: ['object-first', 'comparison-first', 'ledger-first'],
      baselineAxes: homeBaseline,
    });
    assert.deepEqual(result.baselineOverrides, ['object-first']);
  });

  await t.test('every bundled template declares its baseline axes', () => {
    const { payload } = loadWorkflowContracts(new URL('../../profile/', import.meta.url).pathname);
    for (const [name, contract] of Object.entries(payload.templates)) {
      assert.ok(contract.baselineAxes, `${name} has no baselineAxes`);
      assert.ok(catalog.axes.focus.includes(contract.baselineAxes.focus), `${name} focus`);
      assert.ok(catalog.axes.commitment.includes(contract.baselineAxes.commitment), `${name} commitment`);
    }
  });
});

test('visual overlap', async (t) => {
  const assigned = [
    { id: 'status-first', mode: 'ux' },
    { id: 'guardrail-first', mode: 'ux' },
    { id: 'quiet-native', mode: 'visual' },
  ];
  const distinct = [
    { focalPx: 44, focalBand: 5, actionBand: 8, surfaces: 1, blocks: 3 },
    { focalPx: 26, focalBand: 6, actionBand: 7, surfaces: 3, blocks: 4 },
    { focalPx: 44, focalBand: 5, actionBand: 8, surfaces: 0, blocks: 3 },
  ];

  await t.test('passes when the visual option reads differently from both ux options', () => {
    assert.deepEqual(visualOverlapFindings(assigned, distinct), []);
  });

  await t.test('flags a visual option matching a ux option on every field', () => {
    const overlapping = [distinct[0], distinct[1], { ...distinct[0] }];
    const findings = visualOverlapFindings(assigned, overlapping);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, 'visual-archetype-overlap');
    assert.equal(findings[0].screen, 3);
    assert.match(findings[0].message, /quiet-native/);
    assert.match(findings[0].message, /status-first/);
  });

  await t.test('ignores two ux options that match each other', () => {
    // ux-vs-ux distance is settled by the declared rule at assignment time.
    const uxOnly = [
      { id: 'status-first', mode: 'ux' },
      { id: 'guardrail-first', mode: 'ux' },
      { id: 'ledger-first', mode: 'ux' },
    ];
    assert.deepEqual(visualOverlapFindings(uxOnly, [distinct[0], { ...distinct[0] }, distinct[1]]), []);
  });

  await t.test('stays quiet when the browser returned no signatures', () => {
    assert.deepEqual(visualOverlapFindings(assigned, undefined), []);
    assert.deepEqual(visualOverlapFindings(assigned, [distinct[0]]), []);
  });
});
