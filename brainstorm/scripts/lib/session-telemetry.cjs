// Shared telemetry primitives for the preview server, QA gate, reporter, and tests.
const fs = require('fs');
const path = require('path');

const EVENT_FILE = 'session-events.jsonl';
const SCHEMA_VERSION = 1;
const EVENTS = Object.freeze({
  SESSION_STARTED: 'session-started',
  SERVER_LISTENING: 'server-listening',
  SCREEN_WRITTEN: 'screen-written',
  SCREEN_SERVED: 'screen-served',
  QA_COMPLETED: 'qa-completed',
  SESSION_STOPPED: 'session-stopped',
});

function readSessionInfo(stateDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(stateDir, 'server-info.json'), 'utf8'));
  } catch {
    return {};
  }
}

function appendSessionEvent(stateDir, event, details = {}, options = {}) {
  const info = options.info || readSessionInfo(stateDir);
  const atMs = options.atMs ?? Date.now();
  const startedAtMs = options.startedAtMs ?? info.startedAtMs ?? atMs;
  const payload = {
    ...details,
    schemaVersion: SCHEMA_VERSION,
    event,
    at: new Date(atMs).toISOString(),
    elapsedMs: Math.max(0, atMs - startedAtMs),
    sessionId: options.sessionId || info.sessionId || null,
  };

  try {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.appendFileSync(path.join(stateDir, EVENT_FILE), `${JSON.stringify(payload)}\n`);
  } catch {
    // Telemetry must never interrupt generation, preview, or QA.
  }
  return payload;
}

function findSessionStateDir(file) {
  const absolute = path.resolve(file);
  const screenDir = path.dirname(absolute);
  if (path.basename(screenDir) !== 'screens') return null;
  const sessionDir = path.dirname(screenDir);
  if (path.basename(path.dirname(sessionDir)) !== '.brainstorm') return null;
  const stateDir = path.join(sessionDir, 'state');
  return fs.existsSync(path.join(stateDir, 'server-info.json')) ? stateDir : null;
}

module.exports = {
  EVENT_FILE,
  EVENTS,
  appendSessionEvent,
  findSessionStateDir,
  readSessionInfo,
};
