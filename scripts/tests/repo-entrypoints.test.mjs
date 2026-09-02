#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

async function getFreePort() {
  const socket = net.createServer();
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolve);
  });
  const address = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  return address.port;
}

async function stop(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolve) => {
    child.once('close', resolve);
    child.kill('SIGTERM');
  });
}

test('screen corpus development entrypoint starts against the published skill', async () => {
  const port = await getFreePort();
  const child = spawn(process.execPath, ['scripts/dev-screens.cjs', '--port', String(port)], {
    cwd: REPO,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  try {
    const deadline = Date.now() + 3000;
    while (!stdout.includes(`http://127.0.0.1:${port}`) && child.exitCode === null && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.equal(child.exitCode, null, stderr);
    assert.match(stdout, new RegExp(`http://127\\.0\\.0\\.1:${port}`));
    const response = await fetch(`http://127.0.0.1:${port}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /phone-gallery/);
  } finally {
    await stop(child);
  }
});

test('all plugin manifests use the root package version', () => {
  const expected = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')).version;
  const codex = JSON.parse(fs.readFileSync(path.join(REPO, '.codex-plugin/plugin.json'), 'utf8'));
  const claude = JSON.parse(fs.readFileSync(path.join(REPO, '.claude-plugin/plugin.json'), 'utf8'));
  const marketplace = JSON.parse(fs.readFileSync(path.join(REPO, '.claude-plugin/marketplace.json'), 'utf8'));
  const entry = marketplace.plugins.find((plugin) => plugin.name === 'wld-brainstorm');

  assert.equal(codex.version, expected);
  assert.equal(claude.version, expected);
  assert.equal(entry?.version, expected);
});

test('setup-profile documents the workflow contract accepted by the validator', () => {
  const reference = fs.readFileSync(
    path.join(REPO, 'skills/setup-profile/references/add-templates.md'),
    'utf8',
  );

  assert.match(reference, /`authorityFiles`/);
  assert.doesNotMatch(reference, /`contextFiles`/);
});

test('repository guidance uses the current plugin layout and runnable commands', () => {
  const agents = fs.readFileSync(path.join(REPO, 'AGENTS.md'), 'utf8');
  const context = fs.readFileSync(path.join(REPO, 'CONTEXT.md'), 'utf8');
  const readme = fs.readFileSync(path.join(REPO, 'README.md'), 'utf8');
  const skillAgents = fs.readFileSync(path.join(REPO, 'skills/brainstorm/AGENTS.md'), 'utf8');
  const skillReadme = fs.readFileSync(path.join(REPO, 'skills/brainstorm/README.md'), 'utf8');
  const profileReadme = fs.readFileSync(path.join(REPO, 'skills/brainstorm/profile/README.md'), 'utf8');

  assert.match(agents, /`\.\/skills\/brainstorm`/);
  assert.doesNotMatch(agents, /`\.\/brainstorm`/);
  assert.match(context, /`skills\/brainstorm\/`/);
  assert.doesNotMatch(context, /`brainstorm\/` is the publishable/);
  assert.doesNotMatch(readme, /CHANGELOG\.md/);
  assert.doesNotMatch(`${skillAgents}\n${skillReadme}\n${profileReadme}`, /bun test/);
  assert.match(`${skillAgents}\n${skillReadme}\n${profileReadme}`, /bun run test/);
});

test('generated output has explicit ignore boundaries and unused posters are absent', () => {
  const ignore = fs.readFileSync(path.join(REPO, '.gitignore'), 'utf8');

  for (const entry of [
    '/site/.astro/',
    '/site/public/demo/',
    '/skills/brainstorm/profile/quality/benchmark/runs/',
  ]) {
    assert.match(ignore, new RegExp(`^${entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
  }
  assert.doesNotMatch(ignore, /^brainstorm\//m);
  for (const relative of [
    'site/public/brainstorm-zine-poster.png',
    'site/public/brainstorm-zine-poster-storm.png',
  ]) {
    assert.equal(fs.existsSync(path.join(REPO, relative)), false, `${relative} is unused and should not ship`);
  }
});

test('repository and vendored runtime dependencies ship their licenses', () => {
  const projectLicense = fs.readFileSync(path.join(REPO, 'LICENSE'), 'utf8');
  const bigLicense = fs.readFileSync(
    path.join(REPO, 'skills/brainstorm/profile/quality/tools/LICENSE.big.js'),
    'utf8',
  );

  assert.match(projectLicense, /MIT License/);
  assert.match(bigLicense, /MIT License/);
  assert.match(bigLicense, /Michael Mclaughlin/);
});

test('CLAUDE.md stays a relative alias to the canonical guide', () => {
  const absolute = path.join(REPO, 'CLAUDE.md');
  assert.equal(fs.lstatSync(absolute).isSymbolicLink(), true, 'CLAUDE.md should be a symlink');
  assert.equal(fs.readlinkSync(absolute), 'AGENTS.md');
});
