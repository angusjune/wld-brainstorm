const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

function findChrome(explicit) {
  return [
    explicit,
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean).find((candidate) => fs.existsSync(candidate)) || null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDevtools(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    let stderr = '';
    const timeout = setTimeout(() => reject(new Error('Chrome DevTools startup timed out')), timeoutMs);
    const finish = (error, value) => {
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve(value);
    };
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) finish(null, match[1]);
    });
    child.once('exit', (code) => finish(new Error(`Chrome exited before DevTools was ready (${code}): ${stderr}`)));
    child.once('error', (error) => finish(error));
  });
}

async function pageTarget(browserUrl, pageUrl, timeoutMs) {
  const endpoint = new URL(browserUrl);
  const base = `http://${endpoint.host}`;
  const opened = await fetch(`${base}/json/new?${encodeURIComponent(pageUrl)}`, { method: 'PUT' });
  if (!opened.ok) throw new Error(`Chrome could not open preview URL (${opened.status})`);
  const target = await opened.json();
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const list = await fetch(`${base}/json/list`).then((response) => response.json());
    const match = list.find((item) => item.id === target.id || item.url === pageUrl);
    if (match?.webSocketDebuggerUrl) return match;
    await delay(50);
  }
  throw new Error('Chrome page target did not become available');
}

function connectCdp(url) {
  const socket = new WebSocket(url);
  const pending = new Map();
  let nextId = 1;
  let exceptionCount = 0;
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') exceptionCount += 1;
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', () => reject(new Error('Chrome DevTools WebSocket failed')), { once: true });
  });
  const send = async (method, params = {}) => {
    await ready;
    const id = nextId++;
    const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    socket.send(JSON.stringify({ id, method, params }));
    return response;
  };
  return { socket, send, exceptionCount: () => exceptionCount };
}

async function waitForLoad(cdp, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const response = await cdp.send('Runtime.evaluate', {
      expression: 'document.readyState',
      returnByValue: true,
    });
    if (response.result?.value === 'complete') return;
    await delay(50);
  }
  throw new Error('Preview page did not finish loading');
}

async function inspectPage({ url, pageClass, expectedScreens, chromePath, screenshotPath, timeoutMs = 20_000 }) {
  const executable = findChrome(chromePath);
  if (!executable) {
    return { status: 'unavailable', reason: 'Chrome/Chromium was not found', findings: [] };
  }
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-browser-contract-'));
  const child = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1600,1300',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  try {
    const browserUrl = await waitForDevtools(child, timeoutMs);
    const target = await pageTarget(browserUrl, url, timeoutMs);
    const cdp = connectCdp(target.webSocketDebuggerUrl);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Page.navigate', { url });
    await waitForLoad(cdp, timeoutMs);
    const expression = `(() => {
      const exactClass = (token) => [...document.querySelectorAll('[class]')]
        .filter((element) => element.classList.contains(token));
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const phones = exactClass('phone-mockup');
      const phoneScreens = exactClass('phone-screen');
      const pages = exactClass(${JSON.stringify(pageClass)});
      return {
        characterSet: document.characterSet,
        title: document.title,
        phones: phones.map((element) => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height, visible: visible(element) };
        }),
        phoneScreens: phoneScreens.map((element) => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          visible: visible(element),
        })),
        pages: pages.length,
        expandedChrome: document.querySelectorAll('[data-bs-chrome]').length,
        previewChrome: document.querySelectorAll('preview-chrome').length,
        replacementCharacters: (document.body.innerText.match(/\uFFFD/g) || []).length,
      };
    })()`;
    const response = await cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    const metrics = response.result?.value;
    if (!metrics) throw new Error('Chrome did not return preview metrics');
    if (screenshotPath) {
      const layout = await cdp.send('Page.getLayoutMetrics');
      const size = layout.cssContentSize || layout.contentSize;
      const screenshot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width: Math.max(1, Math.min(2000, Math.ceil(size.width))),
          height: Math.max(1, Math.min(5000, Math.ceil(size.height))),
          scale: 1,
        },
      });
      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    }
    const findings = [];
    if (String(metrics.characterSet).toUpperCase() !== 'UTF-8') findings.push(`document charset is ${metrics.characterSet}`);
    if (metrics.phones.length !== expectedScreens) findings.push(`expected ${expectedScreens} rendered phones, found ${metrics.phones.length}`);
    if (metrics.phoneScreens.length !== expectedScreens) findings.push(`expected ${expectedScreens} rendered phone screens, found ${metrics.phoneScreens.length}`);
    if (metrics.pages !== expectedScreens) findings.push(`expected ${expectedScreens} rendered page roots, found ${metrics.pages}`);
    if (metrics.expandedChrome < expectedScreens || metrics.previewChrome !== 0) findings.push('preview chrome did not expand for every screen');
    if (metrics.phones.some((phone) => !phone.visible || phone.width < 250 || phone.height < 500)) findings.push('one or more phone frames have invalid rendered dimensions');
    if (metrics.phoneScreens.some((screen) => !screen.visible || screen.scrollWidth > screen.clientWidth + 2)) findings.push('one or more phone screens overflow horizontally');
    if (metrics.replacementCharacters > 0) findings.push('rendered text contains Unicode replacement characters');
    if (cdp.exceptionCount() > 0) findings.push(`preview raised ${cdp.exceptionCount()} runtime exception(s)`);
    cdp.socket.close();
    return {
      status: findings.length === 0 ? 'passed' : 'failed',
      findings,
      metrics,
      screenshot: screenshotPath || null,
    };
  } catch (error) {
    return { status: 'failed', findings: [error.message], metrics: null };
  } finally {
    try { child.kill('SIGTERM'); } catch {}
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { findChrome, inspectPage };
