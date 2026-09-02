#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { contentTypeFor, isReadableFile, isWithinRoot } = require('../lib/static-files.cjs');

test('static-file guard accepts files and rejects directories', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-static-files-'));
  try {
    const file = path.join(root, 'asset.svg');
    fs.writeFileSync(file, '<svg></svg>');
    assert.equal(isReadableFile(file), true);
    assert.equal(isReadableFile(root), false);
    assert.equal(isReadableFile(path.join(root, 'missing.svg')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('content types cover browser image and font assets', () => {
  const expected = {
    'screen.html': 'text/html; charset=utf-8',
    'styles.css': 'text/css; charset=utf-8',
    'client.js': 'application/javascript; charset=utf-8',
    'data.json': 'application/json; charset=utf-8',
    'image.png': 'image/png',
    'image.jpg': 'image/jpeg',
    'image.jpeg': 'image/jpeg',
    'image.webp': 'image/webp',
    'image.gif': 'image/gif',
    'image.svg': 'image/svg+xml',
    'font.woff': 'font/woff',
    'font.woff2': 'font/woff2',
    'font.ttf': 'font/ttf',
    'font.otf': 'font/otf',
  };
  for (const [file, type] of Object.entries(expected)) {
    assert.equal(contentTypeFor(file), type, file);
  }
  assert.equal(contentTypeFor('unknown.bin'), 'application/octet-stream');
});

test('root containment does not confuse sibling path prefixes', () => {
  const root = path.join(os.tmpdir(), 'assets');
  assert.equal(isWithinRoot(root, path.join(root, 'icons', 'check.svg')), true);
  assert.equal(isWithinRoot(root, path.join(os.tmpdir(), 'assets-private', 'secret.txt')), false);
  assert.equal(isWithinRoot(root, path.join(root, '..', 'secret.txt')), false);
});
