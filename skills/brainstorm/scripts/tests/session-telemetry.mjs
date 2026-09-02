#!/usr/bin/env node

/**
 * Integration test for per-session performance telemetry.
 *
 * Exercises the real preview server, filesystem watcher, HTTP serving path,
 * and QA CLI. The resulting event stream is the feedback loop used to locate
 * solution-generation latency in a real brainstorm session.
 */

import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import telemetry from '../lib/session-telemetry.cjs';

const BRAINSTORM_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVER = path.join(BRAINSTORM_DIR, 'scripts/serve-preview.cjs');
const GATE = path.join(BRAINSTORM_DIR, 'scripts/run-qa-gate.mjs');
const REPORTER = path.join(BRAINSTORM_DIR, 'scripts/report-session-telemetry.mjs');
const PROFILE_FIXTURE = path.join(BRAINSTORM_DIR, 'profile/quality/fixtures/clean-inner.html');
const PROFILE_SCREENS = path.join(BRAINSTORM_DIR, 'profile/screens');
const CLEAN_SCREEN = fs.existsSync(PROFILE_FIXTURE)
  ? PROFILE_FIXTURE
  : path.join(PROFILE_SCREENS, fs.readdirSync(PROFILE_SCREENS).find((file) => file.endsWith('.html')));
const { EVENT_FILE, EVENTS } = telemetry;

function pass(message) {
  console.log(`  PASS ${message}`);
}

function fail(message) {
  throw new Error(message);
}

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

async function waitFor(check, label, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  fail(`timed out waiting for ${label}`);
}

