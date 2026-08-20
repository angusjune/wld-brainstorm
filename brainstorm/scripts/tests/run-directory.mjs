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
