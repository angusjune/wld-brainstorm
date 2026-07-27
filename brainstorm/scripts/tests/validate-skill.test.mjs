import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(__dirname, '../..');
const tempRoots = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function makeFixture() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-validate-'));
  const fixtureRoot = path.join(tempRoot, 'brainstorm');
  tempRoots.push(tempRoot);
  fs.cpSync(SKILL_ROOT, fixtureRoot, { recursive: true });
  return fixtureRoot;
}

function runValidator(fixtureRoot) {
  const result = spawnSync(process.execPath, ['scripts/validate-skill.mjs', '--json'], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });
  return {
    exitCode: result.status,
    stderr: result.stderr,
    report: JSON.parse(result.stdout),
  };
}

function addProfileBranchRow(fixtureRoot, docPath) {
  const profilePath = path.join(fixtureRoot, 'profile', 'PROFILE.md');
  const profile = fs.readFileSync(profilePath, 'utf8');
  const header = '|--------|-----|-------|';
  assert.ok(profile.includes(header));
  fs.writeFileSync(
    profilePath,
    profile.replace(header, `${header}\n| Export handoff | \`${docPath}\` | Fixture branch. |`),
  );
}

describe('branch document path validation', () => {
  test('scans shared, profile, and platform branch directories recursively', () => {
    const fixtureRoot = makeFixture();
    const docs = [
      ['references/branches/nested/shared.md', 'scripts/missing-shared-branch.mjs'],
      ['profile/branches/nested/product.md', 'scripts/missing-profile-branch.mjs'],
      ['platforms/ios/branches/nested/platform.md', 'scripts/missing-platform-branch.mjs'],
    ];

    for (const [docPath, missingPath] of docs) {
      const absoluteDoc = path.join(fixtureRoot, docPath);
      fs.mkdirSync(path.dirname(absoluteDoc), { recursive: true });
      fs.writeFileSync(absoluteDoc, `# Fixture\n\nUses \`${missingPath}\`.\n`);
    }
    addProfileBranchRow(fixtureRoot, 'profile/branches/nested/product.md');

    const result = runValidator(fixtureRoot);

    assert.equal(result.stderr, '');
    assert.equal(result.exitCode, 1);
    for (const [docPath, missingPath] of docs) {
      assert.ok(
        result.report.errors.includes(`${docPath} 引用了不存在的包内文件: ${missingPath}`),
      );
    }
  });

  test('checks a concrete path declared in the profile Branches table', () => {
    const fixtureRoot = makeFixture();
    addProfileBranchRow(fixtureRoot, 'profile/branches/missing.md');

    const result = runValidator(fixtureRoot);

    assert.equal(result.stderr, '');
    assert.equal(result.exitCode, 1);
    assert.ok(
      result.report.errors.includes(
        'profile/PROFILE.md 引用了不存在的包内文件: profile/branches/missing.md',
      ),
    );
  });
});

describe('shared page template validation', () => {
  test('requires both content insertion markers in the canonical scaffold', () => {
    const fixtureRoot = makeFixture();
    const templatePath = path.join(fixtureRoot, 'assets', 'page-template.html');
    const template = fs.readFileSync(templatePath, 'utf8');
    fs.writeFileSync(templatePath, template.replace('<!-- SCREEN STYLES -->', ''));

    const result = runValidator(fixtureRoot);

    assert.equal(result.stderr, '');
    assert.equal(result.exitCode, 1);
    assert.ok(
      result.report.errors.includes(
        'assets/page-template.html 缺少必要结构: <!-- SCREEN STYLES -->',
      ),
    );
  });

  test('requires preview styles to remain a CSS-only asset', () => {
    const fixtureRoot = makeFixture();
    const framePath = path.join(fixtureRoot, 'assets', 'frame.css');
    fs.writeFileSync(framePath, `<style>\n${fs.readFileSync(framePath, 'utf8')}\n</style>\n`);

    const result = runValidator(fixtureRoot);

    assert.equal(result.stderr, '');
    assert.equal(result.exitCode, 1);
    assert.ok(
      result.report.errors.includes(
        'assets/frame.css 必须只包含 CSS，不能包含 HTML 页面壳',
      ),
    );
  });
});
