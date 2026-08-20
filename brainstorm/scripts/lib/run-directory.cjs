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

module.exports = {
  RUNS_DIRNAME,
  createRunDirectory,
  formatRunTimestamp,
  validateRunLabel,
};
