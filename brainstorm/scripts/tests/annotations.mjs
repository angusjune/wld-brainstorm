#!/usr/bin/env node

/**
 * Integration test for click-to-annotate preview feedback.
 *
 * Exercises the real preview server, HTML injection, annotation HTTP endpoint,
 * filesystem watcher, and durable pending/consumed derivation.
 */

import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import annotations from '../lib/annotations.cjs';

const BRAINSTORM_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVER = path.join(BRAINSTORM_DIR, 'scripts/serve-preview.cjs');
const ACKNOWLEDGE = path.join(BRAINSTORM_DIR, 'scripts/acknowledge-annotations.cjs');
const ANNOTATE_CLIENT = path.join(BRAINSTORM_DIR, 'assets/annotate.js');
const PROFILE = path.join(BRAINSTORM_DIR, 'profile/PROFILE.md');
const PROFILE_FIXTURE = path.join(BRAINSTORM_DIR, 'profile/quality/fixtures/clean-inner.html');
const PROFILE_SCREENS = path.join(BRAINSTORM_DIR, 'profile/screens');
const PAGE_TEMPLATE = path.join(BRAINSTORM_DIR, 'assets/page-template.html');

// profile/screens/*.html are bare page-class fragments (no <head>/<body>) by
// design — the real preview pipeline always composes them through
// assets/page-template.html first. When no dedicated QA fixture exists,
// this test must do the same composition rather than assume a raw fragment is
// a complete document; otherwise injectHelper() finds neither </head> nor
// <body> to anchor its <link>/<script> injection on and silently no-ops.
function composeFragmentAsDocument(fragmentPath) {
  const template = fs.readFileSync(PAGE_TEMPLATE, 'utf8');
  const fragment = fs.readFileSync(fragmentPath, 'utf8');
  const styleMatch = fragment.match(/(<style>[\s\S]*?<\/style>)\s*$/);
  const body = styleMatch ? fragment.slice(0, styleMatch.index) : fragment;
  const styles = styleMatch ? styleMatch[1] : '';
  const composed = template
    .replace('<!-- SCREEN CONTENT -->', body)
    .replace('<!-- SCREEN STYLES -->', styles);
  const out = path.join(os.tmpdir(), `brainstorm-annotations-fixture-${process.pid}.html`);
  fs.writeFileSync(out, composed);
  return out;
}

const CLEAN_SCREEN = fs.existsSync(PROFILE_FIXTURE)
  ? PROFILE_FIXTURE
  : composeFragmentAsDocument(
      path.join(PROFILE_SCREENS, fs.readdirSync(PROFILE_SCREENS).find((file) => file.endsWith('.html'))),
    );
const {
  ANNOTATION_FILE,
  LIMITS,
  pendingAnnotations,
  readEntries,
} = annotations;

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

