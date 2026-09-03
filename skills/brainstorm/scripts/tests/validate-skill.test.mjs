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

function runValidator(fixtureRoot, profileDir = null) {
  const args = ['scripts/validate-skill.mjs', '--json'];
  if (profileDir) args.push('--profile', profileDir);
  const result = spawnSync(process.execPath, args, {
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
  const row = `| Export handoff | \`${docPath}\` | Fixture branch. |`;
  fs.writeFileSync(
    profilePath,
    profile.includes(header)
      ? profile.replace(header, `${header}\n${row}`)
      : `${profile.trimEnd()}\n\n## Branches\n\n| Branch | Doc | Notes |\n${header}\n${row}\n`,
  );
}

describe('branch document path validation', () => {
  test('scans shared and profile branch directories recursively', () => {
    const fixtureRoot = makeFixture();
    const docs = [
      ['references/branches/nested/shared.md', 'scripts/missing-shared-branch.mjs'],
      ['profile/branches/nested/product.md', 'scripts/missing-profile-branch.mjs'],
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

describe('skill interface validation', () => {
  test('keeps documented directory names aligned with runtime constants', () => {
    const fixtureRoot = makeFixture();
    const skillPath = path.join(fixtureRoot, 'SKILL.md');
    const skill = fs.readFileSync(skillPath, 'utf8');
    fs.writeFileSync(skillPath, skill.replaceAll('wld-design-profile', 'different-profile'));

    const result = runValidator(fixtureRoot);

    assert.equal(result.stderr, '');
    assert.equal(result.exitCode, 1);
    assert.ok(result.report.errors.includes('SKILL.md 未声明运行时路径: wld-design-profile'));
  });

  test('rejects missing agent interface icons', () => {
    const fixtureRoot = makeFixture();
    const openaiYaml = path.join(fixtureRoot, 'agents', 'openai.yaml');
    const metadata = fs.readFileSync(openaiYaml, 'utf8');
    fs.writeFileSync(openaiYaml, metadata.replace(
      /^\s*icon_small:.*$/m,
      '  icon_small: "./assets/missing.svg"',
    ));

    const result = runValidator(fixtureRoot);

    assert.equal(result.stderr, '');
    assert.equal(result.exitCode, 1);
    assert.ok(result.report.errors.includes(
      'agents/openai.yaml 的 icon_small 引用了不存在或越界的文件: ./assets/missing.svg',
    ));
  });
});

describe('workspace profile validation', () => {
  test('checks the profile passed through the selection seam', () => {
    const fixtureRoot = makeFixture();
    const workspaceProfile = path.join(path.dirname(fixtureRoot), 'wld-design-profile');
    fs.cpSync(path.join(fixtureRoot, 'profile'), workspaceProfile, { recursive: true });
    fs.writeFileSync(
      path.join(workspaceProfile, 'screens', '新增模板.html'),
      '<div class="fixture-page"></div>\n',
    );

    const result = runValidator(fixtureRoot, workspaceProfile);

    assert.equal(result.stderr, '');
    assert.equal(result.exitCode, 1);
    assert.ok(
      result.report.errors.includes(
        '模板存在但未在 profile/PROFILE.md 列出: profile/screens/新增模板.html',
      ),
    );
  });

  test('requires brand identity selectors to be simple classes', () => {
    const fixtureRoot = makeFixture();
    const contractPath = path.join(fixtureRoot, 'profile', 'quality', 'workflow-contracts.json');
    const contracts = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const [template] = Object.keys(contracts.templates);
    contracts.templates[template].brandIdentitySelectors = [':root'];
    fs.writeFileSync(contractPath, `${JSON.stringify(contracts, null, 2)}\n`);

    const result = runValidator(fixtureRoot);

    assert.equal(result.stderr, '');
    assert.equal(result.exitCode, 1);
    assert.ok(result.report.errors.some((error) => error.includes('brandIdentitySelectors')));
  });

});
