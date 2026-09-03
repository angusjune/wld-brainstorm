const fs = require('fs');
const path = require('path');

const WORKSPACE_PROFILE_DIRNAME = 'wld-design-profile';
const REQUIRED_PROFILE_ENTRIES = [
  ['PROFILE.md', 'file'],
  ['screens', 'directory'],
  ['design-system', 'directory'],
  ['design-system/tokens.css', 'file'],
  ['design-system/components.css', 'file'],
  ['quality/workflow-contracts.json', 'file'],
];

function readProfileConfig(profileDir) {
  let text = '';
  try { text = fs.readFileSync(path.join(profileDir, 'PROFILE.md'), 'utf8'); } catch {}
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const config = {};
  for (const line of (block ? block[1] : '').split(/\r?\n/)) {
    const match = line.match(/^([\w-]+):\s*(.*)$/);
    if (match) config[match[1]] = match[2].trim();
  }
  return config;
}

function inspectProfile(profileDir) {
  if (!fs.existsSync(profileDir)) {
    return {
      exists: false,
      isDirectory: false,
      complete: false,
      missing: REQUIRED_PROFILE_ENTRIES.map(([entry]) => entry),
      wrongType: [],
      issues: ['profile directory does not exist'],
    };
  }
  if (!fs.statSync(profileDir).isDirectory()) {
    return {
      exists: true,
      isDirectory: false,
      complete: false,
      missing: [],
      wrongType: ['.'],
      issues: ['profile path is not a directory'],
    };
  }

  const missing = [];
  const wrongType = [];
  for (const [entry, type] of REQUIRED_PROFILE_ENTRIES) {
    const target = path.join(profileDir, entry);
    if (!fs.existsSync(target)) {
      missing.push(entry);
      continue;
    }
    const stat = fs.statSync(target);
    const matches = type === 'directory' ? stat.isDirectory() : stat.isFile();
    if (!matches) wrongType.push(`${entry} must be a ${type}`);
  }

  const issues = [
    ...missing.map((entry) => `missing ${entry}`),
    ...wrongType,
  ];
  return {
    exists: true,
    isDirectory: true,
    complete: issues.length === 0,
    missing,
    wrongType,
    issues,
  };
}

function assertProfile(profileDir, label) {
  const inspection = inspectProfile(profileDir);
  if (!inspection.complete) {
    throw new Error(`${label} is incomplete; ${inspection.issues.join('; ')}`);
  }
  return inspection;
}

function resolveProfile({ projectDir, skillDir, useBundled = false }) {
  const bundledProfileDir = path.resolve(skillDir, 'profile');
  const workspaceProfileDir = path.resolve(projectDir, WORKSPACE_PROFILE_DIRNAME);

  if (useBundled) {
    const bundledInspection = assertProfile(bundledProfileDir, 'Bundled profile');
    return {
      profileDir: bundledProfileDir,
      source: 'bundled',
      complete: true,
      issues: [],
      inspection: bundledInspection,
      bundledProfileDir,
      workspaceProfileDir,
    };
  }

  if (fs.existsSync(workspaceProfileDir)) {
    const inspection = inspectProfile(workspaceProfileDir);
    if (!inspection.isDirectory) {
      throw new Error(
        `Workspace profile path is not a directory: ${workspaceProfileDir}. `
        + 'Use --use-bundled-profile for this run or fix the workspace profile path.',
      );
    }
    return {
      profileDir: workspaceProfileDir,
      source: 'workspace',
      complete: inspection.complete,
      issues: inspection.issues,
      inspection,
      bundledProfileDir,
      workspaceProfileDir,
    };
  }

  const bundledInspection = assertProfile(bundledProfileDir, 'Bundled profile');
  return {
    profileDir: bundledProfileDir,
    source: 'bundled',
    complete: true,
    issues: [],
    inspection: bundledInspection,
    bundledProfileDir,
    workspaceProfileDir,
  };
}

module.exports = {
  REQUIRED_PROFILE_ENTRIES,
  WORKSPACE_PROFILE_DIRNAME,
  assertProfile,
  inspectProfile,
  readProfileConfig,
  resolveProfile,
};
