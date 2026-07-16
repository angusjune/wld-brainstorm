#!/usr/bin/env node

/**
 * Render a brainstorm HTML screen to a screen-only reference PNG (no phone
 * chrome), so it can be paired against a Mini Program screenshot in the
 * design-conformance loop (see conform-design.md).
 *
 * Usage:
 *   node render-html-reference.mjs <htmlFile> <outPng> [--width 375] [--height 812] [--assets <dir>] [--profile <dir>]
 *
 * Needs a headless Chrome/Chromium (set CHROME_PATH, or default macOS path).
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function parseArgs(argv) {
  const out = { _: [], width: 375, height: 812 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--width') out.width = Number(argv[++i]);
    else if (a === '--height') out.height = Number(argv[++i]);
    else if (a === '--assets') out.assets = argv[++i];
    else if (a === '--profile') out.profile = argv[++i];
    else out._.push(a);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const [htmlFile, outPng] = args._;
  if (!htmlFile || !outPng) {
    console.error('Usage: node render-html-reference.mjs <htmlFile> <outPng> [--width 375] [--height 812] [--assets <dir>] [--profile <dir>]');
    process.exitCode = 2;
    return;
  }
  const chrome = findChrome();
  if (!chrome) {
    console.error('No Chrome/Chromium found. Set CHROME_PATH to a Chrome binary.');
    process.exitCode = 2;
    return;
  }
  const assetsDir = path.resolve(args.assets || path.join(__dirname, '..', '..', 'assets'));
  const profileDir = path.resolve(args.profile || path.join(__dirname, '..', '..', 'profile'));
  let fragment = fs.readFileSync(path.resolve(htmlFile), 'utf8');
  // Resolve server-style mount paths to absolute file:// for standalone render.
  fragment = fragment.replaceAll('/assets/', `file://${assetsDir}/`);
  fragment = fragment.replaceAll('/profile/', `file://${profileDir}/`);

  const css = [
    path.join(assetsDir, 'reset.css'),
    path.join(profileDir, 'tokens.css'),
    path.join(profileDir, 'components.css'),
    path.join(assetsDir, 'phone-mockup.css'),
  ].map((f) => fs.readFileSync(f, 'utf8')).join('\n');

  const isFull = /<html[\s>]/i.test(fragment);
  const html = isFull ? fragment : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${args.width}px;background:var(--wld-bg,#F5F5F5);}
    ${css}
  </style></head><body>${fragment}</body></html>`;

  const tmp = path.join(os.tmpdir(), `wld-ref-${path.basename(outPng)}.html`);
  fs.writeFileSync(tmp, html);
  fs.mkdirSync(path.dirname(path.resolve(outPng)), { recursive: true });
  try {
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=2', `--window-size=${args.width},${args.height}`,
      '--virtual-time-budget=3000', `--screenshot=${path.resolve(outPng)}`,
      `file://${tmp}`,
    ], { stdio: 'ignore' });
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  if (!fs.existsSync(outPng)) {
    console.error('Render failed: no screenshot produced.');
    process.exitCode = 1;
    return;
  }
  console.log(`Rendered reference: ${outPng} (${args.width}x${args.height} @2x)`);
}

main();
