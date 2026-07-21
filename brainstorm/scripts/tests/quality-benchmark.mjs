#!/usr/bin/env node

/**
 * Smoke test for quality-benchmark/report.mjs.
 *
 * Builds two temporary benchmark runs from qa-gate fixtures, runs the report
 * script with --compare, then checks reports and optional Chrome renders.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const BRAINSTORM_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPORT = path.join(BRAINSTORM_DIR, 'quality-benchmark/report.mjs');
const FIXTURES = path.join(BRAINSTORM_DIR, 'profile/quality/benchmark/fixtures');

if (!fs.existsSync(path.join(FIXTURES, 'clean-inner.html')) || !fs.existsSync(path.join(FIXTURES, 'bad-screen.html'))) {
  console.log('test-quality-benchmark: profile has no benchmark fixtures — skipped');
  process.exit(0);
}

const chromeAvailable = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean).some((candidate) => fs.existsSync(candidate));

let failures = 0;
const fail = (message) => { failures += 1; console.log(`  FAIL ${message}`); };
const pass = (message) => console.log(`  PASS ${message}`);

function makeRun(base, name) {
  const run = path.join(base, name);
  fs.mkdirSync(path.join(run, 'clean-case'), { recursive: true });
  fs.mkdirSync(path.join(run, 'dirty-case'), { recursive: true });
  fs.copyFileSync(path.join(FIXTURES, 'clean-inner.html'), path.join(run, 'clean-case', 'screen.html'));
  fs.copyFileSync(path.join(FIXTURES, 'bad-screen.html'), path.join(run, 'dirty-case', 'screen.html'));
  return run;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-uiq-test-'));
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
    const clean = report.cases.find((testCase) => testCase.id === 'clean-case');
    const dirty = report.cases.find((testCase) => testCase.id === 'dirty-case');
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
    const composites = fs.existsSync(compareDir) ? fs.readdirSync(compareDir).filter((file) => file.endsWith('.png')) : [];
    if (composites.length === 0) fail('no side-by-side composites produced');
    else pass(`${composites.length} composite(s) produced`);
  } else {
    console.log('  - Chrome not found: render/composite assertions skipped');
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures > 0) {
  console.log(`\ntest-quality-benchmark: ${failures} failure(s)`);
  process.exitCode = 1;
} else {
  console.log('\ntest-quality-benchmark: all checks passed');
}
