#!/usr/bin/env node

/**
 * Self-test for the local brainstorm QA gate.
 *
 * Guarantees:
 * 1. Every fixture in profile/quality/benchmark/fixtures/ produces exactly the finding
 *    codes listed in expected.json.
 * 2. Every bundled production template in profile/screens/ has 0 errors.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const BRAINSTORM_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GATE = path.join(BRAINSTORM_DIR, 'scripts/run-qa-gate.mjs');
const FIXTURES_DIR = path.join(BRAINSTORM_DIR, 'profile/quality/benchmark/fixtures');
const SCREENS_DIR = path.join(BRAINSTORM_DIR, 'profile/screens');

let failures = 0;

function fail(message) {
  failures += 1;
  console.log(`  FAIL ${message}`);
}

function pass(message) {
  console.log(`  PASS ${message}`);
}

function runGate(file) {
  const result = spawnSync(process.execPath, [GATE, '--json', file], { encoding: 'utf8' });
  if (result.error) {
    return { fatal: `gate did not run: ${result.error.message}` };
  }
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    return { fatal: `gate produced invalid JSON (exit ${result.status}): ${result.stdout.slice(0, 200)} ${result.stderr.slice(0, 200)}` };
  }
  return { status: result.status, report };
}

function codesOf(report) {
  const all = report.files.flatMap((file) => file.findings.map((finding) => finding.code));
  return [...new Set(all)].sort();
}

console.log('Fixture contract:');
const expectedPath = path.join(FIXTURES_DIR, 'expected.json');
if (!fs.existsSync(expectedPath)) {
  console.log('  SKIP profile has no quality-benchmark fixtures');
} else {
  const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
  for (const [fixture, expectedCodes] of Object.entries(expected)) {
    const file = path.join(FIXTURES_DIR, fixture);
    if (!fs.existsSync(file)) {
      fail(`${fixture}: fixture file missing`);
      continue;
    }
    const { fatal, status, report } = runGate(file);
    if (fatal) {
      fail(`${fixture}: ${fatal}`);
      continue;
    }
    const actual = codesOf(report);
    const want = [...expectedCodes].sort();
    if (JSON.stringify(actual) !== JSON.stringify(want)) {
      fail(`${fixture}: codes [${actual.join(', ')}] != expected [${want.join(', ')}]`);
      continue;
    }
    const errorCount = report.files.reduce((n, fileReport) => n + fileReport.findings.filter((finding) => finding.severity === 'error').length, 0);
    const expectedExit = errorCount > 0 ? 1 : 0;
    if (status !== expectedExit) {
      fail(`${fixture}: exit code ${status} != ${expectedExit} (errors reported: ${errorCount})`);
      continue;
    }
    if (want.length === 0 && report.files.some((fileReport) => fileReport.findings.length > 0)) {
      fail(`${fixture}: clean fixture has findings`);
      continue;
    }
    pass(`${fixture} -> [${actual.join(', ') || 'clean'}]`);
  }
}

console.log('Production calibration (0 errors required, warnings allowed):');
const templates = fs.readdirSync(SCREENS_DIR).filter((file) => file.endsWith('.html')).sort();
for (const template of templates) {
  const { fatal, report } = runGate(path.join(SCREENS_DIR, template));
  if (fatal) {
    fail(`${template}: ${fatal}`);
    continue;
  }
  const errors = report.files.flatMap((fileReport) => fileReport.findings.filter((finding) => finding.severity === 'error'));
  if (errors.length > 0) {
    fail(`${template}: ${errors.length} error(s): ${errors.map((error) => `${error.code}@${error.line}`).join(', ')}`);
  } else {
    const warnings = report.files.reduce((n, fileReport) => n + fileReport.findings.filter((finding) => finding.severity === 'warning').length, 0);
    pass(`${template} (0 errors, ${warnings} warning${warnings === 1 ? '' : 's'})`);
  }
}

if (failures > 0) {
  console.log(`\ntest-qa-gate: ${failures} failure(s)`);
  process.exitCode = 1;
} else {
  console.log('\ntest-qa-gate: all checks passed');
}
