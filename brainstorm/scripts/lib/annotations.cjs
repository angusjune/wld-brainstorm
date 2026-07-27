// Shared annotation primitives for the preview server, workflow, and tests.
const fs = require('fs');
const path = require('path');

const ANNOTATION_FILE = 'annotations.jsonl';
const LIMITS = Object.freeze({
  note: 2000,
  outerHTML: 400,
  text: 200,
  selector: 1000,
  slide: 120,
});

function truncate(value, limit) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function normalizeFile(value) {
  if (typeof value !== 'string'
    || !/^[^/\\]+\.html$/.test(value)
    || value.includes('..')) {
    throw new Error('页面文件名无效');
  }
  return value;
}

function annotationNumber(id) {
  const match = typeof id === 'string' ? id.match(/^a([1-9]\d*)$/) : null;
  return match ? Number(match[1]) : null;
}

function normalizeAnnotation(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('批注内容无效');
  }
  if (typeof input.note !== 'string') throw new Error('批注必须是文字');
  const note = input.note.trim();
  if (!note) throw new Error('批注不能为空');

  const normalized = {
    file: normalizeFile(input.file),
    note: truncate(note, LIMITS.note),
  };
  for (const key of ['outerHTML', 'text', 'selector', 'slide']) {
    if (input[key] !== undefined && typeof input[key] !== 'string') {
      throw new Error(`${key} 必须是文字`);
    }
    normalized[key] = truncate(input[key] || '', LIMITS[key]);
  }
  return normalized;
}

function normalizeAcknowledgement(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('确认内容无效');
  }
  const file = normalizeFile(input.file);
  if (annotationNumber(input.through) === null) {
    throw new Error('批注 ID 无效');
  }
  return { file, through: input.through };
}

function appendEntry(stateDir, entry) {
  // Unlike passive telemetry, a write failure must propagate: dropping a user
  // annotation or its consumed marker would silently lose feedback state.
  fs.mkdirSync(stateDir, { recursive: true });
  fs.appendFileSync(path.join(stateDir, ANNOTATION_FILE), `${JSON.stringify(entry)}\n`);
  return entry;
}

function appendAnnotation(stateDir, normalized, { id, sessionId, atMs }) {
  return appendEntry(stateDir, {
    type: 'annotation',
    id,
    at: new Date(atMs).toISOString(),
    sessionId,
    file: normalized.file,
    note: normalized.note,
    outerHTML: normalized.outerHTML,
    text: normalized.text,
    selector: normalized.selector,
    slide: normalized.slide,
  });
}

function appendConsumed(stateDir, { file, through }, { sessionId, atMs }) {
  return appendEntry(stateDir, {
    type: 'consumed',
    at: new Date(atMs).toISOString(),
    sessionId,
    file,
    through,
  });
}

function readEntries(stateDir) {
  let content = '';
  try { content = fs.readFileSync(path.join(stateDir, ANNOTATION_FILE), 'utf8'); } catch { return []; }
  const entries = [];
  for (const line of content.split('\n')) {
    if (!line) continue;
    try { entries.push(JSON.parse(line)); } catch {}
  }
  return entries;
}

function pendingAnnotations(stateDir, file) {
  const entries = readEntries(stateDir);
  const consumedThrough = new Map();
  entries.forEach((entry) => {
    if (entry?.type === 'consumed' && typeof entry.file === 'string') {
      const number = annotationNumber(entry.through);
      if (number !== null) {
        consumedThrough.set(entry.file, Math.max(
          consumedThrough.get(entry.file) || 0,
          number,
        ));
      }
    }
  });
  return entries.filter((entry) => (
    entry?.type === 'annotation'
      && (!file || entry.file === file)
      && (annotationNumber(entry.id) ?? Infinity) > (consumedThrough.get(entry.file) || 0)
  ));
}

function acknowledgeAnnotations(stateDir, input, { sessionId, atMs }) {
  const normalized = normalizeAcknowledgement(input);
  const entries = readEntries(stateDir);
  const target = entries.find((entry) => (
    entry?.type === 'annotation'
      && entry.file === normalized.file
      && entry.id === normalized.through
  ));
  if (!target) {
    throw new Error(`找不到 ${normalized.file} 的批注 ${normalized.through}`);
  }

  const requestedNumber = annotationNumber(normalized.through);
  let currentThrough = null;
  let currentNumber = 0;
  for (const entry of entries) {
    if (entry?.type !== 'consumed' || entry.file !== normalized.file) continue;
    const number = annotationNumber(entry.through);
    if (number !== null && number > currentNumber) {
      currentNumber = number;
      currentThrough = entry.through;
    }
  }
  if (requestedNumber <= currentNumber) {
    return {
      type: 'consumed',
      file: normalized.file,
      through: currentThrough,
      appended: false,
    };
  }

  return {
    ...appendConsumed(stateDir, normalized, { sessionId, atMs }),
    appended: true,
  };
}

module.exports = {
  ANNOTATION_FILE,
  LIMITS,
  acknowledgeAnnotations,
  appendAnnotation,
  appendConsumed,
  normalizeAnnotation,
  normalizeAcknowledgement,
  pendingAnnotations,
  readEntries,
};
