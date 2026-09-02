const fs = require('fs');
const path = require('path');

const RUNS_DIRNAME = 'wld-design-brainstorms';
const RUN_LABEL_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RUN_LABEL_MAX_LENGTH = 80;

function validateRunLabel(input) {
  if (typeof input !== 'string' || input.length === 0) {
    throw new Error('--run-label is required');
  }
  if (input.length > RUN_LABEL_MAX_LENGTH || !RUN_LABEL_PATTERN.test(input)) {
    throw new Error('--run-label must be lowercase kebab-case using at most 80 characters');
  }
  return input;
}

function formatRunTimestamp(atMs) {
  const date = new Date(atMs);
  if (!Number.isFinite(date.getTime())) throw new Error('run timestamp is invalid');
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function createRunDirectory({ projectDir, runLabel, startedAtMs }) {
  const label = validateRunLabel(runLabel);
  const runsDir = path.join(path.resolve(projectDir), RUNS_DIRNAME);
  const baseName = `${formatRunTimestamp(startedAtMs)}-${label}`;
  fs.mkdirSync(runsDir, { recursive: true });

  for (let collision = 1; ; collision += 1) {
    const runName = collision === 1 ? baseName : `${baseName}-${collision}`;
    const runDir = path.join(runsDir, runName);
    try {
      fs.mkdirSync(runDir);
      return { runDir, runName, runLabel: label };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
}

function openRunDirectory({ projectDir, runDir }) {
  if (typeof runDir !== 'string' || !path.isAbsolute(runDir)) {
    throw new Error('--run-dir must be an absolute path to a run in the current project');
  }

  const resolvedRunDir = path.resolve(runDir);
  const runsDir = path.join(path.resolve(projectDir), RUNS_DIRNAME);
  if (path.dirname(resolvedRunDir) !== runsDir) {
    throw new Error('--run-dir must be a direct child of the current project run directory');
  }

  let stat;
  try { stat = fs.lstatSync(resolvedRunDir); } catch {
    throw new Error(`--run-dir does not exist: ${resolvedRunDir}`);
  }
  if (!stat.isDirectory()) throw new Error('--run-dir must point to a real run directory');

  const stateDir = path.join(resolvedRunDir, 'state');
  const infoPath = path.join(stateDir, 'server-info.json');
  let info;
  try { info = JSON.parse(fs.readFileSync(infoPath, 'utf8')); } catch {
    throw new Error(`--run-dir has no valid state/server-info.json: ${resolvedRunDir}`);
  }

  const runName = path.basename(resolvedRunDir);
  const expectedScreenDir = path.join(resolvedRunDir, 'screens');
  if (path.resolve(info.runDir || '') !== resolvedRunDir
    || info.runName !== runName
    || path.resolve(info.screenDir || '') !== expectedScreenDir
    || path.resolve(info.stateDir || '') !== stateDir) {
    throw new Error('--run-dir state does not match its run directory');
  }
  const runLabel = validateRunLabel(info.runLabel);
  if (!Number.isFinite(info.startedAtMs)) {
    throw new Error('--run-dir state has no valid startedAtMs');
  }
  if (!['workspace', 'bundled'].includes(info.profileSource)
    || typeof info.profileDir !== 'string'
    || !path.isAbsolute(info.profileDir)) {
    throw new Error('--run-dir state has no valid profile selection');
  }

  return {
    runDir: resolvedRunDir,
    runName,
    runLabel,
    startedAtMs: info.startedAtMs,
    info,
  };
}

module.exports = {
  RUNS_DIRNAME,
  createRunDirectory,
  formatRunTimestamp,
  openRunDirectory,
  validateRunLabel,
};
