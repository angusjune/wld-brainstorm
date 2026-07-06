#!/usr/bin/env node

/**
 * Smoke test for scripts/ui-quality-report.mjs.
 *
 * Builds a fake benchmark run from the qa-gate fixtures, runs the report
 * script against it, and asserts:
 *  - report.json / report.md are produced with per-case gate numbers
 *  - a clean case reports 0 errors, a dirty case reports > 0
 *  - when Chrome is available, every screen HTML gets a rendered PNG,
 *    and --compare produces side-by-side composites
 *
 * Run: node scripts/test-ui-quality-report.mjs
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = path.join(ROOT, 'scripts/ui-quality-report.mjs');
const FIXTURES = path.join(ROOT, 'evals/ui-quality/fixtures');

const chromeAvailable = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean).some((p) => fs.existsSync(p));

let failures = 0;
const fail = (msg) => { failures += 1; console.log(`  ✗ ${msg}`); };
const pass = (msg) => console.log(`  ✓ ${msg}`);

function makeRun(base, name) {
  const run = path.join(base, name);
  fs.mkdirSync(path.join(run, 'clean-case'), { recursive: true });
  fs.mkdirSync(path.join(run, 'dirty-case'), { recursive: true });
  fs.copyFileSync(path.join(FIXTURES, 'clean-inner.html'), path.join(run, 'clean-case', 'screen.html'));
  fs.copyFileSync(path.join(FIXTURES, 'bad-screen.html'), path.join(run, 'dirty-case', 'screen.html'));
  return run;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wld-uiq-test-'));
try {
  const runA = makeRun(tmp, 'runA');
  const runB = makeRun(tmp, 'runB');

  const result = spawnSync(process.execPath, [REPORT, runA, '--compare', runB, '--port', '4381'], { encoding: 'utf8' });
  if (result.status !== 0) {
    fail(`report script exited ${result.status}\n${result.stdout}\n${result.stderr}`);
  } else {
    pass('report script ran');
  }

  const reportPath = path.join(runA, 'report.json');
  if (!fs.existsSync(reportPath)) {
    fail('report.json missing');
  } else {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const clean = report.cases.find((c) => c.id === 'clean-case');
    const dirty = report.cases.find((c) => c.id === 'dirty-case');
    if (!clean || !dirty) fail('report.json missing cases');
    else if (clean.errors !== 0) fail(`clean-case errors ${clean.errors} != 0`);
    else if (dirty.errors === 0) fail('dirty-case reported 0 errors');
    else pass(`gate numbers present (clean=0 errors, dirty=${dirty.errors} errors)`);
  }

  if (!fs.existsSync(path.join(runA, 'report.md'))) fail('report.md missing');
  else pass('report.md present');

  if (chromeAvailable) {
    for (const caseId of ['clean-case', 'dirty-case']) {
      const png = path.join(runA, caseId, 'screen.html.png');
      if (!fs.existsSync(png)) fail(`render missing: ${caseId}/screen.html.png`);
      else pass(`render present: ${caseId}/screen.html.png`);
    }
    const compareDir = path.join(runA, 'compare-runB');
    const composites = fs.existsSync(compareDir) ? fs.readdirSync(compareDir).filter((f) => f.endsWith('.png')) : [];
    if (composites.length === 0) fail('no side-by-side composites produced');
    else pass(`${composites.length} composite(s) produced`);
  } else {
    console.log('  - Chrome not found: render/composite assertions skipped');
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures > 0) {
  console.log(`\ntest-ui-quality-report: ${failures} failure(s)`);
  process.exitCode = 1;
} else {
  console.log('\ntest-ui-quality-report: all checks passed');
}
