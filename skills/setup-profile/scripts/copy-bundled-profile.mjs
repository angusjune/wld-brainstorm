#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const setupSkillDir = path.resolve(scriptDir, '..');
const bundledProfileDir = path.resolve(setupSkillDir, '..', 'brainstorm', 'profile');
const requiredProfileEntries = [
  ['PROFILE.md', 'file'],
  ['screens', 'directory'],
  ['design-system', 'directory'],
  ['design-system/tokens.css', 'file'],
  ['design-system/components.css', 'file'],
  ['quality/workflow-contracts.json', 'file'],
];

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

function inspectProfile(profileDir) {
  const missing = [];
  const wrongType = [];
  for (const [entry, type] of requiredProfileEntries) {
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
  return { complete: issues.length === 0, missing, wrongType, issues };
}

function validateProfile(profileDir, label) {
  const inspection = inspectProfile(profileDir);
  if (!inspection.complete) {
    throw new Error(`${label} is incomplete; ${inspection.issues.join('; ')}`);
  }
  return inspection;
}

function repairMissingEntries(targetProfileDir, inspection) {
  const blockedParents = inspection.wrongType.map((issue) => issue.split(' must be ')[0]);
  const entries = inspection.missing.filter((entry) => (
    !inspection.missing.some((other) => other !== entry && entry.startsWith(`${other}/`))
    && !blockedParents.some((blocked) => entry === blocked || entry.startsWith(`${blocked}/`))
  ));
  for (const entry of entries) {
    const source = path.join(bundledProfileDir, entry);
    const target = path.join(targetProfileDir, entry);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const options = { errorOnExist: true, force: false };
    if (fs.statSync(source).isDirectory()) options.recursive = true;
    fs.cpSync(source, target, options);
  }
  return entries;
}

const workspaceDir = path.resolve(readArg('workspace') || process.cwd());
const targetProfileDir = path.join(workspaceDir, 'wld-design-profile');
const json = process.argv.includes('--json');
const repair = process.argv.includes('--repair');

try {
  if (!fs.existsSync(workspaceDir) || !fs.statSync(workspaceDir).isDirectory()) {
    throw new Error(`Workspace directory does not exist: ${workspaceDir}`);
  }

  let status = 'existing';
  let repairedEntries = [];
  let inspection;
  if (fs.existsSync(targetProfileDir)) {
    if (!fs.statSync(targetProfileDir).isDirectory()) {
      throw new Error(`Workspace profile path is not a directory: ${targetProfileDir}`);
    }
    inspection = inspectProfile(targetProfileDir);
    if (!inspection.complete && repair) {
      validateProfile(bundledProfileDir, 'Bundled profile');
      repairedEntries = repairMissingEntries(targetProfileDir, inspection);
      inspection = inspectProfile(targetProfileDir);
      status = inspection.complete ? 'repaired' : 'incomplete';
    } else if (!inspection.complete) {
      status = 'incomplete';
    }
  } else {
    validateProfile(bundledProfileDir, 'Bundled profile');
    const stagingDir = fs.mkdtempSync(path.join(workspaceDir, '.wld-design-profile-copy-'));
    const stagedProfileDir = path.join(stagingDir, 'profile');
    try {
      fs.cpSync(bundledProfileDir, stagedProfileDir, {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
      validateProfile(stagedProfileDir, 'Copied workspace profile');
      fs.renameSync(stagedProfileDir, targetProfileDir);
    } finally {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
    status = 'created';
    inspection = inspectProfile(targetProfileDir);
  }

  const result = {
    status,
    complete: inspection.complete,
    issues: inspection.issues,
    missing: inspection.missing,
    wrongType: inspection.wrongType,
    repairedEntries,
    workspaceDir,
    sourceProfileDir: bundledProfileDir,
    targetProfileDir,
  };
  console.log(json ? JSON.stringify(result) : `${status}: ${targetProfileDir}`);
} catch (error) {
  const result = { status: 'error', message: error.message, targetProfileDir };
  console.error(json ? JSON.stringify(result) : `copy-profile: ${error.message}`);
  process.exitCode = 1;
}