function readEvents(stateDir) {
  const file = path.join(stateDir, EVENT_FILE);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function startServer(projectDir, port, { extraArgs = [], runDir } = {}) {
  const child = spawn(process.execPath, [
    SERVER,
    '--project-dir', projectDir,
    ...(runDir ? ['--run-dir', runDir] : ['--run-label', 'telemetry-test']),
    '--port', String(port),
    ...extraArgs,
  ], {
    cwd: BRAINSTORM_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  const info = await waitFor(() => {
    const line = stdout.split('\n').find((candidate) => candidate.trim().startsWith('{'));
    if (!line) return null;
    return JSON.parse(line);
  }, 'server startup');

  return { child, info, diagnostics: () => ({ stdout, stderr }) };
}

const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-telemetry-test-'));
let running;

try {
  const port = await getFreePort();
  const missingLabel = spawnSync(process.execPath, [SERVER, '--project-dir', projectDir, '--port', String(port)], {
    cwd: BRAINSTORM_DIR,
    encoding: 'utf8',
  });
  if (missingLabel.status !== 2 || !missingLabel.stderr.includes('--run-label is required')) {
    fail(`server did not reject a missing run label: ${missingLabel.status} ${missingLabel.stderr}`);
  }
  pass('server requires a human-readable run label');

  running = await startServer(projectDir, port);
  const { child, info } = running;
  const eventPath = path.join(info.stateDir, EVENT_FILE);

  if (info.runLabel !== 'telemetry-test'
    || !/^\d{8}-\d{6}-telemetry-test$/.test(info.runName)
    || info.runDir !== path.join(projectDir, 'wld-design-brainstorms', info.runName)
    || info.screenDir !== path.join(info.runDir, 'screens')
    || info.stateDir !== path.join(info.runDir, 'state')) {
    fail(`unexpected run layout: ${JSON.stringify(info)}`);
  }
  if (info.sessionId === info.runName) fail('internal session ID leaked into the human run name');
  pass('server creates the documented human-readable run layout');

  if (info.profileSource !== 'bundled' || info.profileDir !== path.join(BRAINSTORM_DIR, 'profile')) {
    fail(`unexpected profile selection: ${info.profileSource} ${info.profileDir}`);
  }
  if (info.profileComplete !== true || info.profileIssues.length !== 0) {
    fail(`unexpected bundled profile diagnostics: ${JSON.stringify(info.profileIssues)}`);
  }
  pass('server reports bundled profile selection');

  await waitFor(() => fs.existsSync(eventPath), 'telemetry file');
  let events = readEvents(info.stateDir);
  for (const required of [EVENTS.SESSION_STARTED, EVENTS.SERVER_LISTENING]) {
    if (!events.some((event) => event.event === required)) fail(`missing ${required} event`);
  }
  const started = events.find((event) => event.event === EVENTS.SESSION_STARTED);
  if (started.runDir !== info.runDir || started.runName !== info.runName || started.runLabel !== info.runLabel) {
    fail('session-started event lacks run identity');
  }
  pass('server startup events recorded');

  const solutionFile = path.join(info.screenDir, 'solutions.html');
  fs.copyFileSync(CLEAN_SCREEN, solutionFile);
  await waitFor(() => readEvents(info.stateDir).some((event) => (
    event.event === EVENTS.SCREEN_WRITTEN && event.file === 'solutions.html' && event.revision === 1
  )), 'first solutions write');
  pass('first solutions write recorded');

  const response = await fetch(info.url);
  if (!response.ok) fail(`preview returned HTTP ${response.status}`);
  await response.text();
  await waitFor(() => readEvents(info.stateDir).some((event) => (
    event.event === EVENTS.SCREEN_SERVED && event.file === 'solutions.html'
  )), 'solutions serve');
  pass('preview serve recorded');

  const gate = spawnSync(process.execPath, [GATE, '--json', solutionFile], {
    cwd: BRAINSTORM_DIR,
    encoding: 'utf8',
  });
  if (gate.status !== 0) fail(`qa-gate failed unexpectedly: ${gate.stdout} ${gate.stderr}`);
  await waitFor(() => readEvents(info.stateDir).some((event) => (
    event.event === EVENTS.QA_COMPLETED
      && event.files.includes('solutions.html')
      && event.errors === 0
      && event.passed === true
  )), 'QA completion');
  pass('QA completion recorded');

  fs.appendFileSync(solutionFile, '\n');
  await waitFor(() => readEvents(info.stateDir).some((event) => (
    event.event === EVENTS.SCREEN_WRITTEN && event.file === 'solutions.html' && event.revision === 2
  )), 'second solutions write');
  pass('solution rewrite revision recorded');

  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('exit', resolve));
  await waitFor(() => readEvents(info.stateDir).some((event) => event.event === EVENTS.SESSION_STOPPED), 'session stop');

  running = await startServer(projectDir, await getFreePort(), { runDir: info.runDir });
  if (running.info.runDir !== info.runDir
    || running.info.runName !== info.runName
    || running.info.runLabel !== info.runLabel
    || running.info.resumed !== true
    || running.info.startedAtMs !== info.startedAtMs
    || running.info.sessionId === info.sessionId) {
    fail(`server did not resume the existing run: ${JSON.stringify(running.info)}`);
  }
  if (fs.existsSync(path.join(info.stateDir, 'server-stopped'))) {
    fail('resumed run retained a stale server-stopped marker');
  }
  const resumedResponse = await fetch(running.info.url);
  if (!resumedResponse.ok) fail(`resumed preview returned HTTP ${resumedResponse.status}`);
  await resumedResponse.text();
  await waitFor(() => readEvents(info.stateDir).filter((event) => (
    event.event === EVENTS.SCREEN_SERVED && event.file === 'solutions.html'
  )).at(-1)?.revision === 2, 'resumed solutions serve');
  fs.appendFileSync(solutionFile, '\n');
  await waitFor(() => readEvents(info.stateDir).some((event) => (
    event.event === EVENTS.SCREEN_WRITTEN && event.file === 'solutions.html' && event.revision === 3
  )), 'third solutions write after resume');
  running.child.kill('SIGTERM');
  await new Promise((resolve) => running.child.once('exit', resolve));
  pass('server resumes the same run and preserves screen revisions');

  events = readEvents(info.stateDir);
  if (events.some((event) => !Number.isFinite(event.elapsedMs) || event.elapsedMs < 0)) {
    fail('events must carry non-negative elapsedMs values');
  }
  for (let i = 1; i < events.length; i += 1) {
    if (events[i].elapsedMs < events[i - 1].elapsedMs) fail('event elapsedMs values are not monotonic');
  }
  pass('event timing is monotonic');

  const report = spawnSync(process.execPath, [REPORTER, '--json', info.stateDir], {
    cwd: BRAINSTORM_DIR,
    encoding: 'utf8',
  });
  if (report.status !== 0) fail(`reporter failed: ${report.stdout} ${report.stderr}`);
  const summary = JSON.parse(report.stdout);
  if (summary.runName !== info.runName || summary.runLabel !== info.runLabel) fail('report lacks human run identity');
  if (summary.solutions.revisions !== 3) fail(`report revisions ${summary.solutions.revisions} != 3`);
  if (summary.solutions.qaRuns !== 1) fail(`report QA runs ${summary.solutions.qaRuns} != 1`);
  if (!Number.isFinite(summary.solutions.prepareAndGenerateMs)) fail('report missing prepareAndGenerateMs');
  if (!Number.isFinite(summary.solutions.qaAfterFirstWriteMs)) fail('report missing qaAfterFirstWriteMs');
  pass('session summary reports stage timings');

  const incompleteProfile = path.join(projectDir, 'wld-design-profile');
  fs.mkdirSync(path.join(incompleteProfile, 'screens'), { recursive: true });
  running = await startServer(projectDir, await getFreePort());
  if (running.info.profileSource !== 'workspace' || running.info.profileComplete !== false) {
    fail('server did not keep the incomplete workspace profile active');
  }
  if (!running.info.profileIssues.some((issue) => issue.includes('PROFILE.md'))) {
    fail(`server did not report incomplete workspace issues: ${JSON.stringify(running.info.profileIssues)}`);
  }
  running.child.kill('SIGTERM');
  await new Promise((resolve) => running.child.once('exit', resolve));
  pass('server starts with incomplete workspace profile diagnostics');

  running = await startServer(projectDir, await getFreePort(), { extraArgs: ['--use-bundled-profile'] });
  if (running.info.profileSource !== 'bundled' || running.info.profileComplete !== true) {
    fail('explicit bundled fallback did not bypass the incomplete workspace profile');
  }
  running.child.kill('SIGTERM');
  await new Promise((resolve) => running.child.once('exit', resolve));
  pass('server supports explicit bundled fallback');

  console.log('\ntest-session-telemetry: all checks passed');
} catch (error) {
  const diagnostics = running?.diagnostics();
  if (diagnostics?.stdout) console.error(`server stdout:\n${diagnostics.stdout}`);
  if (diagnostics?.stderr) console.error(`server stderr:\n${diagnostics.stderr}`);
  console.error(`\ntest-session-telemetry: FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  if (running?.child.exitCode === null) running.child.kill('SIGTERM');
  fs.rmSync(projectDir, { recursive: true, force: true });
}