async function startServer(projectDir, port) {
  const child = spawn(process.execPath, [
    SERVER,
    '--project-dir', projectDir,
    '--run-label', 'annotations-test',
    '--port', String(port),
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

function activePlatform() {
  const text = fs.readFileSync(PROFILE, 'utf8');
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1] || '';
  return frontmatter.match(/^platform:\s*(.+)$/m)?.[1].trim() || null;
}

async function postAnnotation(url, payload) {
  const response = await fetch(`${url}/api/annotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { response, body: await response.json() };
}

async function acknowledge(stateDir, file, through) {
  const child = spawn(process.execPath, [ACKNOWLEDGE, stateDir, file, through], {
    cwd: BRAINSTORM_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const code = await new Promise((resolve) => child.once('close', resolve));
  if (code !== 0) fail(`acknowledgement failed (${code}): ${stderr || stdout}`);
  return JSON.parse(stdout);
}

function loadAnnotationClientHelpers() {
  const source = fs.readFileSync(ANNOTATE_CLIENT, 'utf8');
  if (source.includes('顶部区域是平台外壳')) {
    fail('shared annotation client assumes platform chrome is at the top');
  }
  const moduleRecord = { exports: {} };
  vm.runInNewContext(source, { module: moduleRecord }, { filename: ANNOTATE_CLIENT });
  if (typeof moduleRecord.exports.selectorFor !== 'function') {
    fail('annotation client does not expose selectorFor to the test harness');
  }
  return moduleRecord.exports;
}

function appendElement(parent, child) {
  child.parentElement = parent;
  parent.children.push(child);
  return child;
}

function fakeElement(tagName, id = '') {
  return {
    tagName: tagName.toUpperCase(),
    id,
    children: [],
    parentElement: null,
    ownerDocument: null,
  };
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => {
    const forceTimer = setTimeout(() => child.kill('SIGKILL'), 4000);
    child.once('close', () => {
      clearTimeout(forceTimer);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-annotations-test-'));
let running;

try {
  const { selectorFor } = loadAnnotationClientHelpers();
  const body = fakeElement('body');
  const frame = appendElement(body, fakeElement('div', 'frame-content'));
  const list = appendElement(frame, fakeElement('div'));
  const firstRow = appendElement(list, fakeElement('div'));
  const secondRow = appendElement(list, fakeElement('div'));
  const firstSvg = appendElement(firstRow, fakeElement('svg'));
  const secondSvg = appendElement(secondRow, fakeElement('svg'));
  const firstPath = appendElement(firstSvg, fakeElement('path'));
  const secondPath = appendElement(secondSvg, fakeElement('path'));
  const fakeDocument = {
    body,
    querySelector: (selector) => (selector === '#frame-content' ? frame : null),
  };
  for (const element of [body, frame, list, firstRow, secondRow, firstSvg, secondSvg, firstPath, secondPath]) {
    element.ownerDocument = fakeDocument;
  }
  const firstSelector = selectorFor(firstPath);
  const secondSelector = selectorFor(secondPath);
  if (firstSelector === secondSelector || !firstSelector.includes(':nth-of-type(1)')
    || !secondSelector.includes(':nth-of-type(2)')) {
    fail(`repeated targets are not uniquely locatable: ${firstSelector} / ${secondSelector}`);
  }
  pass('shared copy is location-neutral and repeated targets receive unique DOM paths');

  const port = await getFreePort();
  running = await startServer(projectDir, port);
  const { info } = running;
  const screenFile = path.join(info.screenDir, 'home.html');
  fs.copyFileSync(CLEAN_SCREEN, screenFile);

  const rootResponse = await fetch(info.url);
  const rootHtml = await rootResponse.text();
  if (!rootResponse.ok) fail(`root preview returned HTTP ${rootResponse.status}`);
  if (!rootHtml.includes('<script src="/assets/annotate.js"></script>')) fail('root preview did not inject annotate.js');
  if (!rootHtml.includes('window.__BRAINSTORM_SCREEN_FILE = "home.html";')) fail('root preview injected wrong screen basename');

  const namedResponse = await fetch(`${info.url}/home.html`);
  const namedHtml = await namedResponse.text();
  if (!namedResponse.ok) fail(`named preview returned HTTP ${namedResponse.status}`);
  if (!namedHtml.includes('<script src="/assets/annotate.js"></script>')) fail('named preview did not inject annotate.js');
  if (!namedHtml.includes('window.__BRAINSTORM_SCREEN_FILE = "home.html";')) fail('named preview injected wrong screen basename');
  if (!namedHtml.includes('<link rel="stylesheet" href="/assets/frame.css" data-bs-frame>')) fail('named preview did not link frame.css');
  pass('root and named previews inject runtime helpers with the resolved basename');

  const platform = activePlatform();
  const chromeFile = platform ? path.join(BRAINSTORM_DIR, 'platforms', platform, 'chrome.html') : null;
  if (chromeFile && fs.existsSync(chromeFile)) {
    if (!namedHtml.includes('data-bs-chrome')) fail('expanded preview chrome was not stamped');
    pass('expanded preview chrome is stamped as non-annotatable');
  } else {
    console.log('  SKIP active platform has no chrome.html');
  }

  const assetResponse = await fetch(`${info.url}/assets/annotate.js`);
  if (!assetResponse.ok) fail(`annotate asset returned HTTP ${assetResponse.status}`);
  if (!assetResponse.headers.get('content-type')?.includes('javascript')) fail('annotate asset lacks JavaScript content type');
  pass('annotation client is served as JavaScript');

  const frameResponse = await fetch(`${info.url}/assets/frame.css`);
  const frameCss = await frameResponse.text();
  if (!frameResponse.ok) fail(`frame asset returned HTTP ${frameResponse.status}`);
  if (!frameResponse.headers.get('content-type')?.includes('text/css')) fail('frame asset lacks CSS content type');
  if (!frameCss.includes('.phone-mockup')) fail('frame asset is missing phone mockup styles');
  pass('preview frame is served as a standalone stylesheet');

  const annotationPath = path.join(info.stateDir, ANNOTATION_FILE);
  const first = await postAnnotation(info.url, {
    file: 'home.html',
    note: '  调整金额层级  ',
    outerHTML: '<div class="amount">500</div>',
    text: '500',
    selector: 'div.amount',
    slide: '方案 A',
    ignored: true,
  });
  if (first.response.status !== 200 || first.body.ok !== true || first.body.id !== 'a1') {
    fail(`valid annotation failed: ${first.response.status} ${JSON.stringify(first.body)}`);
  }
  let entries = readEntries(info.stateDir);
  if (entries.length !== 1) fail(`expected exactly one annotation entry, got ${entries.length}`);
  const saved = entries[0];
  const expected = {
    type: 'annotation',
    id: 'a1',
    sessionId: info.sessionId,
    file: 'home.html',
    note: '调整金额层级',
    outerHTML: '<div class="amount">500</div>',
    text: '500',
    selector: 'div.amount',
    slide: '方案 A',
  };
  for (const [key, value] of Object.entries(expected)) {
    if (saved[key] !== value) fail(`saved ${key} ${JSON.stringify(saved[key])} != ${JSON.stringify(value)}`);
  }
  if (!Number.isFinite(Date.parse(saved.at))) fail('saved annotation has invalid timestamp');
  pass('valid POST appends one normalized annotation');

  const longOuterHTML = '<div>' + 'x'.repeat(LIMITS.outerHTML + 100) + '</div>';
  const second = await postAnnotation(info.url, {
    file: 'home.html',
    note: '缩短这一块',
    outerHTML: longOuterHTML,
  });
  if (second.response.status !== 200 || second.body.id !== 'a2') fail('second annotation failed');
  entries = readEntries(info.stateDir);
  const truncated = entries.find((entry) => entry.id === 'a2')?.outerHTML;
  if (truncated?.length !== LIMITS.outerHTML || !truncated.endsWith('…')) {
    fail(`outerHTML was not truncated to ${LIMITS.outerHTML} characters`);
  }
  pass('server authoritatively truncates oversized outerHTML');

  const countBeforeInvalid = entries.length;
  const blank = await postAnnotation(info.url, { file: 'home.html', note: '   ' });
  if (blank.response.status < 400 || blank.response.status >= 500) fail('blank note did not return 4xx');
  if (readEntries(info.stateDir).length !== countBeforeInvalid) fail('blank note appended an entry');
  pass('blank notes are rejected without append');

  const missing = await postAnnotation(info.url, { file: 'missing.html', note: '修改' });
  const traversal = await postAnnotation(info.url, { file: '../home.html', note: '修改' });
  if (missing.response.status < 400 || missing.response.status >= 500) fail('missing file did not return 4xx');
  if (traversal.response.status < 400 || traversal.response.status >= 500) fail('traversal file did not return 4xx');
  if (readEntries(info.stateDir).length !== countBeforeInvalid) fail('invalid file appended an entry');
  pass('missing and traversal filenames are rejected without append');

  const otherFile = path.join(info.screenDir, 'other.html');
  fs.copyFileSync(CLEAN_SCREEN, otherFile);
  await fetch(`${info.url}/other.html`);
  const other = await postAnnotation(info.url, { file: 'other.html', note: '另一页的批注' });
  if (other.response.status !== 200 || other.body.id !== 'a3') fail('other-file annotation failed');

  const pendingBefore = pendingAnnotations(info.stateDir, 'home.html');
  if (pendingBefore.length !== 2 || pendingBefore.at(-1).id !== 'a2') fail('annotations were not pending before rewrite');
  const seenThrough = pendingBefore.at(-1).id;
  const late = await postAnnotation(info.url, { file: 'home.html', note: '读取后才到达的批注' });
  if (late.response.status !== 200 || late.body.id !== 'a4') fail('late annotation failed');
  fs.appendFileSync(screenFile, '\n');
  await waitFor(() => readEntries(info.stateDir).some((entry) => (
    entry.type === 'annotation' && entry.id === late.body.id
  )), 'late annotation append');
  await new Promise((resolve) => setTimeout(resolve, 300));
  const pendingAfterRewrite = pendingAnnotations(info.stateDir, 'home.html');
  if (pendingAfterRewrite.length !== 3 || pendingAfterRewrite.at(-1).id !== 'a4') {
    fail('rewriting a screen implicitly consumed unread annotations');
  }
  const acknowledged = await acknowledge(info.stateDir, 'home.html', seenThrough);
  if (acknowledged.through !== 'a2') fail(`wrong acknowledgement: ${JSON.stringify(acknowledged)}`);
  const pendingAfterAcknowledgement = pendingAnnotations(info.stateDir, 'home.html');
  if (pendingAfterAcknowledgement.length !== 1 || pendingAfterAcknowledgement[0].id !== 'a4') {
    fail('explicit acknowledgement consumed annotations that arrived after the read cursor');
  }
  const otherPending = pendingAnnotations(info.stateDir, 'other.html');
  if (otherPending.length !== 1 || otherPending[0].id !== 'a3') fail('another file was affected by the consumed marker');

  const third = await postAnnotation(info.url, { file: 'home.html', note: '再调整一次' });
  if (third.response.status !== 200 || third.body.id !== 'a5') fail('post-consumption annotation failed');
  const pendingAfter = pendingAnnotations(info.stateDir, 'home.html');
  if (pendingAfter.length !== 2 || pendingAfter.at(-1).id !== 'a5') fail('new annotation was not pending after consumed marker');
  pass('explicit acknowledgement is file-scoped and preserves later annotations');

  const serverInfo = JSON.parse(fs.readFileSync(path.join(info.stateDir, 'server-info.json'), 'utf8'));
  if (!info.startedAt || !serverInfo.startedAt) fail('startup info lacks startedAt');
  if (info.annotationsPath !== annotationPath || serverInfo.annotationsPath !== annotationPath) {
    fail('startup info exposes the wrong annotationsPath');
  }
  if (!fs.existsSync(annotationPath)) fail('annotationsPath does not point to the real log');
  pass('startup JSON and server-info expose the real annotation log');

  console.log('\ntest-annotations: all checks passed');
} catch (error) {
  const diagnostics = running?.diagnostics();
  if (diagnostics?.stdout) console.error(`server stdout:\n${diagnostics.stdout}`);
  if (diagnostics?.stderr) console.error(`server stderr:\n${diagnostics.stderr}`);
  console.error(`\ntest-annotations: FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  await stopServer(running?.child);
  fs.rmSync(projectDir, { recursive: true, force: true });
}
