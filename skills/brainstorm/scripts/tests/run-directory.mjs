#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import runDirectory from '../lib/run-directory.cjs';

const {
  RUNS_DIRNAME,
  createRunDirectory,
  formatRunTimestamp,
  openRunDirectory,
  validateRunLabel,
} = runDirectory;

test('formats a local human-readable timestamp', () => {
  const localTime = new Date(2026, 7, 7, 14, 32, 15).getTime();
  assert.equal(formatRunTimestamp(localTime), '20260807-143215');
});

test('accepts only bounded lowercase kebab-case run labels', () => {
  assert.equal(validateRunLabel('loan-detail-redesign'), 'loan-detail-redesign');
  for (const invalid of ['', 'Loan-Detail', 'loan detail', '../loan-detail', 'loan_detail']) {
    assert.throws(() => validateRunLabel(invalid), /--run-label/);
  }
  assert.throws(() => validateRunLabel('a'.repeat(81)), /--run-label/);
});

test('creates visible, human-readable run directories and resolves collisions', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-run-directory-test-'));
  const startedAtMs = new Date(2026, 7, 7, 14, 32, 15).getTime();
  try {
    const first = createRunDirectory({ projectDir, runLabel: 'loan-detail-redesign', startedAtMs });
    const second = createRunDirectory({ projectDir, runLabel: 'loan-detail-redesign', startedAtMs });

    assert.equal(first.runName, '20260807-143215-loan-detail-redesign');
    assert.equal(second.runName, '20260807-143215-loan-detail-redesign-2');
    assert.equal(path.dirname(first.runDir), path.join(projectDir, RUNS_DIRNAME));
    assert.ok(fs.statSync(first.runDir).isDirectory());
    assert.ok(fs.statSync(second.runDir).isDirectory());
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test('opens only an existing run owned by the current project', () => {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-open-run-test-'));
  const otherProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-other-run-test-'));
  const startedAtMs = new Date(2026, 7, 7, 14, 32, 15).getTime();
  try {
    const run = createRunDirectory({ projectDir, runLabel: 'loan-detail-redesign', startedAtMs });
    const stateDir = path.join(run.runDir, 'state');
    fs.mkdirSync(path.join(run.runDir, 'screens'), { recursive: true });
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(path.join(stateDir, 'server-info.json'), JSON.stringify({
      ...run,
      startedAtMs,
      screenDir: path.join(run.runDir, 'screens'),
      stateDir,
      profileDir: path.join(projectDir, 'wld-design-profile'),
      profileSource: 'workspace',
    }));

    assert.deepEqual(openRunDirectory({ projectDir, runDir: run.runDir }), {
      ...run,
      startedAtMs,
      info: JSON.parse(fs.readFileSync(path.join(stateDir, 'server-info.json'), 'utf8')),
    });
    assert.throws(
      () => openRunDirectory({ projectDir: otherProjectDir, runDir: run.runDir }),
      /current project|当前项目/,
    );
    assert.throws(
      () => openRunDirectory({ projectDir, runDir: path.join(projectDir, 'not-a-run') }),
      /current project|当前项目/,
    );
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(otherProjectDir, { recursive: true, force: true });
  }
});
