#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const brainstormDir = path.resolve(testDir, '..', '..');
const { resolveProfile } = require('../lib/profile-selection.cjs');

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-profile-selection-'));

try {
  const initial = resolveProfile({ projectDir, skillDir: brainstormDir });
  check(initial.source === 'bundled', `expected bundled, got ${initial.source}`);
  check(initial.profileDir === path.join(brainstormDir, 'profile'), 'bundled path mismatch');
  check(initial.complete === true && initial.issues.length === 0, 'bundled profile should be complete');

  const workspaceProfileDir = path.join(projectDir, 'wld-design-profile');
  fs.cpSync(path.join(brainstormDir, 'profile'), workspaceProfileDir, { recursive: true });

  const workspace = resolveProfile({ projectDir, skillDir: brainstormDir });
  check(workspace.source === 'workspace', `expected workspace, got ${workspace.source}`);
  check(workspace.profileDir === workspaceProfileDir, 'workspace path mismatch');
  check(workspace.complete === true, 'copied workspace profile should be complete');

  const brokenProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-broken-profile-'));
  fs.mkdirSync(path.join(brokenProjectDir, 'wld-design-profile'));

  const bestEffort = resolveProfile({ projectDir: brokenProjectDir, skillDir: brainstormDir });
  check(bestEffort.source === 'workspace', 'incomplete workspace profile was not selected');
  check(bestEffort.complete === false, 'incomplete workspace profile was marked complete');
  check(bestEffort.issues.some((issue) => issue.includes('PROFILE.md')), 'missing PROFILE.md was not reported');

  const bundledOverride = resolveProfile({
    projectDir: brokenProjectDir,
    skillDir: brainstormDir,
    useBundled: true,
  });
  check(bundledOverride.source === 'bundled', 'bundled override did not bypass workspace profile');

  fs.rmSync(brokenProjectDir, { recursive: true, force: true });

  const invalidProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-invalid-profile-'));
  fs.writeFileSync(path.join(invalidProjectDir, 'wld-design-profile'), 'not a directory');
  let invalidFailedClearly = false;
  try {
    resolveProfile({ projectDir: invalidProjectDir, skillDir: brainstormDir });
  } catch (error) {
    invalidFailedClearly = error.message.includes('--use-bundled-profile');
  }
  check(invalidFailedClearly, 'unusable workspace path did not explain the bundled fallback');
  check(
    resolveProfile({ projectDir: invalidProjectDir, skillDir: brainstormDir, useBundled: true }).source === 'bundled',
    'bundled override did not bypass an unusable workspace path',
  );
  fs.rmSync(invalidProjectDir, { recursive: true, force: true });

  console.log('profile-selection: all checks passed');
} catch (error) {
  console.error(`profile-selection: FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(projectDir, { recursive: true, force: true });
}
